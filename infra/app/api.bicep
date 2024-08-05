param name string
param location string = resourceGroup().location
param tags object = {}

param appServicePlanId string
param storageAccountName string
param virtualNetworkSubnetId string
param applicationInsightsName string
param allowedOrigins array
param appSettings object
param staticWebAppName string = ''

var useVnet = !empty(virtualNetworkSubnetId)
var finalApi = useVnet ? apiFlex : api

module apiFlex '../core/host/functions-flex.bicep' = if (useVnet) {
  name: 'api-flex'
  scope: resourceGroup()
  params: {
    name: name
    location: location
    tags: tags
    allowedOrigins: allowedOrigins
    alwaysOn: false
    runtimeName: 'node'
    runtimeVersion: '20'
    appServicePlanId: appServicePlanId
    storageAccountName: storageAccountName
    applicationInsightsName: applicationInsightsName
    virtualNetworkSubnetId: virtualNetworkSubnetId
    appSettings: appSettings
  }
}

module api '../core/host/functions.bicep' = if (!useVnet) {
  name: 'api-consumption'
  scope: resourceGroup()
  params: {
    name: name
    location: location
    tags: tags
    allowedOrigins: allowedOrigins
    alwaysOn: false
    runtimeName: 'node'
    runtimeVersion: '20'
    appServicePlanId: appServicePlanId
    storageAccountName: storageAccountName
    applicationInsightsName: applicationInsightsName
    managedIdentity: true
    appSettings: appSettings
  }
}

// Link the Function App to the Static Web App
module linkedBackend './linked-backend.bicep' = if (useVnet) {
  name: 'linkedbackend'
  scope: resourceGroup()
  params: {
    staticWebAppName: staticWebAppName
    backendResourceId: finalApi.outputs.id
    backendLocation: location
  }
}

output identityPrincipalId string = finalApi.outputs.identityPrincipalId
output name string = finalApi.outputs.name
output uri string = finalApi.outputs.uri
