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

    const embeddings = new AzureOpenAIEmbeddings({
      azureOpenAIEndpoint: process.env.AZURE_OPENAI_API_ENDPOINT || '',
      azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY || '',
      azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_EMBEDDING_DEPLOYMENT_NAME || '',
      modelName: process.env.AZURE_OPENAI_MODEL_NAME || '',
      maxRetries: 2,
    });

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
      status: 404,
      jsonBody: {
        error: 'No response from the model',
      },
    };
  } catch (error: unknown) {
    const error_ = error as Error;
    context.error(`Error when processing chat request: ${error_.message}`);

    return {
      status: 500,
      jsonBody: {
        error: 'An error occurred while processing the chat request. Please try again later.',
      },
    };
  }
}
