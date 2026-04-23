import type { Request, Response } from "express";
import type { AppConfig } from "../config.js";

const PROTECTED_RESOURCE_METADATA_PATH = "/.well-known/oauth-protected-resource";

export function sendUnauthorizedChallenge(
  req: Request,
  res: Response,
  config: AppConfig,
  description?: string,
): void {
  const header = buildAuthenticateHeader(req, config, description);

  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("WWW-Authenticate", header);
  res.status(401).json({
    error: "unauthorized",
    message: description ?? "A bearer token is required.",
    resource_metadata: getProtectedResourceMetadataUrl(req),
  });
}

export function getProtectedResourceMetadataUrl(req: Request): string {
  return `${getOrigin(req)}${PROTECTED_RESOURCE_METADATA_PATH}`;
}

function buildAuthenticateHeader(req: Request, config: AppConfig, description?: string): string {
  const attributes = [
    `resource_metadata="${escapeHeaderValue(getProtectedResourceMetadataUrl(req))}"`,
    `authorization_uri="${escapeHeaderValue(config.authorizationEndpoint)}"`,
    `resource="${escapeHeaderValue(config.audience)}"`,
    `scope="${escapeHeaderValue(config.scope)}"`,
  ];

  if (description) {
    attributes.push('error="invalid_token"');
    attributes.push(`error_description="${escapeHeaderValue(description)}"`);
  }

  return `Bearer ${attributes.join(", ")}`;
}

function getOrigin(req: Request): string {
  return `${req.protocol}://${req.get("host")}`;
}

function escapeHeaderValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
