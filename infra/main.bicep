targetScope = 'subscription'

@minLength(1)
@maxLength(64)
@description('Name of the the environment which is used to generate a short unique hash used in all resources.')
param environmentName string

@minLength(1)
@description('Primary location for all resources')
param location string

param resourceGroupName string = ''
param webappName string = 'webapp'
param apiServiceName string = 'api'
param appServicePlanName string = ''
param storageAccountName string = ''
param cosmosAccountName string = ''
param mongoDbSkuName string = 'Free'
param indexName string // Set in main.parameters.json

@description('Location for the OpenAI resource group')
@allowed(['australiaeast', 'canadaeast', 'eastus', 'eastus2', 'francecentral', 'japaneast', 'northcentralus', 'swedencentral', 'switzerlandnorth', 'uksouth', 'westeurope'])
@metadata({
  azd: {
    type: 'location'
  }
})
param openAiLocation string // Set in main.parameters.json
param openAiUrl string = ''
param openAiSkuName string = 'S0'

// Location is not relevant here as it's only for the built-in api
// which is not used here. Static Web App is a global service otherwise
@description('Location for the Static Web App')
@allowed(['westus2', 'centralus', 'eastus2', 'westeurope', 'eastasia', 'eastasiastage'])
@metadata({
  azd: {
    type: 'location'
  }
})
param webappLocation string = 'eastus2' // Set in main.parameters.json

param chatGptDeploymentName string // Set in main.parameters.json
param chatGptDeploymentCapacity int = 30
param chatGptModelName string = 'gpt-35-turbo'
param chatGptModelVersion string = '0613'
param embeddingDeploymentName string = 'embedding'
param embeddingDeploymentCapacity int = 30
param embeddingModelName string = 'text-embedding-ada-002'

var abbrs = loadJsonContent('abbreviations.json')
var resourceToken = toLower(uniqueString(subscription().id, environmentName, location))
var tags = { 'azd-env-name': environmentName }
var finalOpenAiUrl = empty(openAiUrl) ? 'https://${openAi.outputs.name}.openai.azure.com' : openAiUrl

// Organize resources in a resource group
resource resourceGroup 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: !empty(resourceGroupName) ? resourceGroupName : '${abbrs.resourcesResourceGroups}${environmentName}'
  location: location
  tags: tags
}

// The application webapp
module webapp './core/host/staticwebapp.bicep' = {
  name: 'webapp'
  scope: resourceGroup
  params: {
    name: !empty(webappName) ? webappName : '${abbrs.webStaticSites}web-${resourceToken}'
    location: webappLocation
    tags: union(tags, { 'azd-service-name': webappName })
  }
}

module cosmos 'core/database/cosmos-mongo-db-vcore.bicep' = {
  name: 'cosmos-mongo'
  scope: resourceGroup
  params: {
    accountName: !empty(cosmosAccountName) ? cosmosAccountName : '${abbrs.documentDBDatabaseAccounts}${resourceToken}'
    administratorLogin: 'admin${resourceToken}'
    skuName: mongoDbSkuName
    location: location
    tags: tags
  }
}

// The application backend
module api './core/host/functions.bicep' = {
  name: 'api'
  scope: resourceGroup
  params: {
    name: '${abbrs.webSitesFunctions}api-${resourceToken}'
    location: location
    tags: union(tags, { 'azd-service-name': apiServiceName })
    allowedOrigins: [webapp.outputs.uri]
    alwaysOn: false
    runtimeName: 'node'
    runtimeVersion: '20'
    appServicePlanId: appServicePlan.outputs.id
    storageAccountName: storage.outputs.name
    appSettings: {
      API_ALLOW_ORIGINS: webapp.outputs.uri
     }
  }
}

// Create an App Service Plan to group applications under the same payment plan and SKU
module appServicePlan './core/host/appserviceplan.bicep' = {
  name: 'appserviceplan'
  scope: resourceGroup
  params: {
    name: !empty(appServicePlanName) ? appServicePlanName : '${abbrs.webServerFarms}${resourceToken}'
    location: location
    tags: tags
    sku: {
      name: 'Y1'
      tier: 'Dynamic'
    }
  }
}

