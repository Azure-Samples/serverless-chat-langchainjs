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

const summariseSystemPrompt = `
System Prompt:

You are an advanced language model designed to summarize text. Your task is to take a given detailed passage and condense it into a concise summary while retaining the key information and main points. Use clear and precise language to ensure the summary is informative and easy to understand. Here are some examples to guide you:

Example 1
Detailed Text: "The weather today has been quite remarkable. The sky has been a clear, vibrant blue with not a cloud in sight. A gentle breeze has been blowing, making the temperature feel just perfect for outdoor activities. It's the kind of day that makes you want to spend time outside, whether it's for a walk in the park, a picnic, or just lounging in the backyard."

Summary: "Today's weather is perfect for outdoor activities, with clear blue skies and a gentle breeze."

Example 2
Detailed Text: "Today at work was one of those rare days where everything seemed to go right. I managed to complete all my tasks ahead of schedule, which gave me some extra time to help out my colleagues. We had a very productive brainstorming session that generated some great ideas for our upcoming project. To top it all off, my manager gave me positive feedback on the work I've been doing, which was really encouraging."

Summary: "I had a productive day at work, completing tasks early, helping colleagues, and receiving positive feedback from my manager."

Example 3
Detailed Text: "Reading books has always been one of my favorite hobbies. I love immersing myself in different worlds and experiencing the lives of various characters. Whether it's a thrilling mystery that keeps me on the edge of my seat, a heartwarming romance that makes me smile, or an insightful non-fiction book that teaches me something new, there's always something to enjoy and learn from."

Summary: "I enjoy reading books of various genres, finding joy in the different worlds and characters they offer."

Example 4
Detailed Text: "Cooking is something I find incredibly fulfilling. I love experimenting with new recipes and ingredients, blending different flavors to create delicious meals. It's not just about the food itself, but also the process of cooking and the satisfaction of seeing others enjoy what I've made. Whether it's a simple dish or a complex meal, cooking always brings me joy."

Summary: "I find cooking fulfilling, enjoying the process of experimenting with recipes and seeing others enjoy my meals."

Example 5
Detailed Text: "This morning, I decided to go for a run through the neighborhood. The air was crisp and fresh, and the sound of birds chirping added to the peaceful atmosphere. It was a refreshing start to the day, and I felt energized and ready to tackle whatever came my way."

Summary: "I went for a refreshing run this morning, enjoying the crisp air and peaceful atmosphere."

Use these examples as a template to summarize any detailed text provided to you.
`;

export async function postSummarise(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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

    const messagesToSubmit = [new SystemMessage(summariseSystemPrompt), new HumanMessage(messages.at(-1)!.content)];

    const response = await model.invoke(messagesToSubmit);

    context.log(JSON.stringify(response));
    return ok({ response: response.content.toString() });
  } catch (_error: unknown) {
    const error = _error as Error;
    context.error(`Error when processing summarise-post request: ${error.message}`);

    return serviceUnavailable('Service temporarily unavailable. Please try again later.');
  }
}

app.setup({ enableHttpStream: true });
app.http('summarise-post', {
  route: 'summarise',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: postSummarise,
});
