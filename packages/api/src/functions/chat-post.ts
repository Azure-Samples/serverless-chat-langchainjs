import { Readable } from 'node:stream';
import { Document } from '@langchain/core/documents';
import { HttpRequest, InvocationContext, HttpResponseInit, app } from '@azure/functions';
import { AzureOpenAIEmbeddings, AzureChatOpenAI } from '@langchain/azure-openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { AzureCosmosDBVectorStore } from '@langchain/community/vectorstores/azure_cosmosdb';
import { createRetrievalChain } from 'langchain/chains/retrieval';
import 'dotenv/config';
import { badRequest, data, serviceUnavailable } from '../http-response';

export async function chat(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const requestBody = (await request.json()) as Record<string, any>;
    const { messages, stream } = requestBody;

    if (!messages || messages.length === 0 || !messages[0].content) {
      return badRequest('Invalid or missing messages in the request body');
    }

    if (!stream) {
      return badRequest('Stream is not supported');
    }

    const embeddings = new AzureOpenAIEmbeddings();
    const model = new AzureChatOpenAI();
    const store = new AzureCosmosDBVectorStore(embeddings, {});

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

    const firstUserMessageContent = messages[0].content;
    const responseStream = await chain.stream({
      input: firstUserMessageContent,
    });

    return data(createStream(responseStream), {
      'Content-Type': 'application/x-ndjson',
      'Transfer-Encoding': 'chunked',
    });
  } catch (error: unknown) {
    const error_ = error as Error;
    context.error(`Error when processing chat request: ${error_.message}`);

    return serviceUnavailable('Service temporarily unavailable. Please try again later.');
  }
}

function createStream(chunks: AsyncIterable<{ context: Document[]; answer: string }>) {
  const buffer = new Readable({
    read() {},
  });

  const stream = async () => {
    for await (const chunk of chunks) {
      const responseChunk = {
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
