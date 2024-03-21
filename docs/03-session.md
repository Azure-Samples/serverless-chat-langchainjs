# Session 03: Implement Upload API

Nessa sessão aprenderemos a implementar a API `upload`, que será responsável por receber um arquivo `pdf`, extrairemos o texto usando o `LangChain.js` e salvaremos no `Azure CosmosDB for MongoDB`.

In this session we will learn how to implement the `upload` API, which will be responsible for receiving a `pdf` file, extracting the text using `LangChain.js` and saving it in `Azure CosmosDB for MongoDB`. Let's get started!

## Start to Implement `upload` API

Since we already have `Azure CosmosDB for MongoDB` configured, let's start implementing the `CosmosDB LC Vector Store` in the `upload` API. To do this, open the

- `api/src/functions/upload.ts`

```typescript
import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { badRequest, ok, serviceUnavailable } from "../utils";

export async function upload(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    try {
        const requestFormData = await request.formData();

        if (!requestFormData.has('pdfDocumentFile')) {
            return badRequest(new Error('No PDF File field wasnt found in the form data.'));
        }

        const file: Blob = requestFormData.get('pdfDocumentFile') as Blob;

        return ok({ message: 'PDF file uploaded successfully.' });
    } catch (error: unknown) {
        const error_ = error as Error;
        context.error(`Error when processing upload request: ${error_.message}`);
        
        return serviceUnavailable(new Error('Service temporarily unavailable. Please try again later.'))
    }   
};
```

The `requestFormData` variable is an object of type `FormData` which contains the fields sent in the request.

The `has` method checks that the `pdfDocumentFile` field has been sent in the request. Since it is a `POST` request. If the field is not found, we return a `400 Bad Request` message.

As we are uploading a `pdf` file, we will need to use the **[Blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob)** class so that we can manipulate the file.

The `get` method retrieves the value of the `pdfDocumentFile` field from the `FormData` object. If the field does not exist, the method returns `null`.

## Load the PDF File

After checking the `pdfDocumentFile` field, now we need to load the file, read its the content and finally split it. To do this, we will need to use the [pdf-parse](https://www.npmjs.com/package/pdf-parse) package. Let's install it.

```bash
npm install pdf-parse
```

Now, let's implement the code to load the `pdf` file and extract its content.

```typescript
import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { badRequest, ok, serviceUnavailable } from "../utils";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

export async function testUpload(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    try {
        const requestFormData = await request.formData();

        if (!requestFormData.has('pdfDocumentFile')) {
            return badRequest(new Error('No PDF File field wasnt found in the form data.'));
        }

        const file: Blob = requestFormData.get('pdfDocumentFile') as Blob;

        const loadPDFFile = new PDFLoader(file, {
            splitPages: false,
        });

        const rawPDFFile = await loadPDFFile.load();

        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 100,
        });

        const pdfFileDocuments = await splitter.splitDocuments(rawPDFFile);

        return ok({ message: 'PDF file uploaded successfully.' });
    } catch (error: unknown) {
        const error_ = error as Error;
        context.error(`Error when processing upload request: ${error_.message}`);
        
        return serviceUnavailable(new Error('Service temporarily unavailable. Please try again later.'))
    }   
};
```

Vamos entender o que fizemos aqui:

- Importamos as classes `PDFLoader` e `RecursiveCharacterTextSplitter` do pacote `langchain`. 

A classe **[PDFLoader](https://api.js.langchain.com/classes/langchain_document_loaders_fs_pdf.PDFLoader.html)** é responsável por carregar documentos de arquivos PDF. 

Já a classe `RecursiveCharacterTextSplitter` 



- Criamos uma instância da classe `PDFLoader` passando o arquivo `pdf` e um objeto de configuração com a propriedade `splitPages` como `false`. Isso é necessário para que o `pdf` seja carregado como um único documento.
- Carregamos o arquivo `pdf` usando o método `load` da instância da classe `PDFLoader`.
- Criamos uma instância da classe `RecursiveCharacterTextSplitter` passando um objeto de configuração com as propriedades `chunkSize` e `chunkOverlap`. Isso é necessário para que o texto seja dividido em partes menores. Isso é útil para documentos grandes. O `chunkSize` é o tamanho de cada parte e o `chunkOverlap` é a quantidade de caracteres que cada parte deve ter em comum com a parte anterior.
- Dividimos o documento `pdf` em partes menores usando o método `splitDocuments` da instância da classe `RecursiveCharacterTextSplitter`. O método retorna um array de documentos.
