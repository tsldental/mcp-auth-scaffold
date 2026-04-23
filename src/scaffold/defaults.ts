export const DEFAULT_SCAFFOLD_VALUES = {
  projectName: "secure-functions-mcp-server",
  tenantId: "00000000-0000-0000-0000-000000000000",
  clientId: "11111111-1111-1111-1111-111111111111",
  audience: "api://11111111-1111-1111-1111-111111111111",
  scope: "Mcp.Access",
  basePath: "",
  includeSampleTool: true,
  installDependencies: true,
} as const;

export function normalizeBasePath(value: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0 || trimmed === "/") {
    return "";
  }

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+$/, "");
}

export function coerceBooleanOption(value: boolean | undefined, fallback: boolean): boolean {
  return value === undefined ? fallback : value;
}
