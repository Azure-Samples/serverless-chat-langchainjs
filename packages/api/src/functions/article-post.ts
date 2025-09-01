import { HttpRequest, InvocationContext, HttpResponseInit, app } from '@azure/functions';
import { AzureOpenAIEmbeddings, AzureChatOpenAI } from '@langchain/openai';
import { Embeddings } from '@langchain/core/embeddings';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama';
import { ChatPromptTemplate, PromptTemplate } from '@langchain/core/prompts';
import 'dotenv/config';
import { badRequest, data, serviceUnavailable } from '../http-response.js';
import { ollamaChatModel, ollamaEmbeddingsModel } from '../constants.js';
import { getAzureOpenAiTokenProvider, getCredentials } from '../security.js';
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { Document } from "langchain/document";
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';


const articleSystemPrompt = `You are a journalist. Write a journalistic article about the topic provided by the user.
Answer ONLY with information from the sources below.
SOURCES:
{context}`;

export async function postArticle(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const azureOpenAiEndpoint = process.env.AZURE_OPENAI_API_ENDPOINT;
  const tavilyApiKey = process.env.TAVILY_API_KEY;

  if (!tavilyApiKey) {
    return serviceUnavailable('Tavily API key is not set.');
  }

  try {
    const requestBody = (await request.json()) as { topic: string };
    const { topic } = requestBody;

    if (!topic) {
      return badRequest('Invalid or missing topic in the request body');
    }

    let model: BaseChatModel;

    if (azureOpenAiEndpoint) {
      const credentials = getCredentials();
      const azureADTokenProvider = getAzureOpenAiTokenProvider();

      model = new AzureChatOpenAI({
        temperature: 0.7,
        azureADTokenProvider,
      });
    } else {
      context.log('No Azure OpenAI endpoint set, using Ollama models');
      model = new ChatOllama({
        temperature: 0.7,
        model: ollamaChatModel,
      });
    }

    // 1. Research (Web Search)
    const searchTool = new TavilySearchResults({ apiKey: tavilyApiKey });
    const searchResults = await searchTool.invoke(topic);

    const contextDocuments = searchResults.map(result => new Document({ pageContent: result.content, metadata: { source: result.url }}));

    // 2. Draft
    const draftChain = await createStuffDocumentsChain({
      llm: model,
      prompt: ChatPromptTemplate.fromMessages([
        ['system', articleSystemPrompt],
        ['human', '{input}'],
      ]),
      documentPrompt: PromptTemplate.fromTemplate('[{source}]: {page_content}\n'),
    });

    const draftResponse = await draftChain.invoke({
      input: topic,
      context: contextDocuments,
    });
    let article = draftResponse as string;

    // 3. Review (Remove forbidden words)
    const forbiddenWords = ['example', 'forbidden', 'words']; // TODO: Use a better list
    forbiddenWords.forEach(word => {
      article = article.replace(new RegExp(`\\b${word}\\b`, 'gi'), '');
    });

    // 4. Rewrite
    const rewritePrompt = ChatPromptTemplate.fromTemplate(
      "Rewrite the following article to improve its flow and coherence. Do not add new information. \n\n" +
      "Original article:\n" +
      "{article}"
    );
    const rewriteChain = rewritePrompt.pipe(model);
    const rewriteResponse = await rewriteChain.invoke({ article });
    const finalArticle = rewriteResponse.content as string;

    return data({ article: finalArticle });
  } catch (_error: unknown) {
    const error = _error as Error;
    context.error(`Error when processing article-post request: ${error.message}`);
    return serviceUnavailable('Service temporarily unavailable. Please try again later.');
  }
}

app.http('article-post', {
  route: 'article',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: postArticle,
});
