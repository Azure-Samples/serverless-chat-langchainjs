# Enhance security

When deploying the sample in a production environment, you may want to enforce tighter security restrictions to protect your data and resources.

One recommendation is to deploy the sample in a [virtual network](https://learn.microsoft.com/azure/virtual-network/virtual-networks-overview) to restrict access to the resources, including the Azure Functions API and the Azure Storage where the documents are stored. In addition, disabling all local authentication methods (ie API keys) and relying on [Azure Entra managed identity](https://learn.microsoft.com/entra/identity/managed-identities-azure-resources/overview) and [RBAC for access control](https://learn.microsoft.com/azure/role-based-access-control/overview) is another way to enhance security.

You can enable these features when deploying this sample by following these steps:

1. Create a new environment for your deployment (you cannot update an existing one):
   ```bash
   azd env create my-secure-env
   ```
2. Enable the virtual network feature and disable local authentication:
   ```bash
   azd env set USE_VNET true
   ```
3. Deploy the sample to the new environment:
   ```bash
   azd up
   ```

Note that enabling virtual network will induce additional costs, as it requires the deployment of extra resources and needs the switch to paid plans for the Azure Functions and Azure Static Web App.

> [!IMPORTANT]
> When VNET is enabled, you will lose the ability to run the sample locally while connected to Azure resources.
> You can always fall back to using a local AI model and database for development purposes, by deleting the `api/.env` file
