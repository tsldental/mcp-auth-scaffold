import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { TemplateContext } from "./types";

export function renderTemplateString(template: string, context: TemplateContext): string {
  return template.replace(/\{\{\s*([A-Z0-9_]+)\s*\}\}/g, (_, key: keyof TemplateContext) => {
    const value = context[key];

    if (value === undefined) {
      throw new Error(`Unknown template token: ${String(key)}`);
    }

    return value;
  });
}

export function copyTemplateDirectory(
  sourceDirectory: string,
  targetDirectory: string,
  context: TemplateContext,
): void {
  for (const entry of readdirSync(sourceDirectory)) {
    const sourcePath = path.join(sourceDirectory, entry);
    const outputName = entry === "dot-gitignore" ? ".gitignore" : entry;
    const targetPath = path.join(targetDirectory, outputName);
    const stats = statSync(sourcePath);

    if (stats.isDirectory()) {
      mkdirSync(targetPath, { recursive: true });
      copyTemplateDirectory(sourcePath, targetPath, context);
      continue;
    }

    const content = readFileSync(sourcePath, "utf8");
    const renderedContent = renderTemplateString(content, context);
    mkdirSync(path.dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, renderedContent, "utf8");
  }
}
