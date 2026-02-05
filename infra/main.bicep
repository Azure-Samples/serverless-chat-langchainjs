targetScope = 'subscription'

@minLength(1)
@maxLength(64)
@description('Name of the the environment which is used to generate a short unique hash used in all resources.')
param environmentName string

@minLength(1)
@description('Primary location for all resources')
// Flex Consumption functions are only supported in these regions.
// Run `az functionapp list-flexconsumption-locations --output table` to get the latest list
@allowed([
  'northeurope'
  'uksouth'
  'swedencentral'
  'eastus'
  'eastus2'
  'southcentralus'
  'westus2'
  'westus3'
  'eastasia'
  'southeastasia'
  'australiaeast'
])
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
var principalType = isContinuousDeployment ? 'ServicePrincipal' : 'User'
var finalOpenAiUrl = empty(openAiUrl) ? 'https://${aiFoundry.outputs.aiServicesName}.openai.azure.com' : openAiUrl
var storageUrl = 'https://${storage.outputs.name}.blob.${environment().suffixes.storage}'
var apiResourceName = '${abbrs.webSitesFunctions}api-${resourceToken}'
var webappUrl = 'https://${webapp.outputs.defaultHostname}'
var apiUrl = 'https://${api.outputs.defaultHostname}'

// Organize resources in a resource group
resource resourceGroup 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: !empty(resourceGroupName) ? resourceGroupName : '${abbrs.resourcesResourceGroups}${environmentName}'
  location: location
  tags: tags
}

// The application webapp
module webapp 'br/public:avm/res/web/static-site:0.9.3' = {
  name: 'webapp'
  scope: resourceGroup
  params: {
    name: !empty(webappName) ? webappName : '${abbrs.webStaticSites}web-${resourceToken}'
    location: webappLocation
    tags: union(tags, { 'azd-service-name': webappName })
    sku: useVnet ? 'Standard' : 'Free'
    linkedBackend: useVnet ? {
      resourceId: api.outputs.resourceId
      location: location
    } : null
  }
}

// The application backend API
module api 'br/public:avm/res/web/site:0.16.1' = {
  name: 'api'
  scope: resourceGroup
  params: {
    name: apiResourceName
    tags: union(tags, { 'azd-service-name': apiServiceName })
    location: location
    kind: 'functionapp,linux'
    serverFarmResourceId: appServicePlan.outputs.resourceId
    configs: [
      {
        name: 'appsettings'
        applicationInsightResourceId: monitoring.outputs.applicationInsightsResourceId
        storageAccountResourceId: storage.outputs.resourceId
        storageAccountUseIdentityAuthentication: true
      }
    ]
    managedIdentities: { systemAssigned: true }
    siteConfig: {
      minTlsVersion: '1.2'
      ftpsState: 'FtpsOnly'
      cors: {
        allowedOrigins: [
          '*'
        ]
        supportCredentials: false
      }
    }
    virtualNetworkSubnetId: useVnet ? vnet.outputs.subnetResourceIds[0] : ''
    functionAppConfig: {
      deployment: {
        storage: {
          type: 'blobContainer'
          value: '${storage.outputs.primaryBlobEndpoint}${apiServiceName}'
          authentication: {
            type: 'SystemAssignedIdentity'
          }
        }
      }
      scaleAndConcurrency: {
        alwaysReady: [
          {
            name: 'http'
            instanceCount: 1
          }
        ]
        maximumInstanceCount: 100
        instanceMemoryMB: 2048
      }
      runtime: {
        name: 'node'
        version: '22'
      }
    }
  }
}

// Needed to avoid circular resource dependencies
module apiFunctionSettings 'br/public:avm/res/web/site/config:0.1.0' = {
  name: 'api-settings'
  scope: resourceGroup
  params: {
    name: 'appsettings'
    appName: api.outputs.name
    properties: {
      AZURE_OPENAI_API_INSTANCE_NAME: aiFoundry.outputs.aiServicesName
      AZURE_OPENAI_API_ENDPOINT: finalOpenAiUrl
      AZURE_OPENAI_API_VERSION: openAiApiVersion
      AZURE_OPENAI_API_DEPLOYMENT_NAME: chatDeploymentName
      AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME: embeddingsDeploymentName
      AZURE_COSMOSDB_NOSQL_ENDPOINT: cosmosDb.outputs.endpoint
      AZURE_STORAGE_URL: storageUrl
      AZURE_STORAGE_CONTAINER_NAME: blobContainerName
    }
    storageAccountResourceId: storage.outputs.resourceId
    storageAccountUseIdentityAuthentication: true
    applicationInsightResourceId: monitoring.outputs.applicationInsightsResourceId
  }
}

// Compute plan for the Azure Functions API
module appServicePlan 'br/public:avm/res/web/serverfarm:0.4.1' = {
  name: 'appserviceplan'
  scope: resourceGroup
  params: {
    name: !empty(appServicePlanName) ? appServicePlanName : '${abbrs.webServerFarms}${resourceToken}'
    tags: tags
    location: location
    skuName: 'FC1'
    reserved: true
  }
}

// Storage for Azure Functions API and Blob storage
module storage 'br/public:avm/res/storage/storage-account:0.26.2' = {
  name: 'storage'
  scope: resourceGroup
  params: {
    name: !empty(storageAccountName) ? storageAccountName : '${abbrs.storageStorageAccounts}${resourceToken}'
    tags: tags
    location: location
    skuName: 'Standard_LRS'
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false
    publicNetworkAccess: 'Enabled'
    networkAcls: useVnet ? {
      defaultAction: 'Deny'
      bypass: 'AzureServices'
      virtualNetworkRules: [
        {
          id: vnet.outputs.subnetResourceIds[0]
          action: 'Allow'
        }
      ]
    } : {
      bypass: 'AzureServices'
      defaultAction: 'Allow'
    }
    blobServices: {
      containers: [
        {
          name: apiServiceName
        }
        {
          name: blobContainerName
          publicAccess: 'None'
        }
      ]
    }
    roleAssignments: [
      {
        principalId: principalId
        principalType: principalType
        roleDefinitionIdOrName: 'Storage Blob Data Contributor'
      }
    ]
  }
}

