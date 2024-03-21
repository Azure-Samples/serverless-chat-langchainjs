import { app } from '@azure/functions';
import { chat } from './functions/chat';
import { upload } from './functions/upload';

app.post('chat', {
  route: 'chat',
  authLevel: 'anonymous',
  handler: chat,
});

app.post('upload', {
  route: 'upload',
  authLevel: 'anonymous',
  handler: upload,
});
