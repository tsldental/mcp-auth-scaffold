import dotenv from "dotenv";

dotenv.config();

export interface AppConfig {
  tenantId: string;
  clientId: string;
  audience: string;
  scope: string;
  basePath: string;
  mcpRoute: string;
  sampleRestRoute: string;
  serverName: string;
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  jwksUri: string;
  codeChallengeMethodsSupported: string[];
}

export function loadConfig(): AppConfig {
  const tenantId = required("AZURE_TENANT_ID");
  const clientId = required("AZURE_CLIENT_ID");
  const audience = required("AZURE_AUDIENCE");
  const scope = required("AZURE_SCOPE");
  const basePath = normalizeBasePath(process.env.MCP_BASE_PATH ?? "{{BASE_PATH}}");
  const serverName = process.env.SERVER_NAME ?? "{{SERVER_NAME}}";
  const loginBaseUrl = `https://login.microsoftonline.com/${tenantId}`;
  const issuer = process.env.AZURE_ISSUER ?? `${loginBaseUrl}/v2.0`;

  return {
    tenantId,
    clientId,
    audience,
    scope,
    basePath,
    mcpRoute: `${basePath}/mcp` || "/mcp",
    sampleRestRoute: `${basePath}/api/sample-status` || "/api/sample-status",
    serverName,
    issuer,
    authorizationEndpoint:
      process.env.AZURE_AUTHORIZATION_ENDPOINT ?? `${loginBaseUrl}/oauth2/v2.0/authorize`,
    tokenEndpoint: process.env.AZURE_TOKEN_ENDPOINT ?? `${loginBaseUrl}/oauth2/v2.0/token`,
    jwksUri: process.env.AZURE_JWKS_URI ?? `${loginBaseUrl}/discovery/v2.0/keys`,
    codeChallengeMethodsSupported: ["S256"],
  };
}

function required(name: string): string {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value.trim();
}

function normalizeBasePath(value: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0 || trimmed === "/") {
    return "";
  }

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+$/, "");
}
