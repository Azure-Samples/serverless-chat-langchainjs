import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export async function chat(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

  const string = request.query.get('name') || (await request.text()) || 'Chat Function';

  return { body: `Hello, ${string}!` };
}
