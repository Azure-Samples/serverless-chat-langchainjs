## Cost estimation

Pricing varies per region and usage, so it isn't possible to predict exact costs for your usage.
However, you can use the [Azure pricing calculator](https://azure.com/e/aa7deadafa0f4980a91308de010299bc) for the resources below to get an estimate.

- Azure Functions: Consumption plan, Free for the first 1M executions. Pricing per execution and memory used. [Pricing](https://azure.microsoft.com/pricing/details/functions/)
- Azure Static Web Apps: Free tier, 100GB bandwidth. Pricing per GB served. [Pricing](https://azure.microsoft.com/pricing/details/app-service/static/)
- Azure OpenAI: Standard tier, GPT and Ada models. Pricing per 1K tokens used, and at least 1K tokens are used per question. [Pricing](https://azure.microsoft.com/pricing/details/cognitive-services/openai-service/)
- Azure Cosmos DB: Serverless tier. Pricing per request unit (RU). [Pricing](https://azure.microsoft.com/pricing/details/cosmos-db/autoscale-provisioned/)
- Azure Blob Storage: Standard tier with LRS. Pricing per GB stored and data transfer. [Pricing](https://azure.microsoft.com/pricing/details/storage/blobs/)

⚠️ To avoid unnecessary costs, remember to take down your app if it's no longer in use,
either by deleting the resource group in the Portal or running `azd down --purge`.
