import { app } from '@azure/functions';
import { chat } from './functions/chat';

app.setup({ enableHttpStream: true });
app.post('chat', {
  route: 'chat',
  authLevel: 'anonymous',
  handler: chat,
});
