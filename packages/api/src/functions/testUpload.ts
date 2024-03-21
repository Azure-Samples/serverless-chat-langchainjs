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
