import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";

test("init generates a secure Azure Functions MCP scaffold", () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "mcp-auth-scaffold-"));
  const outputDirectory = path.join(tempRoot, "generated-server");

  try {
    execFileSync(
      process.execPath,
      [
        path.resolve("dist", "index.js"),
        "init",
        outputDirectory,
        "--yes",
        "--skip-install",
      ],
      {
        cwd: path.resolve("."),
        stdio: "pipe",
      },
    );

    const generatedIndex = readFileSync(path.join(outputDirectory, "src", "index.ts"), "utf8");
    const generatedChallenge = readFileSync(
      path.join(outputDirectory, "src", "auth", "challenge.ts"),
      "utf8",
    );
    const generatedReadme = readFileSync(path.join(outputDirectory, "README.md"), "utf8");
    const generatedLocalSettings = readFileSync(
      path.join(outputDirectory, "local.settings.json"),
      "utf8",
    );
    const generatedPrm = readFileSync(path.join(outputDirectory, "src", "auth", "prm.ts"), "utf8");
    const generatedConfig = readFileSync(path.join(outputDirectory, "src", "config.ts"), "utf8");

    assert.equal(existsSync(path.join(outputDirectory, "host.json")), true);
    assert.equal(existsSync(path.join(outputDirectory, "function-route", "function.json")), true);
    assert.match(generatedIndex, /\.well-known\/oauth-protected-resource/);
    assert.match(generatedChallenge, /WWW-Authenticate/);
    assert.match(generatedChallenge, /realm=/);
    assert.match(generatedIndex, /get-ski-conditions/);
    assert.match(generatedReadme, /MCP-AgentXRay/);
    assert.match(generatedReadme, /node dist\/index\.js verify http:\/\/localhost:7071/);
    assert.match(generatedLocalSettings, /AZURE_TENANT_ID/);
    assert.match(generatedPrm, /code_challenge_methods_supported/);
    assert.match(generatedConfig, /codeChallengeMethodsSupported/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
