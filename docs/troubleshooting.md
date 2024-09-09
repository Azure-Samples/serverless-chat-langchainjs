## Troubleshooting

Here are the most common failure scenarios and solutions:

1. The subscription (`AZURE_SUBSCRIPTION_ID`) doesn't have access to the Azure OpenAI service. Please ensure `AZURE_SUBSCRIPTION_ID` matches the ID specified in the [OpenAI access request process](https://aka.ms/oai/access).

1. You're attempting to create resources in regions not enabled for Azure OpenAI (e.g. East US 2 instead of East US), or where the model you're trying to use isn't enabled. See [this matrix of model availability](https://aka.ms/oai/models).

1. You've exceeded a quota, most often number of resources per region. See [this article on quotas and limits](https://aka.ms/oai/quotas). If this happens, you have a few options:

   - Delete other unused resources in the region you're trying to deploy to.
   - Deploy to a different region.
   - Try to use a different model or adjust the capacity in `infra/main.bicep` (see [the FAQ](faq.md)).
   - Request a quota increase.

1. You're getting "same resource name not allowed" conflicts. That's likely because you've run the sample multiple times and deleted the resources you've been creating each time, but are forgetting to purge them. Azure keeps resources for 48 hours unless you purge from soft delete. See [this article on purging resources](https://learn.microsoft.com/azure/ai-services/recover-purge-resources?tabs=azure-portal#purge-a-deleted-resource).

1. After running `azd up` and visiting the website, the website takes a long time to load and answer on the first request. Because we're using serverless technologies, the first request to the Azure Functions API might take a few seconds to start up. This happens because the service is scaled to zero when not in use to optimize the costs, and it takes a few seconds to start up when it's first accessed. However, this slight delay can be removed by using the [Azure Functions Premium plan](https://learn.microsoft.com/azure/azure-functions/functions-premium-plan).
