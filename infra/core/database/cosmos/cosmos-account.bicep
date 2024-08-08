metadata description = 'Creates an Azure Cosmos DB account.'
param name string
param location string = resourceGroup().location
param tags object = {}

param connectionStringKey string = 'AZURE-COSMOS-CONNECTION-STRING'
param keyVaultName string

@allowed([ 'GlobalDocumentDB', 'MongoDB', 'Parse' ])
param kind string

param disableLocalAuth bool = false

resource cosmos 'Microsoft.DocumentDB/databaseAccounts@2023-11-15' = {
  name: name
  kind: kind
  location: location
  tags: tags
  properties: {
    consistencyPolicy: { defaultConsistencyLevel: 'Session' }
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    databaseAccountOfferType: 'Standard'
    enableAutomaticFailover: false
    enableMultipleWriteLocations: false
    apiProperties: (kind == 'MongoDB') ? { serverVersion: '4.2' } : {}
    capabilities: [
       { name: 'EnableServerless' }
       { name: 'EnableNoSQLVectorSearch' } 
    ]
    minimalTlsVersion: 'Tls12'
    disableLocalAuth: disableLocalAuth
  }
}

resource cosmosConnectionString 'Microsoft.KeyVault/vaults/secrets@2022-07-01' = if (!empty(keyVaultName)) {
  parent: keyVault
  name: connectionStringKey
  properties: {
    value: cosmos.listConnectionStrings().connectionStrings[0].connectionString
  }
}

resource keyVault 'Microsoft.KeyVault/vaults@2022-07-01' existing = if (!empty(keyVaultName)) {
  name: keyVaultName
}

output connectionStringKey string = connectionStringKey
output endpoint string = cosmos.properties.documentEndpoint
output id string = cosmos.id
output name string = cosmos.name
