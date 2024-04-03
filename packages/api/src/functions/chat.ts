import { Readable } from 'node:stream';
import { Document } from '@langchain/core/documents';
import { HttpRequest, InvocationContext, HttpResponseInit, app } from '@azure/functions';
import { AzureOpenAIEmbeddings, AzureChatOpenAI } from '@langchain/azure-openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { AzureCosmosDBVectorStore } from '@langchain/community/vectorstores/azure_cosmosdb';
import { createRetrievalChain } from 'langchain/chains/retrieval';
import 'dotenv/config';
import { badRequest, serviceUnavailable } from '../utils';

export async function chat(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const requestBody: any = await request.json();

    const { messages, stream } = requestBody;

    if (!messages || messages.length === 0 || !messages[0].content) {
      return badRequest(new Error('Invalid or missing messages in the request body'));
    }

    const firstUserMessageContent = messages[0].content;

    const embeddings = new AzureOpenAIEmbeddings();
    const model = new AzureChatOpenAI();

    const combineDocsChain = await createStuffDocumentsChain({
      llm: model,
      prompt: ChatPromptTemplate.fromMessages([
        ['system', "Answer the user's questions based on the below context:\n\n{context}"],
        ['human', '{input}'],
      ]),
    });

    const store = new AzureCosmosDBVectorStore(embeddings, {});
    const chain = await createRetrievalChain({
      retriever: store.asRetriever(),
      combineDocsChain,
    });

    if (stream) {
      const responseStream = await chain.stream({
        input: firstUserMessageContent,
      });

      return {
        headers: {
          'Content-Type': 'application/x-ndjson',
          'Transfer-Encoding': 'chunked',
        },
        body: createStream(responseStream),
      };
    }

    return badRequest(new Error('Stream is not supported'));
  } catch (error: unknown) {
    const error_ = error as Error;
    context.error(`Error when processing chat request: ${error_.message}`);

    return serviceUnavailable(new Error('Service temporarily unavailable. Please try again later.'));
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
app.http('chat', {
  route: 'chat',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: chat,
});
