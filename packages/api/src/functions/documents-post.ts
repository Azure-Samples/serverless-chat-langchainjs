import { HttpRequest, HttpResponseInit, InvocationContext, app } from '@azure/functions';
import { AzureOpenAIEmbeddings } from '@langchain/azure-openai';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { AzureCosmosDBVectorStore } from '@langchain/community/vectorstores/azure_cosmosdb';
import { OllamaEmbeddings } from '@langchain/community/embeddings/ollama';
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import 'dotenv/config';
import { BlobServiceClient } from '@azure/storage-blob';
import { badRequest, serviceUnavailable, ok } from '../http-response';
import { ollamaEmbeddingsModel, faissStoreFolder } from '../constants';

export async function postDocuments(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;
  const azureOpenAiEndpoint = process.env.AZURE_OPENAI_API_ENDPOINT;

  try {
    // Get the uploaded file from the request
    const parsedForm = await request.formData();

    if (!parsedForm.has('file')) {
      return badRequest('"file" field not found in form data.');
    }

    const file = parsedForm.get('file') as File;
    const filename = file.name;

    // Extract text from the PDF
    const loader = new PDFLoader(file, {
      splitPages: false,
    });
    const rawDocument = await loader.load();
    rawDocument[0].metadata.filename = filename;

    // Split the text into smaller chunks
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1500,
      chunkOverlap: 100,
    });
    const documents = await splitter.splitDocuments(rawDocument);

    // Generate embeddings and save in database
    if (azureOpenAiEndpoint) {
      const store = await AzureCosmosDBVectorStore.fromDocuments(documents, new AzureOpenAIEmbeddings(), {});
      await store.createIndex();
      await store.close();
    } else {
      // If no environment variables are set, it means we are running locally
      context.log('No Azure OpenAI endpoint set, using Ollama models and local DB');
      const embeddings = new OllamaEmbeddings({ model: ollamaEmbeddingsModel });
      const store = await FaissStore.fromDocuments(documents, embeddings, {});
      await store.save(faissStoreFolder);
    }

    if (connectionString && containerName) {
      // Upload the PDF file to Azure Blob Storage
      context.log(`Uploading file to blob storage: "${containerName}/${filename}"`);
      const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
      const containerClient = blobServiceClient.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(filename);
      const buffer = await file.arrayBuffer();
      await blockBlobClient.upload(buffer, file.size, {
        blobHTTPHeaders: { blobContentType: 'application/pdf' },
      });
    } else {
      context.log('No Azure Blob Storage connection string set, skipping upload.');
    }

    return ok({ message: 'PDF file uploaded successfully.' });
  } catch (_error: unknown) {
    const error = _error as Error;
    context.error(`Error when processing document-post request: ${error.message}`);

    return serviceUnavailable('Service temporarily unavailable. Please try again later.');
  }
}

app.http('documents-post', {
  route: 'documents',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: postDocuments,
});
