# Session 03: Implement `uploadDocuments` API

In this session we will learn how to implement the `uploadDocuments` API, which will be responsible for receiving a `pdf` file, extracting the text using `LangChain.js` and saving it in `Azure CosmosDB for MongoDB`. Let's get started!

## Start to Implement `uploadDocuments` API

Before we start implementing the `uploadDocuments` API, we need to install some dependencies. To do this, run the following command inside the `api` folder:

```bash
npm install -D @azure/storage-blob
```

This package will be responsible for helping us manipulate files using **[Azure's Blob Storage service](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blobs-overview)**.

We can now proceed with the implementation of the `uploadDocuments` API.

Since we already have `Azure CosmosDB for MongoDB` configured, let's start implementing the `CosmosDB LC Vector Store` in the `uploadDocuments` API. To do this, open the

- `api/src/functions/post-documents.ts`

```typescript
import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { badRequest, ok, serviceUnavailable } from '../utils';
import { BlobServiceClient } from '@azure/storage-blob';

export async function uploadDocuments(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;

  try {
    const parsedForm = await request.formData();

    if (!parsedForm.has('file')) {
      return badRequest(new Error('"file" field not found in form data.'));
    }

    const file: Blob = requestFormData.get('file') as Blob;
    const fileName: string = parsedForm.get('filename') as string;

    return ok({ message: 'PDF file uploaded successfully.' });
  } catch (error: unknown) {
    const error_ = error as Error;
    context.error(`Error when processing upload request: ${error_.message}`);

    return serviceUnavailable(new Error('Service temporarily unavailable. Please try again later.'));
  }
}

app.http('post-documents', {
  route: 'documents',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: uploadDocuments,
});
```

Let's understand what we did here:

First, we created two variables `connectionString` and `containerName` that will store the connection string and the name of the Azure Storage container, respectively.

The `parsedForm` variable is an object of type `FormData` which contains the fields sent in the request.

The `has` method checks that the `file` field has been sent in the request. Since it is a `POST` request. If the field is not found, we return a `400 Bad Request` message.

As we are uploading a `pdf` file, we will need to use the **[Blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob)** class so that we can manipulate the file.

The `get` method retrieves the value of the `file` field from the `FormData` object. If the field does not exist, the method returns `null`.

And finally the `fileName` variable which will store the name of the file sent in the `filename` field.

Finally, we return a `200 OK` message if the file is uploaded successfully.

## Load the PDF File

After checking the `file` field, now we need to load the file, read its the content and finally split it. To do this, we will need to use the [pdf-parse](https://www.npmjs.com/package/pdf-parse) package. Let's install it.

```bash
npm install pdf-parse
```

Now, let's implement the code to load the `pdf` file and extract its content.

```typescript
import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { badRequest, ok, serviceUnavailable } from '../utils';
import { BlobServiceClient } from '@azure/storage-blob';

export async function uploadDocuments(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;

  try {
    const parsedForm = await request.formData();

    if (!parsedForm.has('file')) {
      return badRequest(new Error('"file" field not found in form data.'));
    }

    const file: Blob = requestFormData.get('file') as Blob;
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

    return ok({ message: 'PDF file uploaded successfully.' });
  } catch (error: unknown) {
    const error_ = error as Error;
    context.error(`Error when processing upload request: ${error_.message}`);

    return serviceUnavailable(new Error('Service temporarily unavailable. Please try again later.'));
  }
}

app.http('post-documents', {
  route: 'documents',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: uploadDocuments,
});
```

Let's understand what we did here:

We imported the `PDFLoader` and `RecursiveCharacterTextSplitter` classes from the `langchain` package.

The **[PDFLoader](https://api.js.langchain.com/classes/langchain_document_loaders_fs_pdf.PDFLoader.html)** class is responsible for loading documents from PDF files. It can load a PDF file from a file path or a `Blob` object. It can also load a PDF file from a URL. In this case, we are using a `Blob` object.

The **[RecursiveCharacterTextSplitter](https://js.langchain.com/docs/modules/data_connection/document_transformers/recursive_text_splitter)** class is responsible for splitting the text of a document into smaller parts. This is useful for large documents. How does this class do this? It does so using a set of characters. And, the default characters provided are: `["\n\n", "\n", " ", ""]`

It will take a large text and split it by the first character `\n\n`. If the first split is not enough, it will try to split by the character `\n`. And so on. Until the text or the split is smaller than the specified block size.

After that, we created an instance of the `PDFLoader` class passing the `file` document and a configuration object with the `splitPages` property as `false`. Why? Because by default, a document will be created for each page of the PDF file. That's why we are disabling this option.

Then, we loaded the PDF file using the `load` method of the `PDFLoader` class instance.

We create an instance of the `RecursiveCharacterTextSplitter` class by passing a configuration object with the `chunkSize` and `chunkOverlap` properties.

The `chunkSize` controls the maximum size (in terms of number of characters) of the final documents. And, the `chunkOverlap` will specify how much overlap there should be between the chunks. This is useful to ensure that the text is not split inappropriately. Usually the default is `1000` and `200`, respectively.

Finally, we divided the PDF document into smaller parts using the **[splitDocuments](https://api.js.langchain.com/classes/langchain_text_splitter.RecursiveCharacterTextSplitter.html#splitDocuments)** method of the `RecursiveCharacterTextSplitter` class instance. The method returns an array of documents.

## Save the PDF File in Azure Cosmos DB

Now that we have the PDF file divided into smaller parts, we can save it in `Azure CosmosDB for MongoDB`. Let's implement the code to do this.

```typescript
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
  route: 'documents',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: uploadDocuments,
});
```

Let's understand what we did here:

We imported the `AzureCosmosDBVectorStore` and `AzureCosmosDBSimilarityType` classes from the `langchain` package.

The `AzureCosmosDBVectorStore` class is responsible for storing and retrieving vectors from `Azure CosmosDB for MongoDB`. It can be used to store and retrieve vectors from a collection in a database. It can also be used to create an index in the collection.

Then we created an instance of the `AzureCosmosDBVectorStore` class by passing the `documents` array using the method `fromDocuments`. This method is responsible for creating an instance of the `AzureCosmosDBVectorStore` from a list of documents. It first converts the documents to vectors and then adds them to the collection.

We created an instance of the `AzureOpenAIEmbeddings`, at this point this class will grab the `Azure OpenAI` credentials from the environment variables. Then we passed a configuration object with the `databaseName` and `collectionName` properties.

Then we created three variables:

- `numberLists`: which controls the number of lists to be used in the index.
- `dimensions`: which controls the number of dimensions of the vectors. The maximum number of dimensions supported is `2000`
- `similarity`: similarity metric to be used when creating the index. In this case, we can use `COS` (cosine distance), `L2` (Euclidean distance) and `IP` (inner product). In this case, we are using the `COS` algorithm.

Thereafter use the `createIndex` method, which is responsible for creating an index in the collection with the name of the index specified during the construction of the instance. This method is precisely waiting for the `numberLists`, `dimensions` and `similarity` parameters that we have just defined.

We closed the `store` variable using the `close` method of the `AzureCosmosDBVectorStore` class instance.

After closing the connection to the database, we check that the variables `connectionString` and `containerName` are defined. If they are, we create an instance of `BlobServiceClient` passing `connectionString`. Next, we create an instance of `ContainerClient` passing the `containerName`. And finally, we create an instance of `BlockBlobClient` passing the `fileName`.

We then proceeded to upload the file to Azure Blob Storage utilizing the `upload` method provided by an instance of the `BlockBlobClient` class. This method is designed to either create a new block blob or update the content of an existing one. It's important to note that updating an existing block blob results in the overwrite of any pre-existing metadata associated with the blob.

Finally, we return a `200 OK` message if the file is uploaded successfully.

If you want to learn more about Azure CosmosDB for MongoDB vCore in vector use cases, you can access the **[official documentation](https://learn.microsoft.com/en-us/azure/cosmos-db/mongodb/vcore/vector-search)**.

Phew! We have implemented the `uploadDocuments` API. Now let's test it.

## Test the `uploadDocuments` API

Before we test the `upload` API, let's configure the `api.http` file for this request. To do this, open the file:

- `api/http`

```http
### Upload PDF Document
POST {{api_host}}/api/documents
Accept: */*
Content-Type: multipart/form-data; boundary=Boundary

--Boundary
Content-Disposition: form-data; name="file"; filename="test.pdf"
Content-Type: application/pdf

< ../../data/support.pdf
--Boundary--
```

In this file, we added the `POST` request to the `uploadDocuments` API. Note that we are sending the `test.pdf` file that is in the `data` folder. This file is a support document that we will use to test the `uploadDocuments` API.

Perfect! Now we can test the `uploadDocuments` API. To do this, let's use Visual Studio Code's own terminal. Execute the command inside the `api` folder:

- `packages/api`

```bash
npm run start
```

The following message will appear, as shown in the image below:

![upload function](./images/upload-function.png)

Now, open the `api.http` file and click on the `Send Request` button next to the `Upload PDF Document` request.

If everything goes well, you will see the following message:

```json
{
  "message": "PDF file uploaded successfully."
}
```

Watch the gif of the whole process being executed:

![api-upload-test](./images/test-upload-function.gif)

Great! We have finished implementing the `uploadDocuments` API. Now, let's finish implementing chain in the `chat` API.

▶ **[Next Step: Generate completion using `chain` in the `chat` API](./04-session.md)**
