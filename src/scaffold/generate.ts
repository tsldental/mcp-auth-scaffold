import { mkdirSync } from "node:fs";
import path from "node:path";
import type { InitAnswers, TemplateContext } from "./types";
import { copyTemplateDirectory } from "./render";

export async function generateProject(answers: InitAnswers): Promise<void> {
  const context = createTemplateContext(answers);
  const templateRoot = resolveTemplateRoot();
  const templateDirectory = path.join(templateRoot, "azure-functions-custom-handler");

  mkdirSync(answers.targetDirectory, { recursive: true });
  copyTemplateDirectory(templateDirectory, answers.targetDirectory, context);
}

function resolveTemplateRoot(): string {
  return path.resolve(__dirname, "..", "templates");
}

function createTemplateContext(answers: InitAnswers): TemplateContext {
  const mcpRoute = `${answers.basePath}/mcp` || "/mcp";
  const sampleRestRoute = `${answers.basePath}/api/sample-status` || "/api/sample-status";
  const basePathWithoutLeadingSlash = answers.basePath.replace(/^\//, "");

  return {
    PROJECT_NAME: answers.projectName,
    TENANT_ID: answers.tenantId,
    CLIENT_ID: answers.clientId,
    AUDIENCE: answers.audience,
    SCOPE: answers.scope,
    BASE_PATH: answers.basePath,
    BASE_PATH_WITHOUT_LEADING_SLASH: basePathWithoutLeadingSlash,
    MCP_ROUTE: mcpRoute,
    SAMPLE_REST_ROUTE: sampleRestRoute,
    SERVER_NAME: answers.projectName,
    SAMPLE_TOOL_REGISTRATION: answers.includeSampleTool
      ? buildSampleToolRegistration()
      : "  // No sample tool was generated. Add server.tool(...) registrations here.\n",
    SAMPLE_TOOL_README: answers.includeSampleTool
      ? "- `get-ski-conditions` sample MCP tool so you can validate the secured handshake immediately."
      : "- no sample MCP tool by default; add your own `server.tool(...)` registrations in `src/index.ts`.",
  };
}

function buildSampleToolRegistration(): string {
  return [
    "  server.tool(",
    '    \"get-ski-conditions\",',
    '    \"Return mock ski conditions for a given resort name.\",',
    "    {",
    '      resort: z.string().min(2).describe(\"Name of the ski resort to check.\"),',
    "    },",
    "    async ({ resort }) => ({",
    "      content: [",
    "        {",
    '          type: \"text\",',
    "          text: JSON.stringify(",
    "            {",
    "              resort,",
    '              status: \"open\",',
    '              powderDepthInches: 11,',
    '              liftStatus: \"all lifts spinning\",',
    '              advisory: \"Fresh snow overnight. Avalanche review complete.\",',
    "            },",
    "            null,",
    "            2,",
    "          ),",
    "        },",
    "      ],",
    "    }),",
    "  );",
    "",
  ].join("\n");
}
