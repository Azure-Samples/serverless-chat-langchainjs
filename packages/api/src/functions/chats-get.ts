import process from 'node:process';
import { HttpRequest, HttpResponseInit, InvocationContext, app } from '@azure/functions';
import { AzureCosmsosDBNoSQLChatMessageHistory } from '@langchain/azure-cosmosdb';
import { FileSystemChatMessageHistory } from '@langchain/community/stores/message/file_system';
import 'dotenv/config';
import { badRequest, ok, notFound } from '../http-response.js';
import { getCredentials, getUserId } from '../security.js';

async function getChats(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const azureCosmosDbEndpoint = process.env.AZURE_COSMOSDB_NOSQL_ENDPOINT;
  const { sessionId } = request.params;
  const userId = getUserId(request);

  if (!userId) {
    return badRequest('Invalid or missing userId in the request');
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

    if (sessionId) {
      const messages = await chatHistory.getMessages();
      const chatMessages = messages.map((message) => ({
        role: message.getType() === 'human' ? 'user' : 'assistant',
        content: message.content,
      }));
      return ok(chatMessages);
    }

    const sessions = await chatHistory.getAllSessions();
    const chatSessions = sessions.map((session) => ({
      id: session.id,
      title: session.context?.title,
    }));
    return ok(chatSessions);
  } catch (_error: unknown) {
    const error = _error as Error;
    context.error(`Error when processing chats-get request: ${error.message}`);

    return notFound('Session not found');
  }
}

app.http('chats-get', {
  route: 'chats/{sessionId?}',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: getChats,
});
