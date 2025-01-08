import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { AIChatCompletionRequest } from '@microsoft/ai-chat-protocol';
import { Embeddings } from '@langchain/core/embeddings';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AzureChatOpenAI, AzureOpenAIEmbeddings } from '@langchain/openai';
import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ollamaChatModel, ollamaEmbeddingsModel } from '../constants.js';
import { badRequest, ok, serviceUnavailable } from '../http-response.js';
import { getAzureOpenAiTokenProvider, getCredentials, getUserId } from '../security.js';

const elaborateSystemPrompt = `
You are an advanced language model designed to elaborate on simple text. Your task is to take a given simple sentence and expand it into a more detailed and descriptive version. Use varied language and provide additional context to make the text more engaging and informative. Here are some examples to guide you:

Example 1
Simple Text: "The weather is nice today."

Elaborated Text: "The weather is absolutely delightful today, with clear blue skies, a gentle breeze, and the perfect temperature for a stroll in the park or a relaxing afternoon outdoors."

Example 2
Simple Text: "I had a good day at work."

Elaborated Text: "My day at work was quite productive and fulfilling. I managed to complete all my tasks ahead of schedule, had a great brainstorming session with my team, and even received positive feedback from my manager on the project I've been working on."

Example 3
Simple Text: "I enjoy reading books."

Elaborated Text: "Reading books is one of my favorite pastimes. I love getting lost in different worlds, exploring new ideas, and experiencing the lives of various characters. Whether it's a thrilling mystery, a heartwarming romance, or an insightful non-fiction, there's always something new to discover."

Example 4
Simple Text: "I like to cook."

Elaborated Text: "Cooking is a passion of mine. I find joy in experimenting with new recipes, blending different flavors, and creating delicious meals from scratch. It's not just about the food; it's also about the process and the satisfaction of seeing others enjoy what I've made."

Example 5
Simple Text: "I went for a run this morning."

Elaborated Text: "This morning, I went for an invigorating run through the neighborhood. The crisp air and the sound of birds chirping made it a refreshing start to the day. I felt energized and ready to tackle whatever comes my way."

Use these examples as a template to elaborate on any simple text provided to you.
`;

export async function postElaborate(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const azureOpenAiEndpoint = process.env.AZURE_OPENAI_API_ENDPOINT;

  try {
    const requestBody = (await request.json()) as AIChatCompletionRequest;
    const { messages, context: chatContext } = requestBody;
    const userId = getUserId(request, requestBody);

    if (!messages || messages.length === 0 || !messages.at(-1)?.content) {
      return badRequest('Invalid or missing messages in the request body');
    }

    let embeddings: Embeddings;
    let model: BaseChatModel;

    context.log(`userId: ${userId}`);

    if (azureOpenAiEndpoint) {
      const credentials = getCredentials();
      const azureADTokenProvider = getAzureOpenAiTokenProvider();

      // Initialise models
      embeddings = new AzureOpenAIEmbeddings({ azureADTokenProvider });
      model = new AzureChatOpenAI({
        // Controls randomness. 0 = deterministic, 1 = maximum randomness
        temperature: 0.7,
        azureADTokenProvider,
      });
    } else {
      // If no environment variables are set, it means we are running locally
      context.log('No Azure OpenAI endpoint set, using Ollama models and local DB');
      embeddings = new OllamaEmbeddings({ model: ollamaEmbeddingsModel });
      model = new ChatOllama({
        temperature: 0.7,
        model: ollamaChatModel,
      });
    }

    const messagesToSubmit = [new SystemMessage(elaborateSystemPrompt), new HumanMessage(messages.at(-1)!.content)];

    const response = await model.invoke(messagesToSubmit);

    context.log(JSON.stringify(response));
    return ok({ response: response.content.toString() });
  } catch (_error: unknown) {
    const error = _error as Error;
    context.error(`Error when processing elaborate-post request: ${error.message}`);

    return serviceUnavailable('Service temporarily unavailable. Please try again later.');
  }
}

app.setup({ enableHttpStream: true });
app.http('elaborate-post', {
  route: 'elaborate',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: postElaborate,
});
