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
param databaseName string = 'mongodb'
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

@description('Id of the user or app to assign application roles')
param principalId string = ''

@description('Use Application Insights for monitoring and performance tracing')
param useApplicationInsights bool = false

// Differentiates between automated and manual deployments
param isContinuousDeployment bool = false

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

// // Monitor application with Azure Monitor
// module monitoring './core/monitor/monitoring.bicep' = {
//   name: 'monitoring'
//   scope: resourceGroup
//   params: {
//     location: location
//     tags: tags
//     logAnalyticsName: '${abbrs.operationalInsightsWorkspaces}${resourceToken}'
//     applicationInsightsName: useApplicationInsights ? '${abbrs.insightsComponents}${resourceToken}' : ''
//   }
// }

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

// USER ROLES
module openAiRoleUser 'core/security/role.bicep' = if (empty(openAiUrl) && !isContinuousDeployment) {
  scope: resourceGroup
  name: 'openai-role-user'
  params: {
    principalId: principalId
    // Cognitive Services OpenAI User
    roleDefinitionId: '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd'
    principalType: 'User'
  }
}

// module searchContribRoleUser 'core/security/role.bicep' = if (useAzureAISearch && !isContinuousDeployment) {
//   scope: resourceGroup
//   name: 'search-contrib-role-user'
//   params: {
//     principalId: principalId
//     // Search Index Data Contributor
//     roleDefinitionId: '8ebe5a00-799e-43f5-93ac-243d3dce84a7'
//     principalType: 'User'
//   }
// }

// module searchSvcContribRoleUser 'core/security/role.bicep' = if (useAzureAISearch && !isContinuousDeployment) {
//   scope: resourceGroup
//   name: 'search-svccontrib-role-user'
//   params: {
//     principalId: principalId
//     // Search Service Contributor
//     roleDefinitionId: '7ca78c08-252a-4471-8644-bb5ff32d4ba0'
//     principalType: 'User'
//   }
// }

// // SYSTEM IDENTITIES
// module openAiRoleBackendApi 'core/security/role.bicep' = if (empty(openAiUrl)) {
//   scope: resourceGroup
//   name: 'openai-role-backendapi'
//   params: {
//     principalId: backendApi.outputs.identityPrincipalId
//     // Cognitive Services OpenAI User
//     roleDefinitionId: '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd'
//     principalType: 'ServicePrincipal'
//   }
// }

// module searchRoleBackendApi 'core/security/role.bicep' = if (useAzureAISearch) {
//   scope: resourceGroup
//   name: 'search-role-backendapi'
//   params: {
//     principalId: backendApi.outputs.identityPrincipalId
//     // Search Index Data Reader
//     roleDefinitionId: '1407120a-92aa-4202-b7e9-c0e197c71c8f'
//     principalType: 'ServicePrincipal'
//   }
// }

output AZURE_LOCATION string = location
output AZURE_TENANT_ID string = tenant().tenantId
output AZURE_RESOURCE_GROUP string = resourceGroup.name

output AZURE_OPENAI_URL string = finalOpenAiUrl
output AZURE_OPENAI_CHATGPT_DEPLOYMENT string = chatGptDeploymentName
output AZURE_OPENAI_CHATGPT_MODEL string = chatGptModelName
output AZURE_OPENAI_EMBEDDING_DEPLOYMENT string = embeddingDeploymentName
output AZURE_OPENAI_EMBEDDING_MODEL string = embeddingModelName

output INDEX_NAME string =  indexName
output WEBAPP_URI string = webapp.outputs.uri
