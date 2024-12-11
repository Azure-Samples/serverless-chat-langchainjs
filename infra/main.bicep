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
param cosmosDbServiceName string = ''

@description('Location for the OpenAI resource group')
@allowed(['australiaeast', 'canadaeast', 'eastus', 'eastus2', 'francecentral', 'japaneast', 'northcentralus', 'swedencentral', 'switzerlandnorth', 'uksouth', 'westeurope'])
@metadata({
  azd: {
    type: 'location'
  }
})
param openAiLocation string // Set in main.parameters.json
param openAiSkuName string = 'S0'
param openAiUrl string = ''
param openAiApiVersion string // Set in main.parameters.json

// Location is not relevant here as it's only for the built-in api
// which is not used here. Static Web App is a global service otherwise
@description('Location for the Static Web App')
@allowed(['westus2', 'centralus', 'eastus2', 'westeurope', 'eastasia', 'eastasiastage'])
@metadata({
  azd: {
    type: 'location'
  }
})
param webappLocation string // Set in main.parameters.json

param chatModelName string // Set in main.parameters.json
param chatDeploymentName string = chatModelName
param chatModelVersion string // Set in main.parameters.json
param chatDeploymentCapacity int = 15
param embeddingsModelName string // Set in main.parameters.json
param embeddingsModelVersion string // Set in main.parameters.json
param embeddingsDeploymentName string = embeddingsModelName
param embeddingsDeploymentCapacity int = 30

param blobContainerName string = 'files'

// Id of the user or app to assign application roles
param principalId string = ''

// Enable enhanced security with VNet integration
param useVnet bool // Set in main.parameters.json

// Differentiates between automated and manual deployments
param isContinuousDeployment bool // Set in main.parameters.json

var abbrs = loadJsonContent('abbreviations.json')
var resourceToken = toLower(uniqueString(subscription().id, environmentName, location))
var tags = { 'azd-env-name': environmentName }
var finalOpenAiUrl = empty(openAiUrl) ? 'https://${openAi.outputs.name}.openai.azure.com' : openAiUrl
var storageUrl = 'https://${storage.outputs.name}.blob.${environment().suffixes.storage}'
var apiResourceName = '${abbrs.webSitesFunctions}api-${resourceToken}'

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
    sku: useVnet ? {
      name: 'Standard'
      tier: 'Standard'
    } : {
      name: 'Free'
      tier: 'Free'
    }
  }
}

// The application backend API
module api './app/api.bicep' = {
  name: 'api'
  scope: resourceGroup
  params: {
    name: apiResourceName
    location: location
    tags: union(tags, { 'azd-service-name': apiServiceName })
    appServicePlanId: appServicePlan.outputs.id
    allowedOrigins: [webapp.outputs.uri]
    storageAccountName: storage.outputs.name
    applicationInsightsName: monitoring.outputs.applicationInsightsName
    virtualNetworkSubnetId: useVnet ? vnet.outputs.appSubnetID : ''
    staticWebAppName: webapp.outputs.name
    appSettings: {
      APPINSIGHTS_INSTRUMENTATIONKEY: monitoring.outputs.applicationInsightsInstrumentationKey
      AZURE_OPENAI_API_INSTANCE_NAME: openAi.outputs.name
      AZURE_OPENAI_API_ENDPOINT: finalOpenAiUrl
      AZURE_OPENAI_API_VERSION: openAiApiVersion
      AZURE_OPENAI_API_DEPLOYMENT_NAME: chatDeploymentName
      AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME: embeddingsDeploymentName
      AZURE_COSMOSDB_NOSQL_ENDPOINT: cosmosDb.outputs.endpoint
      AZURE_STORAGE_URL: storageUrl
      AZURE_STORAGE_CONTAINER_NAME: blobContainerName
     }
  }
  dependsOn: empty(openAiUrl) ? [] : [openAi]
}

// Compute plan for the Azure Functions API
module appServicePlan './core/host/appserviceplan.bicep' = {
  name: 'appserviceplan'
  scope: resourceGroup
  params: {
    name: !empty(appServicePlanName) ? appServicePlanName : '${abbrs.webServerFarms}${resourceToken}'
    location: location
    tags: tags
    sku: useVnet ? {
      name: 'FC1'
      tier: 'FlexConsumption'
    } : {
      name: 'Y1'
      tier: 'Dynamic'
    }
    reserved: useVnet ? true : null
  }
}

// Storage for Azure Functions API and Blob storage
module storage './core/storage/storage-account.bicep' = {
  name: 'storage'
  scope: resourceGroup
  params: {
    name: !empty(storageAccountName) ? storageAccountName : '${abbrs.storageStorageAccounts}${resourceToken}'
    location: location
    tags: tags
    allowBlobPublicAccess: false
    allowSharedKeyAccess: !useVnet
    containers: concat([
      {
        name: blobContainerName
        publicAccess: 'None'
      }
    ], useVnet ? [
      // Deployment storage container
      {
        name: apiResourceName
      }
    ] : [])
    networkAcls: useVnet ? {
      defaultAction: 'Deny'
      bypass: 'AzureServices'
      virtualNetworkRules: [
        {
          id: vnet.outputs.appSubnetID
          action: 'Allow'
        }
      ]
    } : {
      bypass: 'AzureServices'
      defaultAction: 'Allow'
    }
  }
}

// Virtual network for Azure Functions API
module vnet './app/vnet.bicep' = if (useVnet) {
  name: 'vnet'
  scope: resourceGroup
  params: {
    name: '${abbrs.networkVirtualNetworks}${resourceToken}'
    location: location
    tags: tags
  }
}

