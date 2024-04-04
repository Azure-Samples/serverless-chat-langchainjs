import { Readable } from 'node:stream';
import { Document } from '@langchain/core/documents';
import { HttpRequest, InvocationContext, HttpResponseInit, app } from '@azure/functions';
import { AzureOpenAIEmbeddings, AzureChatOpenAI } from '@langchain/azure-openai';
import { Embeddings } from '@langchain/core/embeddings';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { VectorStore } from '@langchain/core/vectorstores';
import { OllamaEmbeddings } from '@langchain/community/embeddings/ollama';
import { ChatOllama } from '@langchain/community/chat_models/ollama';
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { ChatPromptTemplate, PromptTemplate } from '@langchain/core/prompts';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { AzureCosmosDBVectorStore } from '@langchain/community/vectorstores/azure_cosmosdb';
import { createRetrievalChain } from 'langchain/chains/retrieval';
import 'dotenv/config';
import { badRequest, data, serviceUnavailable } from '../http-response';
import { ollamaChatModel, ollamaEmbeddingsModel, faissStoreFolder } from '../constants';
import { ChatRequest, ChatResponseChunk } from '../models';

const systemPrompt = `Assistant helps the Consto Real Estate company customers with questions and support requests. Be brief in your answers. Answer only in plain text format.
Answer ONLY with information from the sources below. If there isn't enough information in the sources, say you don't know. Do not generate answers that don't use the sources. If asking a clarifying question to the user would help, ask the question.
If the user question is not in English, answer in the language used in the question.

Each source has the format "filename: information". ALWAYS reference the source filename for every part used in the answer. Use the format "[filename]" to reference a source, for example: [info1.txt]. List each source separately, for example: [info1.txt][info2.pdf].

Generate 3 very brief follow-up questions that the user would likely ask next.
Enclose the follow-up questions in double angle brackets. Example:
<<Am I allowed to invite friends for a party?>>
<<How can I ask for a refund?>>
<<What If I break something?>>

Do no repeat questions that have already been asked.
Make sure the last question ends with ">>".

SOURCES:
{context}`;

export async function chat(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const azureOpenAiEndpoint = process.env.AZURE_OPENAI_API_ENDPOINT;

  try {
    const requestBody = (await request.json()) as ChatRequest;
    const { messages, stream } = requestBody;

    if (!messages || messages.length === 0 || !messages.at(-1)?.content) {
      return badRequest('Invalid or missing messages in the request body');
    }

    if (!stream) {
      return badRequest('Only stream mode is supported');
    }

    let embeddings: Embeddings;
    let model: BaseChatModel;
    let store: VectorStore;

    if (azureOpenAiEndpoint) {
      embeddings = new AzureOpenAIEmbeddings();
      model = new AzureChatOpenAI();
      store = new AzureCosmosDBVectorStore(embeddings, {});
    } else {
      // If no environment variables are set, it means we are running locally
      context.log('No Azure OpenAI endpoint set, using Ollama models and local DB');
      embeddings = new OllamaEmbeddings({ model: ollamaEmbeddingsModel });
      model = new ChatOllama({ model: ollamaChatModel });
      store = await FaissStore.load(faissStoreFolder, embeddings);
    }

    const combineDocsChain = await createStuffDocumentsChain({
      llm: model,
      prompt: ChatPromptTemplate.fromMessages([
        ['system', systemPrompt],
        ['human', '{input}'],
      ]),
      documentPrompt: PromptTemplate.fromTemplate('{filename}: {page_content}\n'),
    });
    const chain = await createRetrievalChain({
      retriever: store.asRetriever(),
      combineDocsChain,
    });

    const lastUserMessage = messages.at(-1)!.content;
    const responseStream = await chain.stream({
      input: lastUserMessage,
    });

    return data(createStream(responseStream), {
      'Content-Type': 'application/x-ndjson',
      'Transfer-Encoding': 'chunked',
    });
  } catch (_error: unknown) {
    const error = _error as Error;
    context.error(`Error when processing chat-post request: ${error.message}`);

    return serviceUnavailable('Service temporarily unavailable. Please try again later.');
  }
}

function createStream(chunks: AsyncIterable<{ context: Document[]; answer: string }>) {
  const buffer = new Readable({
    read() {},
  });

  const stream = async () => {
    for await (const chunk of chunks) {
      if (!chunk.answer) continue;

      const responseChunk: ChatResponseChunk = {
        choices: [
          {
            index: 0,
            delta: {
              content: chunk.answer,
              role: 'assistant',
            },
          },
        ],
      };

      // Format response chunks in Newline delimited JSON
      // see https://github.com/ndjson/ndjson-spec
      buffer.push(JSON.stringify(responseChunk) + '\n');
    }

    buffer.push(null);
  };

  stream();

  return buffer;
}

app.setup({ enableHttpStream: true });
app.http('chat-post', {
  route: 'chat',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: chat,
});
