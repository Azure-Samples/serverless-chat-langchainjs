import { app } from '@azure/functions';
import { chat } from './functions/chat';
import { upload } from './functions/upload';
import { testUpload } from './functions/testUpload';

// Including this as a test
app.post('chat', {
  route: 'chat',
  authLevel: 'anonymous',
  handler: chat,
});

app.post('post-upload', {
  route: 'upload',
  authLevel: 'anonymous',
  handler: upload,
});

/***remover depois */
app.post('testUpload', {
  route: 'testUpload',
  authLevel: 'anonymous',
  handler: testUpload,
});
