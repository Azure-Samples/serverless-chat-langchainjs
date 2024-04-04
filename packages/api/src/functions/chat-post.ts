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
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { AzureCosmosDBVectorStore } from '@langchain/community/vectorstores/azure_cosmosdb';
import { createRetrievalChain } from 'langchain/chains/retrieval';
import 'dotenv/config';
import { badRequest, data, serviceUnavailable } from '../http-response';
import { ollamaChatModel, ollamaEmbeddingsModel, faissStoreFolder } from '../constants';
import { ChatRequest, ChatResponseChunk } from '../models';

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
        ['system', "Answer the user's questions based on the below context:\n\n{context}"],
        ['human', '{input}'],
      ]),
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
