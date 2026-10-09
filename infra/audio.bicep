targetScope = 'resourceGroup'

@description('Globally unique, and public: it is the hostname in every audio URL. Lowercase letters and digits only.')
@minLength(3)
@maxLength(24)
param accountName string

param location string

param tags object

@description('Object ID of the user who uploads audio. Empty skips the role assignment and leaves an existing one alone.')
param uploaderPrincipalId string = ''

resource account 'Microsoft.Storage/storageAccounts@2025-01-01' = {
  name: accountName
  location: location
  tags: tags
  kind: 'StorageV2'
  sku: {
    name: 'Standard_LRS'
  }
  properties: {
    accessTier: 'Hot'
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    publicNetworkAccess: 'Enabled'

    // Off by default on a new account, and with it off the container's own
    // setting below is ignored: every reader gets a 409.
    allowBlobPublicAccess: true

    // Uploads authorise through Entra ID, so there's no account key to leak.
    allowSharedKeyAccess: false
    defaultToOAuthAuthentication: true
    allowCrossTenantReplication: false
  }
}

resource blobs 'Microsoft.Storage/storageAccounts/blobServices@2025-01-01' = {
  parent: account
  name: 'default'
  properties: {
    // A browser sends no x-ms-version. With no default here the service
    // answers an anonymous request as its 2009 self, which has no
    // Accept-Ranges: the audio plays and can't be seeked.
    defaultServiceVersion: '2023-11-03'
    deleteRetentionPolicy: {
      enabled: true
      days: 14
    }
    containerDeleteRetentionPolicy: {
      enabled: true
      days: 14
    }
  }
}

resource audioContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2025-01-01' = {
  parent: blobs
  name: 'audio'
  properties: {
    // 'Blob' serves a file to anyone holding its URL. 'Container' would also
    // let them list every file in it.
    publicAccess: 'Blob'
  }
}

// Audio for a post that isn't out yet. Putting it in the public container
// publishes the draft.
resource draftsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2025-01-01' = {
  parent: blobs
  name: 'drafts'
  properties: {
    publicAccess: 'None'
  }
}

var blobDataContributor = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  'ba92f5b4-2d11-453d-a403-e96b0029c9fe'
)

resource uploader 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!empty(uploaderPrincipalId)) {
  scope: account
  name: guid(account.id, uploaderPrincipalId, blobDataContributor)
  properties: {
    roleDefinitionId: blobDataContributor
    principalId: uploaderPrincipalId
    principalType: 'User'
  }
}

output endpoint string = account.properties.primaryEndpoints.blob
