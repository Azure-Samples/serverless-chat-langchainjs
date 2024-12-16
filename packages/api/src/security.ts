import { HttpRequest } from '@azure/functions';
import { DefaultAzureCredential, getBearerTokenProvider } from '@azure/identity';

const azureOpenAiScope = 'https://cognitiveservices.azure.com/.default';

let credentials: DefaultAzureCredential | undefined;

export function getCredentials(): DefaultAzureCredential {
  // Use the current user identity to authenticate.
  // No secrets needed, it uses `az login` or `azd auth login` locally,
  // and managed identity when deployed on Azure.
  credentials ||= new DefaultAzureCredential();
  return credentials;
}

export function getAzureOpenAiTokenProvider() {
  return getBearerTokenProvider(getCredentials(), azureOpenAiScope);
}

export function getUserId(request: HttpRequest, body?: any): string | undefined {
  let userId: string | undefined;

  // Get the user ID from Azure easy auth if it's available
  try {
    const token = Buffer.from(request.headers.get('x-ms-client-principal') ?? '', 'base64').toString('ascii');
    const infos = token && JSON.parse(token);
    userId = infos?.userId;
  } catch {}

  // Get the user ID from the request as a fallback
  userId ??= body?.context?.userId ?? request.query.get('userId') ?? undefined;

  return userId;
}
