import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { AzureOpenAIEmbeddings } from '@langchain/azure-openai';
import 'dotenv/config';

export async function chat(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

  try {
    const requestBody: any = await request.json();

    if (!requestBody?.question) {
      return {
        status: 400,
        jsonBody: {
          error: 'No question provided',
        },
      };
    }

    const { question } = requestBody;

    const embeddings = new AzureOpenAIEmbeddings();

    const prompt = `Question: ${question}`;
    context.log(`Sending prompt to the model: ${prompt}`);

    const promptResponse = await embeddings.embedQuery(prompt);

    if (promptResponse) {
      return {
        status: 200,
        jsonBody: {
          promptResponse,
        },
      };
    }

    return {
      status: 503,
      jsonBody: {
        error: 'Service temporarily unavailable. Please try again later.',
      },
    };
  } catch (error: unknown) {
    const error_ = error as Error;
    context.error(`Error when processing chat request: ${error_.message}`);

    return {
      status: 503,
      jsonBody: {
        error: 'Service temporarily unavailable. Please try again later.',
      },
    };
  }
}
