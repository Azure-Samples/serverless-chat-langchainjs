import process from 'node:process';
import { HttpRequest, HttpResponseInit, InvocationContext, app } from '@azure/functions';
import { AzureCosmsosDBNoSQLChatMessageHistory } from '@langchain/azure-cosmosdb';
import { FileSystemChatMessageHistory } from '@langchain/community/stores/message/file_system';
import 'dotenv/config';
import { badRequest, ok, notFound } from '../http-response.js';
import { getCredentials, getUserId } from '../security.js';

async function deleteChats(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const azureCosmosDbEndpoint = process.env.AZURE_COSMOSDB_NOSQL_ENDPOINT;
  const { sessionId } = request.params;
  const userId = getUserId(request);

  if (!userId) {
    return badRequest('Invalid or missing userId in the request');
  }

  if (!sessionId) {
    return badRequest('Invalid or missing sessionId in the request');
  }

  try {
    let chatHistory;

    if (azureCosmosDbEndpoint) {
      const credentials = getCredentials();
      chatHistory = new AzureCosmsosDBNoSQLChatMessageHistory({
        sessionId,
        userId,
        credentials,
      });
    } else {
      // If no environment variables are set, it means we are running locally
      context.log('No Azure CosmosDB endpoint set, using local file');

      chatHistory = new FileSystemChatMessageHistory({
        sessionId,
        userId,
      });
    }

    await chatHistory.clear();
    return ok();
  } catch (_error: unknown) {
    const error = _error as Error;
    context.error(`Error when processing chats-delete request: ${error.message}`);

    return notFound('Session not found');
  }
}

app.http('chats-delete', {
  route: 'chats/{sessionId}',
  methods: ['DELETE'],
  authLevel: 'anonymous',
  handler: deleteChats,
});
