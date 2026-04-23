targetScope = 'resourceGroup'

@description('Location used for the deployment script resource.')
param location string = resourceGroup().location

@description('Display name for the Microsoft Entra app registration.')
param appDisplayName string

@description('Application ID URI exposed by the registration.')
param appIdUri string

@description('Scope value exposed by the registration.')
param scopeName string

@description('Optional client application IDs to pre-authorize for this API.')
param preAuthorizedClientIds array = []

resource registrationScript 'Microsoft.Resources/deploymentScripts@2023-08-01' = {
  name: 'entra-registration-${uniqueString(resourceGroup().id, appDisplayName)}'
  location: location
  kind: 'AzureCLI'
  properties: {
    azCliVersion: '2.61.0'
    timeout: 'PT30M'
    cleanupPreference: 'OnSuccess'
    retentionInterval: 'P1D'
    scriptContent: '''
      set -euo pipefail

      existing_app_id=$(az ad app list --display-name "$APP_DISPLAY_NAME" --query "[0].appId" -o tsv)
      if [ -n "$existing_app_id" ]; then
        app_id="$existing_app_id"
      else
        app_id=$(az ad app create --display-name "$APP_DISPLAY_NAME" --sign-in-audience AzureADMyOrg --query appId -o tsv)
      fi

      app_object_id=$(az ad app show --id "$app_id" --query id -o tsv)
      az ad sp create --id "$app_id" >/dev/null 2>&1 || true
      az ad app update --id "$app_id" --identifier-uris "$APP_ID_URI"

      existing_scope_id=$(az rest --method GET --uri "https://graph.microsoft.com/v1.0/applications/$app_object_id?\$select=api" --query "api.oauth2PermissionScopes[?value=='$SCOPE_NAME'].id | [0]" -o tsv)
      if [ -n "$existing_scope_id" ]; then
        scope_id="$existing_scope_id"
      else
        scope_id=$(cat /proc/sys/kernel/random/uuid)
      fi

      cat > scope-body.json <<EOF
      {
        "api": {
          "requestedAccessTokenVersion": 2,
          "oauth2PermissionScopes": [
            {
              "id": "$scope_id",
              "adminConsentDisplayName": "Access $APP_DISPLAY_NAME",
              "adminConsentDescription": "Allows callers to access $APP_DISPLAY_NAME MCP endpoints.",
              "isEnabled": true,
              "type": "User",
              "userConsentDisplayName": "Access $APP_DISPLAY_NAME",
              "userConsentDescription": "Allows the application to call $APP_DISPLAY_NAME.",
              "value": "$SCOPE_NAME"
            }
          ]
        }
      }
      EOF

      az rest --method PATCH \
        --uri "https://graph.microsoft.com/v1.0/applications/$app_object_id" \
        --headers "Content-Type=application/json" \
        --body @scope-body.json >/dev/null

      if [ -n "$PRE_AUTHORIZED_CLIENT_IDS" ]; then
        python - <<'PY'
import json
import os
client_ids = [client_id for client_id in os.environ["PRE_AUTHORIZED_CLIENT_IDS"].split(",") if client_id]
scope_id = os.environ["SCOPE_ID"]
payload = {
  "api": {
    "preAuthorizedApplications": [
      {
        "appId": client_id,
        "delegatedPermissionIds": [scope_id]
      }
      for client_id in client_ids
    ]
  }
}
with open("preauth-body.json", "w", encoding="utf-8") as handle:
  json.dump(payload, handle)
PY

        az rest --method PATCH \
          --uri "https://graph.microsoft.com/v1.0/applications/$app_object_id" \
          --headers "Content-Type=application/json" \
          --body @preauth-body.json >/dev/null
      fi

      cat > "$AZ_SCRIPTS_OUTPUT_PATH" <<EOF
      {
        "appId": "$app_id",
        "appObjectId": "$app_object_id",
        "appIdUri": "$APP_ID_URI",
        "scope": "$SCOPE_NAME"
      }
      EOF
    '''
    environmentVariables: [
      {
        name: 'APP_DISPLAY_NAME'
        value: appDisplayName
      }
      {
        name: 'APP_ID_URI'
        value: appIdUri
      }
      {
        name: 'SCOPE_NAME'
        value: scopeName
      }
      {
        name: 'PRE_AUTHORIZED_CLIENT_IDS'
        value: join(preAuthorizedClientIds, ',')
      }
      {
        name: 'SCOPE_ID'
        value: guid(resourceGroup().id, appDisplayName, scopeName)
      }
    ]
  }
}

output appId string = string(registrationScript.properties.outputs.appId)
output appObjectId string = string(registrationScript.properties.outputs.appObjectId)
output appIdUri string = string(registrationScript.properties.outputs.appIdUri)
output scope string = string(registrationScript.properties.outputs.scope)
