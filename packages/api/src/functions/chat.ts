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

    const { messages } = requestBody;
    const { stream } = requestBody;

    if (!messages || messages.length === 0 || !messages[0].content) {
      return badRequest(new Error('Invalid or missing messages in the request body'));
    }

    const firstUserMessageContent = messages[0].content;

    const embeddings = new AzureOpenAIEmbeddings();
    const model = new AzureChatOpenAI();

    const prompt = `Question: ${firstUserMessageContent}`;
    context.log(`Sending prompt to the model: ${prompt}`);

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
          'Content-Type': 'application/json-lines',
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
      buffer.push(chunk.answer);
    }

    buffer.push(null);
  };

  stream();

  return buffer;
}

app.setup({ enableHttpStream: true });
app.post('chat', {
  route: 'chat',
  authLevel: 'anonymous',
  handler: chat,
});
