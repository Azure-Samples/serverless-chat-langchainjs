import { HttpRequest, InvocationContext, HttpResponseInit } from '@azure/functions';
import { AzureOpenAIEmbeddings, AzureChatOpenAI } from '@langchain/azure-openai';
import 'dotenv/config';
import { badRequest, serviceUnavailable, ok } from '../utils';

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

    const promptResponse = await embeddings.embedQuery(prompt);

    return promptResponse
      ? ok({ promptResponse })
      : serviceUnavailable(new Error('Service temporarily unavailable. Please try again later.'));
  } catch (error: unknown) {
    const error_ = error as Error;
    context.error(`Error when processing chat request: ${error_.message}`);

    return serviceUnavailable(new Error('Service temporarily unavailable. Please try again later.'));
  }
}