// Backing storage for Azure functions backend API
module storage './core/storage/storage-account.bicep' = {
  name: 'storage'
  scope: resourceGroup
  params: {
    name: !empty(storageAccountName) ? storageAccountName : '${abbrs.storageStorageAccounts}${resourceToken}'
    location: location
    tags: tags
    allowBlobPublicAccess: false
  }
}

// The backend API
// module backendApi './core/host/container-app.bicep' = {
//   name: 'backend-api'
//   scope: resourceGroup
//   params: {
//     name: !empty(backendApiName) ? backendApiName : '${abbrs.appContainerApps}search-${resourceToken}'
//     location: location
//     tags: union(tags, { 'azd-service-name': backendApiName })
//     containerAppsEnvironmentName: containerApps.outputs.environmentName
//     containerRegistryName: containerApps.outputs.registryName
//     managedIdentity: true
//     containerCpuCoreCount: '1.0'
//     containerMemory: '2.0Gi'
//     secrets: useApplicationInsights ? [
//       {
//         name: 'appinsights-cs'
//         value: monitoring.outputs.applicationInsightsConnectionString
//       }
//     ] : []
//     env: concat([
//       {
//         name: 'AZURE_OPENAI_CHATGPT_DEPLOYMENT'
//         value: chatGptDeploymentName
//       }
//       {
//         name: 'AZURE_OPENAI_CHATGPT_MODEL'
//         value: chatGptModelName
//       }
//       {
//         name: 'AZURE_OPENAI_EMBEDDING_DEPLOYMENT'
//         value: embeddingDeploymentName
//       }
//       {
//         name: 'AZURE_OPENAI_EMBEDDING_MODEL'
//         value: embeddingModelName
//       }
//       {
//         name: 'AZURE_OPENAI_URL'
//         value: finalOpenAiUrl
//       }
//       {
//         name: 'AZURE_SEARCH_SERVICE'
//         value: azureSearchService
//       }
//       {
//         name: 'INDEX_NAME'
//         value: indexName
//       }
//       {
//         name: 'QDRANT_URL'
//         value: qdrantUrl
//       }
//     ], useApplicationInsights ? [{
//       name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
//       secretRef: 'appinsights-cs'
//     }] : [])
//     imageName: !empty(backendApiImageName) ? backendApiImageName : 'nginx:latest'
//     targetPort: 3000
//   }
// }

module openAi 'core/ai/cognitiveservices.bicep' = if (empty(openAiUrl)) {
  name: 'openai'
  scope: resourceGroup
  params: {
    name: '${abbrs.cognitiveServicesAccounts}${resourceToken}'
    location: openAiLocation
    tags: tags
    sku: {
      name: openAiSkuName
    }
    deployments: [
      {
        name: chatGptDeploymentName
        model: {
          format: 'OpenAI'
          name: chatGptModelName
          version: chatGptModelVersion
        }
        sku: {
          name: 'Standard'
          capacity: chatGptDeploymentCapacity
        }
      }
      {
        name: embeddingDeploymentName
        model: {
          format: 'OpenAI'
          name: embeddingModelName
          version: '2'
        }
        capacity: embeddingDeploymentCapacity
      }
    ]
  }
}

output AZURE_LOCATION string = location
output AZURE_TENANT_ID string = tenant().tenantId
output AZURE_RESOURCE_GROUP string = resourceGroup.name

output AZURE_OPENAI_URL string = finalOpenAiUrl
output AZURE_OPENAI_CHATGPT_DEPLOYMENT string = chatGptDeploymentName
output AZURE_OPENAI_CHATGPT_MODEL string = chatGptModelName
output AZURE_OPENAI_EMBEDDING_DEPLOYMENT string = embeddingDeploymentName
output AZURE_OPENAI_EMBEDDING_MODEL string = embeddingModelName

output MONGODB_CONNECTION_STRING string = cosmos.outputs.connectionString

output INDEX_NAME string =  indexName
output API_URI string = api.outputs.uri
output WEBAPP_URI string = webapp.outputs.uri
