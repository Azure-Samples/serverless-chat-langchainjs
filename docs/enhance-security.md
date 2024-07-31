# Enhance security

To achieve enterprise grade security we've ensured you can leverage the features below through an opt-in flag:

- **Deploy in a [virtual network](https://learn.microsoft.com/azure/virtual-network/virtual-networks-overview)**, to restrict access to the resources including the Azure Functions API and the Azure Storage where the documents are stored.

- **Leverage [Azure Entra managed identity](https://learn.microsoft.com/entra/identity/managed-identities-azure-resources/overview)** to disable all local authentication methods (ie API keys) and rely [Role-based Access Control (RBAC)](https://learn.microsoft.com/azure/role-based-access-control/overview).

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

Note that enabling virtual network will induce additional costs, as it requires the deployment of extra resources and needs to switch to paid plans for the Azure Functions and Azure Static Web App.

> [!IMPORTANT]
> When VNET is enabled, you will lose the ability to run the sample locally while connected to Azure resources.
> You can always fall back to using a local AI model and database for development purposes, by deleting the `api/.env` file
