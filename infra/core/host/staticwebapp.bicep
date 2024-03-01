metadata description = 'Creates an Azure Static Web Apps instance.'
param name string
param location string = resourceGroup().location
param tags object = {}
param env array = []

param sku object = {
  name: 'Free'
  tier: 'Free'
}

resource web 'Microsoft.Web/staticSites@2022-03-01' = {
  name: name
  location: location
  tags: tags
  sku: sku
  properties: {
    provider: 'Custom'
  }

  resource config 'config' = {
    name: 'appsettings'
    properties: {
      // webSocketsEnabled: true
      // siteConfig: {
      //   appSettings: [
      //     {
      //       name: 'CosmosDBConnectionString'
      //       value: 'toto'
      //     }
      //   ]
      // }
    }
  }
}

output name string = web.name
output uri string = 'https://${web.properties.defaultHostname}'
