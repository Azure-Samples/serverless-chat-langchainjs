import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { AzureOpenAIEmbeddings } from '@langchain/azure-openai';
import { badRequest, serviceUnavailable, ok } from '../utils';
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import {
  AzureCosmosDBVectorStore,
  AzureCosmosDBSimilarityType,
} from "@langchain/community/vectorstores/azure_cosmosdb";

import 'dotenv/config';

export async function upload(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const parsedForm = await request.formData();

    if (!parsedForm.has('file')) {
      return badRequest(new Error('"file" field not found in form data.'));
    }

    const file: Blob = parsedForm.get('file') as Blob;

    const loader  = new PDFLoader(file, {
      splitPages: false,
    });

    const rawPDFFile = await loader .load();

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 100,
    });

    const pdfFileDocuments = await splitter.splitDocuments(rawPDFFile);

    const store = await AzureCosmosDBVectorStore.fromDocuments(
      pdfFileDocuments,
      new AzureOpenAIEmbeddings(),
      {
        databaseName: "langchain-database",
        collectionName: "pdfs"
      }
    );

    const numLists = 100;
    const dimensions = 1536;
    const similarity = AzureCosmosDBSimilarityType.COS;
    await store.createIndex(numLists, dimensions, similarity);

    await store.close();

    return ok({ message: 'PDF file uploaded successfully.' });
  } catch (error: unknown) {
    const error_ = error as Error;
    context.error(`Error when processing chat request: ${error_.message}`);

    return serviceUnavailable(new Error('Service temporarily unavailable. Please try again later.'));
  }
};