// Virtual network for Azure Functions API
module vnet 'br/public:avm/res/network/virtual-network:0.7.2' = if (useVnet) {
  name: 'vnet'
  scope: resourceGroup
  params: {
    name: '${abbrs.networkVirtualNetworks}${resourceToken}'
    location: location
    tags: tags
    addressPrefixes: [
      '10.0.0.0/16'
    ]
    subnets: [
      {
        name: 'app'
        addressPrefixes: [
          '10.0.1.0/24'
        ]
        delegation: 'Microsoft.App/environments'
        serviceEndpoints: [
          'Microsoft.Storage'
        ]
        privateEndpointNetworkPolicies: 'Disabled'
        privateLinkServiceNetworkPolicies: 'Enabled'
      }
    ]
    vnetEncryption: false
  }
}

// Monitor application with Azure Monitor
module monitoring 'br/public:avm/ptn/azd/monitoring:0.2.1' = {
  name: 'monitoring'
  scope: resourceGroup
  params: {
    tags: tags
    location: location
    applicationInsightsName: '${abbrs.insightsComponents}${resourceToken}'
    applicationInsightsDashboardName: '${abbrs.portalDashboards}${resourceToken}'
    logAnalyticsName: '${abbrs.operationalInsightsWorkspaces}${resourceToken}'
  }
}

module aiFoundry 'br/public:avm/ptn/ai-ml/ai-foundry:0.4.0' = if (empty(openAiUrl)) {
  name: 'aiFoundry'
  scope: resourceGroup
  params: {
    baseName: substring(resourceToken, 0, 12) // Max 12 chars
    tags: tags
    location: openAiLocation
    aiFoundryConfiguration: {
      roleAssignments: [
        {
          principalId: principalId
          principalType: principalType
          roleDefinitionIdOrName: 'Cognitive Services OpenAI User'
        }
        {
          principalId: api.outputs.?systemAssignedMIPrincipalId!
          principalType: 'ServicePrincipal'
          roleDefinitionIdOrName: 'Cognitive Services OpenAI User'
       }
      ]
    }
    aiModelDeployments: [
      {
        name: chatDeploymentName
        model: {
          format: 'OpenAI'
          name: chatModelName
          version: chatModelVersion
        }
        sku: {
          capacity: chatDeploymentCapacity
          name: 'GlobalStandard'
        }
      }
      {
        name: embeddingsDeploymentName
        model: {
          format: 'OpenAI'
          name: embeddingsModelName
          version: embeddingsModelVersion
        }
        sku: {
          capacity: embeddingsDeploymentCapacity
          name: 'GlobalStandard'
        }
      }
    ]
  }
}

module cosmosDb 'br/public:avm/res/document-db/database-account:0.16.0' = {
  name: 'cosmosDb'
  scope: resourceGroup
  params: {
    name: !empty(cosmosDbServiceName) ? cosmosDbServiceName : '${abbrs.documentDBDatabaseAccounts}${resourceToken}'
    tags: tags
    location: location
    zoneRedundant: false
    managedIdentities: {
      systemAssigned: true
    }
    capabilitiesToAdd: [
      'EnableServerless'
      'EnableNoSQLVectorSearch'
      'EnableNoSQLFullTextSearch'
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
    dataPlaneRoleDefinitions: [
      {
        roleName: 'db-contrib-role-definition'
        dataActions: [
          'Microsoft.DocumentDB/databaseAccounts/readMetadata'
          'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers/items/*'
          'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers/*'
        ]
        assignments: [
          { principalId: principalId }
          { principalId: api.outputs.systemAssignedMIPrincipalId! }
        ]
      }
    ]
  }
}


// Managed identity roles assignation
// ---------------------------------------------------------------------------

// System roles
module storageRoleApi 'br/public:avm/ptn/authorization/resource-role-assignment:0.1.2' = {
  scope: resourceGroup
  name: 'storage-role-api'
  params: {
    principalId: api.outputs.?systemAssignedMIPrincipalId!
    roleName: 'Storage Blob Data Contributor'
    roleDefinitionId: 'b7e6dc6d-f1e8-4753-8033-0f276bb0955b'
    resourceId: storage.outputs.resourceId
  }
}

output AZURE_LOCATION string = location
output AZURE_TENANT_ID string = tenant().tenantId
output AZURE_RESOURCE_GROUP string = resourceGroup.name

output AZURE_OPENAI_API_ENDPOINT string = finalOpenAiUrl
output AZURE_OPENAI_API_INSTANCE_NAME string = aiFoundry.outputs.aiServicesName
output AZURE_OPENAI_API_VERSION string = openAiApiVersion
output AZURE_OPENAI_API_DEPLOYMENT_NAME string = chatDeploymentName
output AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME string = embeddingsDeploymentName
output AZURE_STORAGE_URL string = storageUrl
output AZURE_STORAGE_CONTAINER_NAME string = blobContainerName
output AZURE_COSMOSDB_NOSQL_ENDPOINT string = cosmosDb.outputs.endpoint

output API_URL string = useVnet ? '' : apiUrl
output WEBAPP_URL string = webappUrl
output UPLOAD_URL string = useVnet ? webappUrl : apiUrl
