# mcp-auth-scaffold

`mcp-auth-scaffold` is a Node.js + TypeScript CLI that generates an Azure Functions custom-handler MCP server with Microsoft Entra-aware auth plumbing already wired in.

## What it does

- creates a fresh Azure Functions project
- injects `401` challenge handling with `WWW-Authenticate`
- exposes `/.well-known/oauth-protected-resource`
- exposes `/.well-known/oauth-authorization-server`
- validates bearer tokens against Microsoft Entra JWKS
- generates a protected MCP endpoint plus a protected REST smoke-test route

## Usage

```bash
npm install
npm run build
node dist/index.js init D:\my-secure-mcp-server
```

For non-interactive scaffolding:

```bash
node dist/index.js init D:\my-secure-mcp-server --yes --skip-install
```

## Prompts captured by `init`

- project name
- tenant ID
- app/client ID
- audience / application ID URI
- scope or app role
- base path
- whether to include a sample protected MCP tool

## Generated project shape

- `host.json` and `function-route/function.json` for Azure Functions custom-handler hosting
- `src/auth/*` helpers for challenge, metadata, middleware, and JWT validation
- `src/index.ts` wrapping the MCP endpoint
- `.env.example` and `local.settings.json`
- generated app README with Azure setup instructions

## Scripts

- `npm run build`
- `npm test`
