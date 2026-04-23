targetScope = 'resourceGroup'

@description('Short environment identifier used in resource naming.')
param environmentName string = 'dev'

@description('Azure region for all resources.')
param location string = resourceGroup().location

@description('Project prefix used when naming Azure resources.')
param namePrefix string = '{{PROJECT_SLUG}}'

@description('When true, deploy the experimental Entra app registration scaffolding in infra/entra-app-registration.bicep.')
param deployEntraAppRegistration bool = false

@description('Entra tenant ID used by the generated app.')
param tenantId string = '{{TENANT_ID}}'

@description('Existing Entra client ID. Ignored when deployEntraAppRegistration=true.')
param clientId string = '{{CLIENT_ID}}'

@description('Existing Application ID URI / audience. Ignored when deployEntraAppRegistration=true.')
param audience string = '{{AUDIENCE}}'

@description('Scope or app role value required by the generated server.')
param scope string = '{{SCOPE}}'

@description('Display name used when scaffolding an Entra app registration.')
param entraAppDisplayName string = '{{ENTRA_APP_DISPLAY_NAME}}'

@description('Optional pre-authorized client IDs to grant delegated access during app registration scaffolding.')
param preAuthorizedClientIds array = []

@description('Server display name used in app settings.')
param serverName string = '{{SERVER_NAME}}'

@description('Base path used by the generated MCP server.')
param mcpBasePath string = '{{BASE_PATH}}'

var normalizedPrefix = take(replace(replace(toLower(namePrefix), '-', ''), '_', ''), 11)
var uniqueSuffix = take(uniqueString(subscription().subscriptionId, resourceGroup().id, namePrefix, environmentName), 6)
var storageAccountName = '${normalizedPrefix}${uniqueSuffix}sa'
var functionAppName = take('${namePrefix}-${environmentName}-func-${uniqueSuffix}', 60)
var appInsightsName = '${namePrefix}-${environmentName}-appi'
var planName = '${namePrefix}-${environmentName}-plan'
var resolvedAppIdUri = deployEntraAppRegistration ? 'api://${functionAppName}' : audience

module entraRegistration 'entra-app-registration.bicep' = if (deployEntraAppRegistration) {
  name: 'entra-registration'
  params: {
    location: location
    appDisplayName: entraAppDisplayName
    appIdUri: resolvedAppIdUri
    scopeName: scope
    preAuthorizedClientIds: preAuthorizedClientIds
  }
}

var resolvedClientId = deployEntraAppRegistration ? entraRegistration.outputs.appId : clientId
var resolvedAudience = deployEntraAppRegistration ? entraRegistration.outputs.appIdUri : audience
var resolvedScope = deployEntraAppRegistration ? entraRegistration.outputs.scope : scope

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: null
  }
}

resource hostingPlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: planName
  location: location
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
  kind: 'functionapp'
}

var storageConnectionString = 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${listKeys(storage.id, storage.apiVersion).keys[0].value};EndpointSuffix=${environment().suffixes.storage}'

resource functionApp 'Microsoft.Web/sites@2023-12-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: hostingPlan.id
    httpsOnly: true
    clientAffinityEnabled: false
    siteConfig: {
      minTlsVersion: '1.2'
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: storageConnectionString
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'custom'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~22'
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
        {
          name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
          value: appInsights.properties.InstrumentationKey
        }
        {
          name: 'AZURE_TENANT_ID'
          value: tenantId
        }
        {
          name: 'AZURE_CLIENT_ID'
          value: resolvedClientId
        }
        {
          name: 'AZURE_AUDIENCE'
          value: resolvedAudience
        }
        {
          name: 'AZURE_SCOPE'
          value: resolvedScope
        }
        {
          name: 'MCP_BASE_PATH'
          value: mcpBasePath
        }
        {
          name: 'SERVER_NAME'
          value: serverName
        }
      ]
    }
  }
}

output functionAppName string = functionApp.name
output functionAppUrl string = 'https://${functionApp.properties.defaultHostName}'
output applicationInsightsName string = appInsights.name
output storageAccountName string = storage.name
output entraClientId string = resolvedClientId
output entraAudience string = resolvedAudience
output entraScope string = resolvedScope
