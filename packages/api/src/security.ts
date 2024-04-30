import { DefaultAzureCredential } from '@azure/identity';

let credentials: DefaultAzureCredential | undefined;

export function getCredentials(): DefaultAzureCredential {
  // Use the current user identity to authenticate.
  // No secrets needed, it uses `az login` or `azd auth login` locally,
  // and managed identity when deployed on Azure.
  credentials ||= new DefaultAzureCredential();
  return credentials;
}
