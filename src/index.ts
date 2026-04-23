#!/usr/bin/env node

import { Command } from "commander";
import { registerInitCommand } from "./commands/init";

const program = new Command();

program
  .name("mcp-auth-scaffold")
  .description("Scaffold Azure Functions MCP servers with Entra-aware auth plumbing.")
  .version("0.1.0");

registerInitCommand(program);

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unexpected scaffold failure.";
  console.error(`\n${message}`);
  process.exit(1);
});
