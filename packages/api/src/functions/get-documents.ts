import process from 'node:process';
import fs from 'node:fs/promises';
import { join } from 'node:path';
import { finished } from 'node:stream/promises';
import { HttpRequest, HttpResponseInit, InvocationContext, app } from '@azure/functions';
import { BlobServiceClient } from '@azure/storage-blob';
import 'dotenv/config';
import { notFound } from '../utils';

async function getDocument(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;
  const { fileName } = request.params;

  try {
    let fileData: Uint8Array;

    if (connectionString && containerName) {
      context.log(`Reading blob from: "${containerName}/${fileName}"`);
      const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
      const containerClient = blobServiceClient.getContainerClient(containerName);
      const response = await containerClient.getBlobClient(fileName).download();
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
    return notFound(new Error('Document not found'));
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

app.http('documents', {
  route: 'documents/{fileName}',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: getDocument,
});
