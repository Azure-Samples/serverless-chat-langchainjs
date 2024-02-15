import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export async function getUpload(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

  const string = request.query.get('name') || (await request.text()) || 'Upload Function';

  return { body: `Hello, ${string}!` };
}

export async function postUpload(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

  const string = request.query.get('name') || (await request.text()) || 'Upload Function';

  return { body: `Hello, ${string}!` };
}
