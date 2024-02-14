import { type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions';

export async function GetHelloTest(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

  const phrase = request.query.get('name') || (await request.text()) || 'API Chat!';

  return { body: `Hello, ${phrase}!` };
}
