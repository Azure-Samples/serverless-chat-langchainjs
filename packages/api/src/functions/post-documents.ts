import { HttpRequest, HttpResponseInit, InvocationContext, app } from '@azure/functions';
import { AzureOpenAIEmbeddings } from '@langchain/azure-openai';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import {
  AzureCosmosDBVectorStore,
  AzureCosmosDBSimilarityType,
} from '@langchain/community/vectorstores/azure_cosmosdb';
import 'dotenv/config';
import { BlobServiceClient } from '@azure/storage-blob';
import { badRequest, serviceUnavailable, ok } from '../utils';

export async function uploadDocuments(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;

  try {
    const parsedForm = await request.formData();

    if (!parsedForm.has('file')) {
      return badRequest(new Error('"file" field not found in form data.'));
    }

    const file: Blob = parsedForm.get('file') as Blob;
    const fileName: string = parsedForm.get('filename') as string;

    const loader = new PDFLoader(file, {
      splitPages: false,
    });

    const rawDocument = await loader.load();

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 100,
    });

    const documents = await splitter.splitDocuments(rawDocument);

    const store = await AzureCosmosDBVectorStore.fromDocuments(documents, new AzureOpenAIEmbeddings(), {});

    const numberLists = 100;
    const dimensions = 1536;
    const similarity = AzureCosmosDBSimilarityType.COS;
    await store.createIndex(numberLists, dimensions, similarity);

    await store.close();

    if (connectionString && containerName) {
      // Upload the file to Azure Blob Storage
      const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
      const containerClient = blobServiceClient.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(fileName);
      await blockBlobClient.upload(file, file.size);
    }

    return ok({ message: 'PDF file uploaded successfully.' });
  } catch (error: unknown) {
    const error_ = error as Error;
    context.error(`Error when processing chat request: ${error_.message}`);

    return serviceUnavailable(new Error('Service temporarily unavailable. Please try again later.'));
  }
}

app.http('post-documents', {
  route: 'upload',
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  handler: uploadDocuments,
});
