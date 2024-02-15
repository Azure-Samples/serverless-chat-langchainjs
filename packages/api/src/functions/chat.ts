import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export async function getChat(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

  const string = request.query.get('name') || (await request.text()) || 'Chat Function';

  return { body: `Hello, ${string}!` };
}

export async function postChat(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

  const string = request.query.get('name') || (await request.text()) || 'Chat Function';

  return { body: `Hello, ${string}!` };
}
