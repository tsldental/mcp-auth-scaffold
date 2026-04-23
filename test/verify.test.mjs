import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import test from "node:test";

const execFileAsync = promisify(execFile);

test("verify confirms metadata and unauthenticated challenge behavior", async () => {
  const server = createServer((req, res) => {
    if (req.url === "/.well-known/oauth-protected-resource") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          resource: "http://127.0.0.1/mcp",
          authorization_servers: ["https://login.microsoftonline.com/example/v2.0"],
        }),
      );
      return;
    }

    if (req.url === "/.well-known/oauth-authorization-server") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          issuer: "https://login.microsoftonline.com/example/v2.0",
          authorization_endpoint: "https://login.microsoftonline.com/example/oauth2/v2.0/authorize",
          token_endpoint: "https://login.microsoftonline.com/example/oauth2/v2.0/token",
          jwks_uri: "https://login.microsoftonline.com/example/discovery/v2.0/keys",
        }),
      );
      return;
    }

    if (req.url === "/mcp" && req.method === "POST") {
      res.writeHead(401, {
        "Content-Type": "application/json",
        "WWW-Authenticate":
          'Bearer realm="demo", resource_metadata="http://127.0.0.1/.well-known/oauth-protected-resource"',
      });
      res.end(
        JSON.stringify({
          error: "unauthorized",
          resource_metadata: "http://127.0.0.1/.well-known/oauth-protected-resource",
        }),
      );
      return;
    }

    if (req.url === "/api/sample-status") {
      res.writeHead(401, {
        "Content-Type": "application/json",
        "WWW-Authenticate":
          'Bearer realm="demo", resource_metadata="http://127.0.0.1/.well-known/oauth-protected-resource"',
      });
      res.end(
        JSON.stringify({
          error: "unauthorized",
          resource_metadata: "http://127.0.0.1/.well-known/oauth-protected-resource",
        }),
      );
      return;
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();
  assert.ok(address && typeof address === "object");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const { stdout } = await execFileAsync(
      process.execPath,
      [path.resolve("dist", "index.js"), "verify", baseUrl],
      {
        cwd: path.resolve("."),
        encoding: "utf8",
      },
    );

    assert.match(stdout, /PASS Protected resource metadata/);
    assert.match(stdout, /PASS Authorization server metadata/);
    assert.match(stdout, /PASS MCP unauthenticated challenge/);
    assert.match(stdout, /PASS Sample REST unauthenticated challenge/);
    assert.match(stdout, /Overall: PASS/);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(undefined);
      });

      server.closeAllConnections();
    });
  }
});
