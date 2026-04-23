import { createRemoteJWKSet, errors, jwtVerify, type JWTPayload } from "jose";
import type { AppConfig } from "../config.js";

export interface AuthenticatedPrincipal {
  payload: JWTPayload;
  scopes: Set<string>;
  roles: Set<string>;
}

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export function extractBearerToken(headerValue: string | undefined): string | null {
  if (!headerValue) {
    return null;
  }

  const match = /^Bearer\s+(.+)$/i.exec(headerValue.trim());
  return match?.[1] ?? null;
}

export async function validateAccessToken(
  token: string,
  config: AppConfig,
): Promise<AuthenticatedPrincipal> {
  const { payload } = await jwtVerify(token, getRemoteJwks(config.jwksUri), {
    issuer: config.issuer,
    audience: config.audience,
  });

  return {
    payload,
    scopes: new Set(splitClaimValues(payload.scp)),
    roles: new Set(splitClaimValues(payload.roles)),
  };
}

export function hasRequiredPermission(principal: AuthenticatedPrincipal, required: string): boolean {
  return principal.scopes.has(required) || principal.roles.has(required);
}

export function formatTokenValidationError(error: unknown): string {
  if (error instanceof errors.JWTExpired) {
    return "Access token expired.";
  }

  if (error instanceof errors.JWTClaimValidationFailed) {
    return "Token claim validation failed.";
  }

  if (error instanceof errors.JWTInvalid) {
    return "Access token is invalid.";
  }

  return error instanceof Error ? error.message : "Access token validation failed.";
}

function getRemoteJwks(jwksUri: string) {
  const cached = jwksCache.get(jwksUri);

  if (cached) {
    return cached;
  }

  const jwks = createRemoteJWKSet(new URL(jwksUri));
  jwksCache.set(jwksUri, jwks);
  return jwks;
}

function splitClaimValues(value: unknown): string[] {
  if (typeof value === "string") {
    return value
      .split(" ")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
  }

  return [];
}
