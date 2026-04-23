import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { authMiddleware } from "./auth/middleware.js";
import { buildAuthorizationServerMetadata, buildProtectedResourceMetadata } from "./auth/prm.js";
import { loadConfig } from "./config.js";

const config = loadConfig();

function createServer(): McpServer {
  const server = new McpServer({
    name: config.serverName,
    version: "0.1.0",
  });

{{SAMPLE_TOOL_REGISTRATION}}
  return server;
}

async function main(): Promise<void> {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", true);
  app.use(express.json({ limit: "1mb" }));

  app.get("/", (_req, res) => {
    res.json({
      name: config.serverName,
      mcpRoute: config.mcpRoute,
      protectedResourceMetadata: "/.well-known/oauth-protected-resource",
      authorizationServerMetadata: "/.well-known/oauth-authorization-server",
    });
  });

  app.get("/healthz", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/.well-known/oauth-protected-resource", (req, res) => {
    res.json(buildProtectedResourceMetadata(req, config));
  });

  app.get("/.well-known/oauth-authorization-server", (_req, res) => {
    res.json(buildAuthorizationServerMetadata(config));
  });

  app.get(config.sampleRestRoute, authMiddleware(config), (_req, res) => {
    const principal = res.locals.auth;

    res.json({
      server: config.serverName,
      status: "authenticated",
      audience: config.audience,
      subject: principal?.payload.sub ?? null,
      scopes: [...(principal?.scopes ?? [])],
      roles: [...(principal?.roles ?? [])],
    });
  });

  app.use(config.mcpRoute, authMiddleware(config));

  app.post(config.mcpRoute, async (req, res) => {
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on("close", () => {
      void transport.close();
      void server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("Error handling MCP request:", error);

      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal server error",
          },
          id: null,
        });
      }
    }
  });

  app.get(config.mcpRoute, (_req, res) => {
    res.status(405).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed.",
      },
      id: null,
    });
  });

  app.delete(config.mcpRoute, (_req, res) => {
    res.status(405).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed.",
      },
      id: null,
    });
  });

  const port = Number(process.env.FUNCTIONS_CUSTOMHANDLER_PORT ?? process.env.PORT ?? "3000");

  app.listen(port, (error?: Error) => {
    if (error) {
      console.error("Failed to start server:", error);
      process.exit(1);
    }

    console.log(`${config.serverName} listening on port ${port}`);
    console.log(`Protected MCP endpoint: http://localhost:${port}${config.mcpRoute}`);
  });
}

main().catch((error) => {
  console.error("Fatal startup error:", error);
  process.exit(1);
});
