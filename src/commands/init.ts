import { execSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import prompts, { type PromptObject } from "prompts";
import type { Command } from "commander";
import {
  DEFAULT_SCAFFOLD_VALUES,
  coerceBooleanOption,
  normalizeBasePath,
} from "../scaffold/defaults";
import { generateProject } from "../scaffold/generate";
import type { InitAnswers, InitCommandOptions } from "../scaffold/types";

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .argument("[directory]", "directory for the generated Azure Functions project")
    .description("Generate an Azure Functions MCP server with auth metadata and token validation.")
    .option("--project-name <name>", "generated project name")
    .option("--tenant-id <tenantId>", "Microsoft Entra tenant ID")
    .option("--client-id <clientId>", "application/client ID")
    .option("--audience <audience>", "application ID URI or expected audience")
    .option("--scope <scope>", "required delegated scope or app role")
    .option("--base-path <basePath>", "base path that prefixes the MCP route")
    .option("--sample-endpoint <value>", "generate a sample protected MCP tool", parseBooleanOption)
    .option("--install <value>", "install dependencies after generation", parseBooleanOption)
    .option("--skip-install", "skip dependency installation")
    .option("--yes", "accept defaults for any missing prompt values")
    .action(async (directory: string | undefined, options: InitCommandOptions) => {
      const answers = await resolveAnswers(directory, options);
      await generateProject(answers);

      if (answers.installDependencies) {
        console.log("\nInstalling generated app dependencies...");
        execSync("npm install", {
          cwd: answers.targetDirectory,
          stdio: "inherit",
        });
      }

      console.log(`\nScaffolded ${answers.projectName} at ${answers.targetDirectory}`);
      console.log(`Next: cd ${answers.targetDirectory} && npm start`);
    });
}

function parseBooleanOption(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "y"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "n"].includes(normalized)) {
    return false;
  }

  throw new Error(`Expected a boolean value but received "${value}".`);
}

async function resolveAnswers(
  directory: string | undefined,
  options: InitCommandOptions,
): Promise<InitAnswers> {
  const fallbackDirectoryName = directory ?? options.projectName ?? DEFAULT_SCAFFOLD_VALUES.projectName;
  const initialTargetDirectory = path.resolve(process.cwd(), fallbackDirectoryName);
  const defaultProjectName = path.basename(initialTargetDirectory);

  const installDependencies =
    options.skipInstall === true
      ? false
      : coerceBooleanOption(options.install, DEFAULT_SCAFFOLD_VALUES.installDependencies);

  const baseValues: InitAnswers = {
    projectName: options.projectName ?? defaultProjectName,
    tenantId: options.tenantId ?? DEFAULT_SCAFFOLD_VALUES.tenantId,
    clientId: options.clientId ?? DEFAULT_SCAFFOLD_VALUES.clientId,
    audience: options.audience ?? DEFAULT_SCAFFOLD_VALUES.audience,
    scope: options.scope ?? DEFAULT_SCAFFOLD_VALUES.scope,
    basePath: normalizeBasePath(options.basePath ?? DEFAULT_SCAFFOLD_VALUES.basePath),
    includeSampleTool: coerceBooleanOption(
      options.sampleEndpoint,
      DEFAULT_SCAFFOLD_VALUES.includeSampleTool,
    ),
    installDependencies,
    targetDirectory: initialTargetDirectory,
  };

  if (options.yes) {
    if (existsSync(baseValues.targetDirectory) && readdirSync(baseValues.targetDirectory).length > 0) {
      throw new Error(`Target directory is not empty: ${baseValues.targetDirectory}`);
    }

    return baseValues;
  }

  const questions: PromptObject[] = [
    {
      type: options.projectName ? null : "text",
      name: "projectName",
      message: "Project name",
      initial: baseValues.projectName,
      validate: requireText,
    },
    {
      type: options.tenantId ? null : "text",
      name: "tenantId",
      message: "Entra tenant ID",
      initial: baseValues.tenantId,
      validate: requireText,
    },
    {
      type: options.clientId ? null : "text",
      name: "clientId",
      message: "App/client ID",
      initial: baseValues.clientId,
      validate: requireText,
    },
    {
      type: options.audience ? null : "text",
      name: "audience",
      message: "Audience / Application ID URI",
      initial: baseValues.audience,
      validate: requireText,
    },
    {
      type: options.scope ? null : "text",
      name: "scope",
      message: "Required scope or app role",
      initial: baseValues.scope,
      validate: requireText,
    },
    {
      type: options.basePath ? null : "text",
      name: "basePath",
      message: "Base path (leave empty for root)",
      initial: baseValues.basePath,
      format: normalizeBasePath,
    },
    {
      type: options.sampleEndpoint === undefined ? "toggle" : null,
      name: "includeSampleTool",
      message: "Generate a sample protected MCP tool?",
      initial: baseValues.includeSampleTool,
      active: "yes",
      inactive: "no",
    },
    {
      type: options.install === undefined && options.skipInstall !== true ? "toggle" : null,
      name: "installDependencies",
      message: "Install generated app dependencies now?",
      initial: baseValues.installDependencies,
      active: "yes",
      inactive: "no",
    },
  ];

  const responses = await prompts(questions, {
    onCancel: () => {
      throw new Error("Scaffold cancelled.");
    },
  });

  const projectName = (responses.projectName as string | undefined) ?? baseValues.projectName;
  const targetDirectory =
    directory !== undefined || options.projectName !== undefined
      ? initialTargetDirectory
      : path.resolve(process.cwd(), projectName);

  if (existsSync(targetDirectory) && readdirSync(targetDirectory).length > 0) {
    throw new Error(`Target directory is not empty: ${targetDirectory}`);
  }

  return {
    ...baseValues,
    ...responses,
    projectName,
    tenantId: (responses.tenantId as string | undefined) ?? baseValues.tenantId,
    clientId: (responses.clientId as string | undefined) ?? baseValues.clientId,
    audience: (responses.audience as string | undefined) ?? baseValues.audience,
    scope: (responses.scope as string | undefined) ?? baseValues.scope,
    basePath: normalizeBasePath((responses.basePath as string | undefined) ?? baseValues.basePath),
    includeSampleTool:
      (responses.includeSampleTool as boolean | undefined) ?? baseValues.includeSampleTool,
    installDependencies:
      (responses.installDependencies as boolean | undefined) ?? baseValues.installDependencies,
    targetDirectory,
  };
}

function requireText(value: string): true | string {
  return value.trim().length > 0 ? true : "This value is required.";
}
