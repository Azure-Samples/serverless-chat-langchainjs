import process from 'node:process';
import fs from 'node:fs/promises';
import { join } from 'node:path';
import { finished } from 'node:stream/promises';
import { HttpRequest, HttpResponseInit, InvocationContext, app } from '@azure/functions';
import { BlobServiceClient } from '@azure/storage-blob';
import 'dotenv/config';
import { data, notFound } from '../http-response.js';
import { getCredentials } from '../security.js';

async function getDocument(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const storageUrl = process.env.AZURE_STORAGE_URL;
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;
  const { fileName } = request.params;

  try {
    let fileData: Uint8Array;

    if (storageUrl && containerName) {
      // Retrieve the file from Azure Blob Storage
      context.log(`Reading blob from: "${containerName}/${fileName}"`);

      const credentials = getCredentials();
      const blobServiceClient = new BlobServiceClient(storageUrl, credentials);
      const containerClient = blobServiceClient.getContainerClient(containerName);
      const response = await containerClient.getBlobClient(fileName).download();

      fileData = await streamToBuffer(response.readableStreamBody!);
    } else {
      // If no environment variables are set, it means we are running locally
      context.log(`Reading file from local file system: "data/${fileName}"`);
      const filePath = join(__dirname, '../../../../../data', fileName);

      fileData = await fs.readFile(filePath);
    }

    return data(fileData, { 'content-type': 'application/pdf' });
  } catch (_error: unknown) {
    const error = _error as Error;
    context.error(`Error when processing document-get request: ${error.message}`);

    return notFound('Document not found');
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

app.http('documents-get', {
  route: 'documents/{fileName}',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: getDocument,
});
