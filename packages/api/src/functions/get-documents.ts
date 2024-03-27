import process from 'node:process';
import fs from 'node:fs/promises';
import { join } from 'node:path';
import { finished } from 'node:stream/promises';
import { HttpRequest, HttpResponseInit, InvocationContext, app } from '@azure/functions';
import { BlobServiceClient } from '@azure/storage-blob';
import 'dotenv/config';

async function getDocuments(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const { fileName } = request.params;

  try {
    let fileData: Uint8Array;

    if (process.env.AZURE_STORAGE_CONNECTION_STRING && process.env.AZURE_STORAGE_CONTAINER_NAME) {
      const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
      const containerClient = blobServiceClient.getContainerClient(process.env.AZURE_STORAGE_CONTAINER_NAME);
      const blobClient = containerClient.getBlobClient(fileName);
      const response = await blobClient.download();
      fileData = await streamToBuffer(response.readableStreamBody!);
    } else {
      // If no environment variables are set, it means we are running locally
      context.log(`Reading file from local file system: "data/${fileName}"`);
      const filePath = join(__dirname, '../../../../../data', fileName);
      fileData = await fs.readFile(filePath);
    }

    return {
      headers: { 'content-type': 'application/pdf' },
      body: fileData,
    };
  } catch {
    return {
      status: 404,
      jsonBody: { error: 'Document not found' },
    };
  }
}

async function streamToBuffer(readableStream: NodeJS.ReadableStream): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  readableStream.on('data', (data) => {
    chunks.push(Buffer.from(data));
  });
  await finished(readableStream);
  return Buffer.concat(chunks);
}

app.get('documents', {
  route: 'documents/{fileName}',
  authLevel: 'anonymous',
  handler: getDocuments,
});
