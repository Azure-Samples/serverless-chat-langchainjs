import { app } from '@azure/functions';
import { postChat, getChat } from './functions/chat';
import { postUpload, getUpload } from './functions/upload';

// Including this as a test
app.get('get-chat', {
  route: 'chat',
  authLevel: 'anonymous',
  handler: getChat,
});

app.post('post-chat', {
  route: 'chat',
  authLevel: 'anonymous',
  handler: postChat,
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
