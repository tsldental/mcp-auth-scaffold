export interface InitCommandOptions {
  projectName?: string;
  tenantId?: string;
  clientId?: string;
  audience?: string;
  scope?: string;
  basePath?: string;
  sampleEndpoint?: boolean;
  install?: boolean;
  skipInstall?: boolean;
  yes?: boolean;
}

export interface InitAnswers {
  projectName: string;
  tenantId: string;
  clientId: string;
  audience: string;
  scope: string;
  basePath: string;
  includeSampleTool: boolean;
  installDependencies: boolean;
  targetDirectory: string;
}

export interface TemplateContext {
  PROJECT_NAME: string;
  PROJECT_SLUG: string;
  ENTRA_APP_DISPLAY_NAME: string;
  TENANT_ID: string;
  CLIENT_ID: string;
  AUDIENCE: string;
  SCOPE: string;
  BASE_PATH: string;
  BASE_PATH_WITHOUT_LEADING_SLASH: string;
  MCP_ROUTE: string;
  SAMPLE_REST_ROUTE: string;
  SERVER_NAME: string;
  SAMPLE_TOOL_REGISTRATION: string;
  SAMPLE_TOOL_README: string;
}
