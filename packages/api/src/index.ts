import { app } from '@azure/functions';
import { chat } from './functions/chat';
import { postUpload, getUpload } from './functions/upload';

// Including this as a test
app.post('chat', {
  route: 'chat',
  authLevel: 'anonymous',
  handler: chat,
});

// Including this as a test
app.get('get-upload', {
  route: 'upload',
  authLevel: 'anonymous',
  handler: getUpload,
});

app.post('post-upload', {
  route: 'upload',
  authLevel: 'anonymous',
  handler: postUpload,
});
