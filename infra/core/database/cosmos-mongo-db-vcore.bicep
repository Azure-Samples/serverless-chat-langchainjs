metadata description = 'Creates an Azure Cosmos DB for MongoDB vCore account with a database.'
param accountName string
@secure()
param administratorLogin string
@secure()
param administratorLoginPassword string = newGuid()
param location string = resourceGroup().location
param skuName string = 'Free'
param tags object = {}

param connectionStringKey string = 'AZURE-COSMOS-CONNECTION-STRING'

resource cosmos 'Microsoft.DocumentDB/mongoClusters@2023-11-15-preview' = {
  name: accountName
  location: location
  tags: tags
  properties: {
    administratorLogin: administratorLogin
    administratorLoginPassword: administratorLoginPassword
    createMode: 'Default'
    serverVersion: '6.0'
    nodeGroupSpecs: [
      {
        kind: 'Shard'
        sku: skuName
        diskSizeGB: 32
        enableHa: false
        nodeCount: 1
      }
    ]
  }
  resource firewallRule 'firewallRules' = {
    name: 'AllowAll'
    properties: {
      startIpAddress: '0.0.0.0'
      endIpAddress: '255.255.255.255'
    }
  }
}

// output connectionString string = cosmos.outputs.connectionStrings[connectionStringKey].connectionString
