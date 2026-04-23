export interface VerifyOptions {
  mcpRoute: string;
  sampleRoute: string;
}

export interface VerifyCheck {
  name: string;
  ok: boolean;
  status: number | null;
  url: string;
  details: string[];
}

export interface VerifyResult {
  baseUrl: string;
  ok: boolean;
  checks: VerifyCheck[];
}

interface JsonResponse {
  status: number | null;
  headers: Headers;
  body: unknown;
  bodyText: string;
}

export async function verifyServer(baseUrl: string, options: VerifyOptions): Promise<VerifyResult> {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const prmUrl = joinUrl(normalizedBaseUrl, "/.well-known/oauth-protected-resource");
  const authUrl = joinUrl(normalizedBaseUrl, "/.well-known/oauth-authorization-server");
  const mcpUrl = joinUrl(normalizedBaseUrl, normalizeRoutePath(options.mcpRoute));
  const sampleUrl = joinUrl(normalizedBaseUrl, normalizeRoutePath(options.sampleRoute));

  const prmResponse = await fetchJson(prmUrl);
  const authResponse = await fetchJson(authUrl);
  const mcpResponse = await fetchJson(mcpUrl, {
    method: "POST",
    headers: {
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        clientInfo: {
          name: "mcp-auth-scaffold-verify",
          version: "0.1.0",
        },
        capabilities: {},
      },
      id: 1,
    }),
  });
  const sampleResponse = await fetchJson(sampleUrl);

  const checks: VerifyCheck[] = [
    buildMetadataCheck(
      "Protected resource metadata",
      prmUrl,
      prmResponse,
      ["resource", "authorization_servers"],
    ),
    buildMetadataCheck(
      "Authorization server metadata",
      authUrl,
      authResponse,
      ["issuer", "authorization_endpoint", "token_endpoint", "jwks_uri"],
    ),
    buildChallengeCheck("MCP unauthenticated challenge", mcpUrl, mcpResponse),
    buildChallengeCheck("Sample REST unauthenticated challenge", sampleUrl, sampleResponse),
  ];

  return {
    baseUrl: normalizedBaseUrl,
    ok: checks.every((check) => check.ok),
    checks,
  };
}

function buildMetadataCheck(
  name: string,
  url: string,
  response: JsonResponse,
  requiredFields: string[],
): VerifyCheck {
  const body = isRecord(response.body) ? response.body : {};
  const missingFields = requiredFields.filter((field) => !(field in body));
  const details = [
    `url: ${url}`,
    ...requiredFields
      .filter((field) => field in body)
      .map((field) => `${field}: ${stringifyValue(body[field])}`),
  ];

  if (missingFields.length > 0) {
    details.push(`missing fields: ${missingFields.join(", ")}`);
  }

  return {
    name,
    url,
    status: response.status,
    ok: response.status === 200 && missingFields.length === 0,
    details,
  };
}

function buildChallengeCheck(name: string, url: string, response: JsonResponse): VerifyCheck {
  const body = isRecord(response.body) ? response.body : {};
  const challenge = response.headers.get("www-authenticate");
  const resourceMetadata = typeof body.resource_metadata === "string" ? body.resource_metadata : null;
  const details = [`url: ${url}`];

  if (challenge) {
    details.push(`www-authenticate: ${challenge}`);
  }

  if (resourceMetadata) {
    details.push(`resource_metadata: ${resourceMetadata}`);
  }

  if (!challenge) {
    details.push("missing WWW-Authenticate header");
  }

  if (!resourceMetadata) {
    details.push("missing resource_metadata response body field");
  }

  return {
    name,
    url,
    status: response.status,
    ok: response.status === 401 && Boolean(challenge) && Boolean(resourceMetadata),
    details,
  };
}

async function fetchJson(url: string, init?: RequestInit): Promise<JsonResponse> {
  try {
    const response = await fetch(url, init);
    const bodyText = await response.text();

    return {
      status: response.status,
      headers: response.headers,
      body: parseJson(bodyText),
      bodyText,
    };
  } catch (error) {
    return {
      status: null,
      headers: new Headers(),
      body: {
        error: error instanceof Error ? error.message : "Request failed.",
      },
      bodyText: "",
    };
  }
}

function parseJson(bodyText: string): unknown {
  if (bodyText.trim().length === 0) {
    return null;
  }

  try {
    return JSON.parse(bodyText);
  } catch {
    return bodyText;
  }
}

function stringifyValue(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeBaseUrl(value: string): string {
  const url = new URL(value);
  return url.toString().replace(/\/$/, "");
}

function normalizeRoutePath(value: string): string {
  return value.startsWith("/") ? value : `/${value}`;
}

function joinUrl(baseUrl: string, routePath: string): string {
  return new URL(routePath, `${baseUrl}/`).toString();
}
