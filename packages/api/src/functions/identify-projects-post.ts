import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { AIChatCompletionRequest } from '@microsoft/ai-chat-protocol';
import { Embeddings } from '@langchain/core/embeddings';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { VectorStore } from '@langchain/core/vectorstores';
import { v4 as uuidv4 } from 'uuid';
import { AzureChatOpenAI, AzureOpenAIEmbeddings } from '@langchain/openai';
import { AzureCosmosDBNoSQLVectorStore, AzureCosmsosDBNoSQLChatMessageHistory } from '@langchain/azure-cosmosdb';
import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama';
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { ChatPromptTemplate, PromptTemplate } from '@langchain/core/prompts';
import { faissStoreFolder, ollamaChatModel, ollamaEmbeddingsModel } from '../constants.js';
import { badRequest, ok, serviceUnavailable } from '../http-response.js';
import { getAzureOpenAiTokenProvider, getCredentials, getUserId } from '../security.js';

const ragSystemPrompt = `You are an assistant writing a response to a bid document for Kainos, a software consultancy. Be brief in your answers. Answer only plain text, DO NOT use Markdown.

I want you to suggest project(s) that serve as examples of the below bid question. In your answer justify why each project is a good example and reference the documents that you use in your answer.

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

    // Create the chain that combines the prompt with the documents
    const ragChain = await createStuffDocumentsChain({
      llm: model,
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

    context.log(JSON.stringify(response));
    return ok({ response });
  } catch (_error: unknown) {
    const error = _error as Error;
    context.error(`Error when processing identify-projects-post request: ${error.message}`);

    return serviceUnavailable('Service temporarily unavailable. Please try again later.');
  }
}

app.setup({ enableHttpStream: true });
app.http('identify-projects-post', {
  route: 'identify-projects',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: postIdentifyProjects,
});
