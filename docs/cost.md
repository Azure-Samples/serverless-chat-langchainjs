## Cost estimation

Pricing varies per region and usage, so it isn't possible to predict exact costs for your usage.
However, you can use the [Azure pricing calculator](https://azure.com/e/c504007c9f024699a37f5d947dbb1e79) for the resources below to get an estimate.

- Azure Functions: Consumption plan, Free for the first 1M executions. Pricing per execution and memory used. [Pricing](https://azure.microsoft.com/pricing/details/functions/)
- Azure Static Web Apps: Free tier, 100GB bandwidth. Pricing per GB served. [Pricing](https://azure.microsoft.com/pricing/details/app-service/static/)
- Azure OpenAI: Standard tier, GPT and Ada models. Pricing per 1K tokens used, and at least 1K tokens are used per question. [Pricing](https://azure.microsoft.com/pricing/details/cognitive-services/openai-service/)
- Azure AI Search: Basic tier, 1 replica. Pricing per hour. [Pricing](https://azure.microsoft.com/pricing/details/search/)
- Azure Blob Storage: Standard tier with LRS. Pricing per GB stored and data transfer. [Pricing](https://azure.microsoft.com/pricing/details/storage/blobs/)

⚠️ To avoid unnecessary costs, remember to take down your app if it's no longer in use,
either by deleting the resource group in the Portal or running `azd down --purge`.
