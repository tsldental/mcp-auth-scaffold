import type { NextFunction, Request, Response } from "express";
import type { AppConfig } from "../config.js";
import { sendUnauthorizedChallenge } from "./challenge.js";
import {
  extractBearerToken,
  formatTokenValidationError,
  hasRequiredPermission,
  validateAccessToken,
} from "./token.js";

export function authMiddleware(config: AppConfig) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token = extractBearerToken(req.header("authorization"));

    if (!token) {
      sendUnauthorizedChallenge(req, res, config, "Missing bearer token.");
      return;
    }

    try {
      const principal = await validateAccessToken(token, config);

      if (!hasRequiredPermission(principal, config.scope)) {
        res.status(403).json({
          error: "forbidden",
          message: `Token is valid but does not include the required scope or role: ${config.scope}`,
        });
        return;
      }

      res.locals.auth = principal;
      next();
    } catch (error) {
      sendUnauthorizedChallenge(req, res, config, formatTokenValidationError(error));
    }
  };
}
