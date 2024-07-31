@description('Specifies the name of the virtual network.')
param name string

@description('Specifies the location.')
param location string = resourceGroup().location

@description('Specifies the name of the subnet for Function App virtual network integration.')
param appSubnetName string = 'app'

param tags object = {}

resource virtualNetwork 'Microsoft.Network/virtualNetworks@2023-05-01' = {
  name: name
  location: location
  tags: tags
  properties: {
    addressSpace: {
      addressPrefixes: [
        '10.0.0.0/16'
      ]
    }
    encryption: {
      enabled: false
      enforcement: 'AllowUnencrypted'
    }
    subnets: [
      {
        name: appSubnetName
        id: resourceId('Microsoft.Network/virtualNetworks/subnets', name, 'app')
        properties: {
          addressPrefixes: [
            '10.0.1.0/24'
          ]
          delegations: [
            {
              name: 'delegation'
              id: '${resourceId('Microsoft.Network/virtualNetworks/subnets', name, 'app')}/delegations/delegation'
              properties: {
                //Microsoft.App/environments is the correct delegation for Flex Consumption VNet integration
                serviceName: 'Microsoft.App/environments'
              }
              type: 'Microsoft.Network/virtualNetworks/subnets/delegations'
            }
          ]
          serviceEndpoints: [
            {
              service: 'Microsoft.Storage'
              locations: [
                resourceGroup().location
              ]
            }
          ]
          privateEndpointNetworkPolicies: 'Disabled'
          privateLinkServiceNetworkPolicies: 'Enabled'
        }
        type: 'Microsoft.Network/virtualNetworks/subnets'
      }
    ]
    virtualNetworkPeerings: []
    enableDdosProtection: false
  }
}

output appSubnetName string = virtualNetwork.properties.subnets[0].name
output appSubnetID string = virtualNetwork.properties.subnets[0].id
