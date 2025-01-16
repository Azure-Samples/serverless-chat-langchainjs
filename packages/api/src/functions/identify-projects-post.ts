import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { AIChatCompletionRequest } from '@microsoft/ai-chat-protocol';
import { Embeddings } from '@langchain/core/embeddings';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { VectorStore } from '@langchain/core/vectorstores';
import { v4 as uuidv4 } from 'uuid';
import { AzureChatOpenAI, AzureOpenAIEmbeddings } from '@langchain/openai';
import { AzureCosmosDBNoSQLVectorStore } from '@langchain/azure-cosmosdb';
import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama';
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { BasePromptTemplate, ChatPromptTemplate, PromptTemplate } from '@langchain/core/prompts';
import { LanguageModelLike } from '@langchain/core/dist/language_models/base';
import { BaseOutputParser } from '@langchain/core/output_parsers';
import { RunnableConfig, RunnablePassthrough, RunnablePick, RunnableSequence } from '@langchain/core/runnables';
import { Document } from '@langchain/core/documents';
import { faissStoreFolder, ollamaChatModel, ollamaEmbeddingsModel } from '../constants.js';
import { badRequest, ok, serviceUnavailable } from '../http-response.js';
import { getAzureOpenAiTokenProvider, getCredentials, getUserId } from '../security.js';

const ragSystemPrompt = `You are an assistant writing a response to a bid document for Kainos, a software consultancy. Be brief in your answers. Answer only plain text, DO NOT use Markdown.

I want you to suggest exactly one project that serve as an example of the below bid question. In your answer justify why the project is a good example and reference the documents that you use in your answer.

Answer ONLY with information from the sources below. Do not generate answers that don't use the sources.
{context}
`;

export async function postIdentifyProjects(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const azureOpenAiEndpoint = process.env.AZURE_OPENAI_API_ENDPOINT;

  try {
    const requestBody = (await request.json()) as AIChatCompletionRequest;
    const { messages, context: chatContext } = requestBody;
    const userId = getUserId(request, requestBody);

    if (!messages || messages.length === 0 || !messages.at(-1)?.content) {
      return badRequest('Invalid or missing messages in the request body');
    }

    let embeddings: Embeddings;
    let model: BaseChatModel;
    let store: VectorStore;
    const sessionId = ((chatContext as any)?.sessionId as string) || uuidv4();
    context.log(`userId: ${userId}, sessionId: ${sessionId}`);

    if (azureOpenAiEndpoint) {
      const credentials = getCredentials();
      const azureADTokenProvider = getAzureOpenAiTokenProvider();

      // Initialize models and vector database
      embeddings = new AzureOpenAIEmbeddings({ azureADTokenProvider });
      model = new AzureChatOpenAI({
        // Controls randomness. 0 = deterministic, 1 = maximum randomness
        temperature: 0.7,
        azureADTokenProvider,
      });
      store = new AzureCosmosDBNoSQLVectorStore(embeddings, { credentials });
    } else {
      context.log('No Azure OpenAI endpoint set, using Ollama models and local DB');
      embeddings = new OllamaEmbeddings({ model: ollamaEmbeddingsModel });
      model = new ChatOllama({
        temperature: 0.7,
        model: ollamaChatModel,
      });
      store = await FaissStore.load(faissStoreFolder, embeddings);
    }

    const structuredModel = model.withStructuredOutput({
      name: 'projectInfo',
      description: 'Information about a corporate project',
      parameters: {
        title: 'Project',
        type: 'object',
        properties: {
          name: { type: 'string', description: 'The name of the project' },
          description: { type: 'string', description: 'A brief description of the project' },
          justification: { type: 'string', description: 'Justification of why the project is a good example' },
        },
        required: ['name', 'description'],
      },
    });

    // Create the chain that combines the prompt with the documents
    const ragChain = await createStuffDocumentsChain({
      llm: structuredModel as LanguageModelLike,
      prompt: ChatPromptTemplate.fromMessages([
        ['system', ragSystemPrompt],
        ['human', '{input}'],
      ]),
      documentPrompt: PromptTemplate.fromTemplate('[{source}]: {page_content}\n'),
    });

    // Retriever to search for the documents in the database
    const retriever = store.asRetriever(3);
    const question = messages.at(-1)!.content;
    // TODO stream response
    const response = await ragChain.invoke(
      {
        input: question,
        context: await retriever.invoke(question),
      },
      { configurable: { sessionId } },
    );

    context.log(`response: ${JSON.stringify(response)}`);
    return ok({ response });
  } catch (_error: unknown) {
    const error = _error as Error;
    context.error(`Error when processing identify-projects-post request: ${error.message}`);

    return serviceUnavailable('Service temporarily unavailable. Please try again later.');
  }
}

// Copied the library code here because I had to get rid of the outputParser as that was interfering with the structured output
export async function createStuffDocumentsChain<RunOutput = string>({
  llm,
  prompt,
  documentPrompt = PromptTemplate.fromTemplate('{page_content}'),
  documentSeparator = '\n\n',
}: {
  llm: LanguageModelLike;
  prompt: BasePromptTemplate;
  outputParser?: BaseOutputParser<RunOutput>;
  documentPrompt?: BasePromptTemplate;
  documentSeparator?: string;
}) {
  if (!prompt.inputVariables.includes('context')) {
    throw new Error(`Prompt must include a "context" variable`);
  }

  return RunnableSequence.from(
    [
      RunnablePassthrough.assign({
        context: new RunnablePick('context').pipe(async (documents, config) =>
          formatDocuments({
            documents,
            documentPrompt,
            documentSeparator,
            config,
          }),
        ),
      }),
      prompt,
      llm,
    ],
    'stuff_documents_chain',
  );
}

const formatDocuments = async ({
  documentPrompt,
  documentSeparator,
  documents,
  config,
}: {
  documentPrompt: BasePromptTemplate;
  documentSeparator: string;
  documents: Document[];
  config?: RunnableConfig;
}) => {
  if (documents === null || documents.length === 0) {
    return '';
  }

  const formattedDocuments = await Promise.all(
    documents.map(async (document) =>
      documentPrompt
        .withConfig({ runName: 'document_formatter' })
        .invoke({ ...document.metadata, page_content: document.pageContent }, config),
    ),
  );
  return formattedDocuments.join(documentSeparator);
};

app.setup({ enableHttpStream: true });
app.http('identify-projects-post', {
  route: 'identify-projects',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: postIdentifyProjects,
});
