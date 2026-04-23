import type { Command } from "commander";
import { verifyServer } from "../verify/run";

interface VerifyCommandOptions {
  mcpRoute?: string;
  sampleRoute?: string;
  json?: boolean;
}

export function registerVerifyCommand(program: Command): void {
  program
    .command("verify")
    .argument("<baseUrl>", "base URL of the running Azure Functions MCP server")
    .description("Check metadata endpoints and unauthenticated challenge behavior for a running server.")
    .option("--mcp-route <path>", "route path for the MCP endpoint", "/mcp")
    .option("--sample-route <path>", "route path for the protected sample REST endpoint", "/api/sample-status")
    .option("--json", "emit machine-readable JSON output")
    .action(async (baseUrl: string, options: VerifyCommandOptions) => {
      const result = await verifyServer(baseUrl, {
        mcpRoute: options.mcpRoute ?? "/mcp",
        sampleRoute: options.sampleRoute ?? "/api/sample-status",
      });

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        printSummary(result);
      }

      if (!result.ok) {
        throw new Error("Verification failed.");
      }
    });
}

function printSummary(result: Awaited<ReturnType<typeof verifyServer>>): void {
  console.log(`Verifying ${result.baseUrl}\n`);

  for (const check of result.checks) {
    const prefix = check.ok ? "PASS" : "FAIL";
    const status = check.status === null ? "no response" : check.status;
    console.log(`${prefix} ${check.name} (${status})`);

    for (const detail of check.details) {
      console.log(`  ${detail}`);
    }
  }

  console.log(`\nOverall: ${result.ok ? "PASS" : "FAIL"}`);
}
