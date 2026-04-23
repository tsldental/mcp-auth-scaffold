# {{PROJECT_NAME}}

This project was scaffolded by `mcp-auth-scaffold` to wrap a Node.js MCP server for Azure Functions custom-handler hosting with Microsoft Entra-aware auth plumbing.

## What is included

- `401 Unauthorized` challenge responses with `WWW-Authenticate` metadata for MCP/OAuth discovery.
- `/.well-known/oauth-protected-resource` and `/.well-known/oauth-authorization-server` endpoints.
- JWT bearer token validation against Microsoft Entra issuer metadata and JWKS.
- A protected MCP endpoint at `{{MCP_ROUTE}}`.
- A protected REST smoke-test endpoint at `{{SAMPLE_REST_ROUTE}}`.
{{SAMPLE_TOOL_README}}

## Install

```bash
npm install
```

## Run locally

1. Review `local.settings.json` and replace placeholder tenant, audience, and scope values if needed.
2. Install [Azure Functions Core Tools](https://learn.microsoft.com/azure/azure-functions/functions-run-local).
3. Start the app:

   ```bash
   npm start
   ```

4. The MCP endpoint will be available through Azure Functions at:

   ```text
   http://localhost:7071{{MCP_ROUTE}}
   ```

## Required Azure / Entra setup

You still need to finish the tenant-side configuration that only Azure can perform:

1. Register or reuse an Entra application for this protected resource.
2. Set the Application ID URI to match `AZURE_AUDIENCE`.
3. Expose the `AZURE_SCOPE` scope or an equivalent app role.
4. Grant consent to the client application or test client that will call this server.
5. Configure the same app settings in Azure Functions when you deploy.

## Auth handshake behavior

When a request hits `{{MCP_ROUTE}}` without a valid bearer token, the server returns:

- `401 Unauthorized`
- `WWW-Authenticate: Bearer ...`
- `resource_metadata="https://<host>/.well-known/oauth-protected-resource"`

That allows MCP-aware clients to discover how to obtain an Entra token before retrying the request.

## Test with MCP-AgentXRay

1. Point MCP-AgentXRay at `http://localhost:7071{{MCP_ROUTE}}`.
2. Send a request without a token and verify the `401` challenge includes `resource_metadata`.
3. Fetch `/.well-known/oauth-protected-resource` and `/.well-known/oauth-authorization-server`.
4. Acquire a token for `{{AUDIENCE}}` with scope `{{SCOPE}}`.
5. Retry with `Authorization: Bearer <token>` and confirm the MCP handshake succeeds.

## Files to review first

- `src/config.ts` - environment loading and Entra endpoint derivation
- `src/auth/challenge.ts` - `WWW-Authenticate` header construction
- `src/auth/prm.ts` - protected resource and auth server metadata
- `src/auth/token.ts` - bearer token extraction and JWT validation
- `src/index.ts` - Express custom handler and MCP wiring
