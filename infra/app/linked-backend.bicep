param staticWebAppName string
param backendResourceId string
param backendLocation string

resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' existing = {
  name: staticWebAppName
}

resource linkedStaticWebAppBackend 'Microsoft.Web/staticSites/linkedBackends@2023-12-01' = {
  parent: staticWebApp
  name: 'linkedBackend'
  properties: {
    backendResourceId: backendResourceId
    region: backendLocation
  }
}
