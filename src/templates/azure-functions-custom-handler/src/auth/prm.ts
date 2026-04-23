import type { Request } from "express";
import type { AppConfig } from "../config.js";

export function buildProtectedResourceMetadata(req: Request, config: AppConfig) {
  const origin = `${req.protocol}://${req.get("host")}`;

  return {
    resource: `${origin}${config.mcpRoute}`,
    authorization_servers: [config.issuer],
    scopes_supported: [config.scope],
    bearer_methods_supported: ["header"],
    resource_name: `${config.serverName} MCP Server`,
  };
}

export function buildAuthorizationServerMetadata(config: AppConfig) {
  return {
    issuer: config.issuer,
    authorization_endpoint: config.authorizationEndpoint,
    token_endpoint: config.tokenEndpoint,
    jwks_uri: config.jwksUri,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "client_credentials", "refresh_token"],
    token_endpoint_auth_methods_supported: ["private_key_jwt", "client_secret_post", "none"],
    code_challenge_methods_supported: config.codeChallengeMethodsSupported,
    scopes_supported: [config.scope],
  };
}
