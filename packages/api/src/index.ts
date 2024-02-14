import { app } from '@azure/functions';
import { GetHelloTest } from './functions/get-hello-test';

app.get('get-hello', {
  route: 'hello',
  authLevel: 'anonymous',
  handler: GetHelloTest,
});
