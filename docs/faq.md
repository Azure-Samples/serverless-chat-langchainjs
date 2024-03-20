## Frequently Asked Questions

<details>
<summary><b>How can we upload additional documents without redeploying everything?</b></summary><br>

To upload more documents, use one of these commands depending on your environment.

### For local development

Make sure your API is started by running `npm run start:api` from the root of the project. Then you can use the following command to upload a new PDF document:

```bash
curl -F "file=@<your-document.pdf>" http://localhost:7071/api/documents
```

### For the deployed version

First you need to find the URL of the deployed function. You can either look at the `.env` file at the root of the project and search for the `API_URI` variable, or run this command to get the URL:

```bash
azd env get-values | grep API_URI
```

Then you can use the following command to upload a new PDF document:

```bash
curl -F "file=@<your-document.pdf>" <your_api_url>/api/documents
```

</details>

<details>
<summary><b>Why do we need to break up the documents into chunks?</b></summary><br>

Chunking allows us to limit the amount of information we send to the LLM due to token limits. By breaking up the content, it allows us to easily find potential chunks of text that we can inject and improve the relevance of the results. The method of chunking we use leverages a sliding window of text such that sentences that end one chunk will start the next. This allows us to reduce the chance of losing the context of the text.

</details>

<details>
<summary><b>How do you change the models used in this sample?</b></summary><br>

You can use the environment variables to change the chat and embeddings models used in this sample when deployed.
Run these commands:

```bash
azd env set AZURE_OPENAI_CHATGPT_MODEL gpt-4
azd env set AZURE_OPENAI_API_MODEL_VERSION  0125-preview
azd env set AZURE_OPENAI_API_EMBEDDINGS_MODEL text-embedding-3-large
azd env set AZURE_OPENAI_API_EMBEDDINGS_MODEL_VERSION 1
```

You may also need to adjust the capacity in `infra/main.bicep` file, depending on how much TPM your account is allowed.

<!--
TODO: change local models version with Ollama
-->

</details>

<details>
<summary><b>What does the `azd up` command do?</b></summary><br>

The `azd up` command comes from the [Azure Developer CLI](https://learn.microsoft.com/azure/developer/azure-developer-cli/overview), and takes care of both provisioning the Azure resources and deploying code to the selected Azure hosts.

The `azd up` command uses the `azure.yaml` file combined with the infrastructure-as-code `.bicep` files in the `infra/` folder. The `azure.yaml` file for this project declares several "hooks" for the prepackage step and postprovision steps. The `up` command first runs the `prepackage` hook which installs Node dependencies and builds the TypeScript files. It then packages all the code (both frontend and backend services) into a zip file which it will deploy later.

Next, it provisions the resources based on `main.bicep` and `main.parameters.json`. At that point, since there is no default value for the OpenAI resource location, it asks you to pick a location from a short list of available regions. Then it will send requests to Azure to provision all the required resources. With everything provisioned, it runs the `postprovision` hook to process the local data and add it to an Azure AI Search index.

Finally, it looks at `azure.yaml` to determine the Azure host (Functions and Static Web Apps, in this case) and uploads the zip to Azure. The `azd up` command is now complete, but it may take some time for the app to be fully available and working after the initial deploy.

Related commands are `azd provision` for just provisioning (if infra files change) and `azd deploy` for just deploying updated app code.

</details>
