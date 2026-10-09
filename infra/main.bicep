targetScope = 'resourceGroup'

@description('Name of the Static Web App. Must be unique within the resource group.')
@minLength(2)
@maxLength(60)
param name string

@description('SWA has a restricted control-plane region list; content is served from the global edge regardless, so this only decides where the resource itself lives.')
param location string = 'westeurope'

@description('Applied to the resource for cost reporting and ownership.')
param tags object = {
  workload: 'portfolio'
  environment: 'production'
  managedBy: 'bicep'
}

@description('Storage account that serves narration audio. See audio.bicep.')
param audioAccountName string

@description('Object ID of the user who uploads audio. Passed on the command line, not kept in the parameter file.')
param audioUploaderPrincipalId string = ''

resource site 'Microsoft.Web/staticSites@2025-03-01' = {
  name: name
  location: location
  tags: tags
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    // The workflow builds and uploads; SWA must not try to generate one or
    // wire itself to the repo.
    provider: 'Custom'
    allowConfigFileUpdates: true

    // Free tier caps this at 3 concurrent environments, which is what gives
    // us PR previews.
    stagingEnvironmentPolicy: 'Enabled'
    publicNetworkAccess: 'Enabled'
  }
}

module audio './audio.bicep' = {
  name: 'audio'
  params: {
    accountName: audioAccountName
    location: location
    tags: tags
    uploaderPrincipalId: audioUploaderPrincipalId
  }
}

output staticSiteName string = site.name
output defaultHostname string = site.properties.defaultHostname
output resourceId string = site.id
output audioEndpoint string = audio.outputs.endpoint