// Monitor application with Azure Monitor
module monitoring './core/monitor/monitoring.bicep' = {
  name: 'monitoring'
  scope: resourceGroup
  params: {
    location: location
    tags: tags
    logAnalyticsName: '${abbrs.operationalInsightsWorkspaces}${resourceToken}'
    applicationInsightsName: '${abbrs.insightsComponents}${resourceToken}'
    applicationInsightsDashboardName: '${abbrs.portalDashboards}${resourceToken}'
  }
}

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
    disableLocalAuth: true
    deployments: [
      {
        name: chatDeploymentName
        model: {
          format: 'OpenAI'
          name: chatModelName
          version: chatModelVersion
        }
        sku: {
          name: 'GlobalStandard'
          capacity: chatDeploymentCapacity
        }
      }
      {
        name: embeddingsDeploymentName
        model: {
          format: 'OpenAI'
          name: embeddingsModelName
          version: embeddingsModelVersion
        }
        capacity: embeddingsDeploymentCapacity
      }
    ]
  }
}

module cosmosDb 'br/public:avm/res/document-db/database-account:0.9.0' = {
  name: 'cosmosDb'
  scope: resourceGroup
  params: {
    name: !empty(cosmosDbServiceName) ? cosmosDbServiceName : '${abbrs.documentDBDatabaseAccounts}${resourceToken}'
    tags: tags
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    managedIdentities: {
      systemAssigned: true
    }
    capabilitiesToAdd: [
      'EnableServerless'
      'EnableNoSQLVectorSearch'
    ]
    networkRestrictions: {
      ipRules: []
      virtualNetworkRules: []
      publicNetworkAccess: 'Enabled'
    }
    sqlDatabases: [
      {
        containers: [
          {
            name: 'vectorSearchContainer'
            paths: [
              '/id'
            ]
          }
        ]
        name: 'vectorSearchDB'
      }
      {
        containers: [
          {
            name: 'chatHistoryContainer'
            paths: [
              '/userId'
            ]
          }
        ]
        name: 'chatHistoryDB'
      }
    ]
  }
}

module dbRoleDefinition './core/database/cosmos/sql/cosmos-sql-role-def.bicep' = {
  scope: resourceGroup
  name: 'db-contrib-role-definition'
  params: {
    accountName: cosmosDb.outputs.name
  }
}


// Managed identity roles assignation
// ---------------------------------------------------------------------------

// User roles
module openAiRoleUser 'core/security/role.bicep' = if (!isContinuousDeployment) {
  scope: resourceGroup
  name: 'openai-role-user'
  params: {
    principalId: principalId
    // Cognitive Services OpenAI User
    roleDefinitionId: '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd'
    principalType: 'User'
  }
}

module storageRoleUser 'core/security/role.bicep' = if (!isContinuousDeployment) {
  scope: resourceGroup
  name: 'storage-contrib-role-user'
  params: {
    principalId: principalId
    // Storage Blob Data Contributor
    roleDefinitionId: 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'
    principalType: 'User'
  }
}

module dbContribRoleUser './core/database/cosmos/sql/cosmos-sql-role-assign.bicep' = if (!isContinuousDeployment) {
  scope: resourceGroup
  name: 'db-contrib-role-user'
  params: {
    accountName: cosmosDb.outputs.name
    principalId: principalId
    // Cosmos DB Data Contributor
    roleDefinitionId: dbRoleDefinition.outputs.id
  }
}

// System roles
module openAiRoleApi 'core/security/role.bicep' = {
  scope: resourceGroup
  name: 'openai-role-api'
  params: {
    principalId: api.outputs.identityPrincipalId
    // Cognitive Services OpenAI User
    roleDefinitionId: '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd'
    principalType: 'ServicePrincipal'
  }
}

module storageRoleApi 'core/security/role.bicep' = {
  scope: resourceGroup
  name: 'storage-role-api'
  params: {
    principalId: api.outputs.identityPrincipalId
    // Storage Blob Data Contributor
    roleDefinitionId: 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'
    principalType: 'ServicePrincipal'
  }
}

module dbContribRoleApi './core/database/cosmos/sql/cosmos-sql-role-assign.bicep' = {
  scope: resourceGroup
  name: 'db-contrib-role-api'
  params: {
    accountName: cosmosDb.outputs.name
    principalId: api.outputs.identityPrincipalId
    // Cosmos DB Data Contributor
    roleDefinitionId: dbRoleDefinition.outputs.id
  }
}

output AZURE_LOCATION string = location
output AZURE_TENANT_ID string = tenant().tenantId
output AZURE_RESOURCE_GROUP string = resourceGroup.name

output AZURE_OPENAI_API_ENDPOINT string = finalOpenAiUrl
output AZURE_OPENAI_API_INSTANCE_NAME string = openAi.outputs.name
output AZURE_OPENAI_API_VERSION string = openAiApiVersion
output AZURE_OPENAI_API_DEPLOYMENT_NAME string = chatDeploymentName
output AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME string = embeddingsDeploymentName
output AZURE_STORAGE_URL string = storageUrl
output AZURE_STORAGE_CONTAINER_NAME string = blobContainerName
output AZURE_COSMOSDB_NOSQL_ENDPOINT string = cosmosDb.outputs.endpoint

output API_URL string = useVnet ? '' : api.outputs.uri
output WEBAPP_URL string = webapp.outputs.uri
output UPLOAD_URL string = useVnet ? webapp.outputs.uri : api.outputs.uri
