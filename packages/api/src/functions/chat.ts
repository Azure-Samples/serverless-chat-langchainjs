import { Readable } from 'node:stream';
import { IterableReadableStream } from '@langchain/core/dist/utils/stream';
import { Document } from '@langchain/core/documents';
import { HttpRequest, InvocationContext, HttpResponseInit } from '@azure/functions';
import { AzureOpenAIEmbeddings, AzureChatOpenAI } from '@langchain/azure-openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { AzureCosmosDBVectorStore } from '@langchain/community/vectorstores/azure_cosmosdb';
import { createRetrievalChain } from 'langchain/chains/retrieval';
import 'dotenv/config';
import { badRequest, serviceUnavailable, okStreamResponse } from '../utils';

export async function chat(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

  try {
    const requestBody: any = await request.json();

    if (!requestBody?.question) {
      return badRequest(new Error('No question provided'));
    }

    const { question } = requestBody;

    const embeddings = new AzureOpenAIEmbeddings();

    const prompt = `Question: ${question}`;
    context.log(`Sending prompt to the model: ${prompt}`);

    const model = new AzureChatOpenAI();

    const questionAnsweringPrompt = ChatPromptTemplate.fromMessages([
      ['system', "Answer the user's questions based on the below context:\n\n{context}"],
      ['human', '{input}'],
    ]);

    const combineDocsChain = await createStuffDocumentsChain({
      llm: model,
      prompt: questionAnsweringPrompt,
    });

    const store = new AzureCosmosDBVectorStore(embeddings, {});

    const chain = await createRetrievalChain({
      retriever: store.asRetriever(),
      combineDocsChain,
    });

    const response = await chain.stream({
      input: question,
    });

    return {
      ...okStreamResponse(),
      body: createStream(response),
    };
  } catch (error: unknown) {
    const error_ = error as Error;
    context.error(`Error when processing chat request: ${error_.message}`);

    return serviceUnavailable(new Error('Service temporarily unavailable. Please try again later.'));
  }
}

function createStream(
  chunks: IterableReadableStream<
    {
      context: Document[];
      answer: string;
    } & Record<string, unknown>
  >,
) {
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
