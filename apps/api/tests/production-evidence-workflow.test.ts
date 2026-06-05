import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = new URL("../../..", import.meta.url).pathname;

async function withMockHealthServer(
  handler: (request: IncomingMessage, response: ServerResponse) => void,
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("mock server did not bind");
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

async function runNode(args: string[], options: { env?: NodeJS.ProcessEnv } = {}) {
  return await new Promise<{ status: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn("node", args, {
      cwd: repoRoot,
      env: { ...process.env, ...options.env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (status) => resolve({ status, stdout, stderr }));
  });
}

function readText(path: string) {
  return readFileSync(path, "utf8");
}

describe("production evidence collection helper", () => {
  it("collects safe runtime evidence without creating final manifest evidence", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-evidence-collect-"));
    try {
      const evidenceDir = join(tempRoot, "evidence");
      const commitSha = "a".repeat(40);

      await withMockHealthServer((request, response) => {
        if (request.url === "/") {
          response.setHeader("content-type", "text/html");
          response.end('<div id="root"></div><script src="/assets/index.js"></script>');
          return;
        }
        if (request.url === "/assets/index.js") {
          response.setHeader("content-type", "application/javascript");
          response.end("console.log('ok')");
          return;
        }
        if (request.url === "/health") {
          response.setHeader("content-type", "application/json");
          response.end(JSON.stringify({ ok: true }));
          return;
        }
        if (request.url === "/api/app-version") {
          response.setHeader("content-type", "application/json");
          response.end(
            JSON.stringify({
              commitSha,
              buildTime: "2026-05-25T09:00:00.000Z",
              deployedAt: "2026-05-25T10:00:00.000Z",
              packageVersion: "0.1.0",
              environment: "nas",
            }),
          );
          return;
        }
        response.statusCode = 404;
        response.end("not found");
      }, async (baseUrl) => {
        const result = await runNode([
          "scripts/ops-runbook/production-evidence-collect.mjs",
          "--evidence-dir",
          evidenceDir,
          "--base-url",
          baseUrl,
          "--expected-commit",
          commitSha,
        ]);

        expect(result.status).toBe(0);
        expect(result.stdout).toContain("PRODUCTION_EVIDENCE_COLLECTED");
        expect(result.stdout).not.toContain(tempRoot);
        expect(existsSync(join(evidenceDir, "health-check.txt"))).toBe(true);
        expect(existsSync(join(evidenceDir, "app-version.json"))).toBe(true);
        expect(existsSync(join(evidenceDir, "production-go-live-manifest.draft.json"))).toBe(true);
        expect(existsSync(join(evidenceDir, "collection-log.txt"))).toBe(true);
        expect(existsSync(join(evidenceDir, "production-go-live-manifest.json"))).toBe(false);
        expect(readText(join(evidenceDir, "production-go-live-manifest.draft.json"))).toContain('"publicAccess": false');
        expect(readText(join(evidenceDir, "collection-log.txt"))).toContain("expectedCommit matched");
      });
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("blocks repo-inside output, failed health checks, and commit mismatches", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-evidence-collect-block-"));
    try {
      const commitSha = "a".repeat(40);
      const repoInside = await runNode([
        "scripts/ops-runbook/production-evidence-collect.mjs",
        "--evidence-dir",
        join(repoRoot, ".tmp-evidence-collect"),
        "--base-url",
        "http://127.0.0.1:1",
      ]);
      expect(repoInside.status).not.toBe(0);
      expect(repoInside.stderr).toContain("BLOCKED");

      await withMockHealthServer((request, response) => {
        if (request.url === "/") {
          response.statusCode = 500;
          response.end("down");
          return;
        }
        if (request.url === "/api/app-version") {
          response.setHeader("content-type", "application/json");
          response.end(JSON.stringify({ commitSha, buildTime: "x", deployedAt: "x", packageVersion: "0.1.0", environment: "nas" }));
          return;
        }
        response.statusCode = 500;
        response.end("down");
      }, async (baseUrl) => {
        const result = await runNode(["scripts/ops-runbook/production-evidence-collect.mjs", "--evidence-dir", join(tempRoot, "bad-health"), "--base-url", baseUrl]);
        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain("BLOCKED");
      });

      await withMockHealthServer((request, response) => {
        if (request.url === "/") {
          response.setHeader("content-type", "text/html");
          response.end('<div id="root"></div><script src="/assets/index.js"></script>');
          return;
        }
        if (request.url === "/assets/index.js") {
          response.end("ok");
          return;
        }
        if (request.url === "/health") {
          response.end("ok");
          return;
        }
        if (request.url === "/api/app-version") {
          response.setHeader("content-type", "application/json");
          response.end(JSON.stringify({ commitSha, buildTime: "x", deployedAt: "x", packageVersion: "0.1.0", environment: "nas" }));
          return;
        }
        response.statusCode = 404;
        response.end("not found");
      }, async (baseUrl) => {
        const result = await runNode([
          "scripts/ops-runbook/production-evidence-collect.mjs",
          "--evidence-dir",
          join(tempRoot, "mismatch"),
          "--base-url",
          baseUrl,
          "--expected-commit",
          "b".repeat(40),
        ]);
        expect(result.status).not.toBe(0);
        expect(readText(join(tempRoot, "mismatch", "collection-log.txt"))).toContain("BLOCKED");
      });
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});

describe("production cutover and post go-live gates", () => {
  it("validates production cutover checklists", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-cutover-"));
    try {
      const checklist = join(tempRoot, "production-cutover-checklist.md");
      writeFileSync(
        checklist,
        "previousCommitSha: bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\nreleaseCommitSha: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\noperator: ops\napprover: manager\nstartAt: 2026-05-25T09:00:00.000Z\nfinishedAt: 2026-05-25T10:00:00.000Z\ngo/no-go: go\nmigration 已执行时不能只回滚代码\nproduction:health-check\ndocker compose ps\n",
      );
      const pass = await runNode(["scripts/ops-runbook/production-cutover-check.mjs", "--checklist", checklist]);
      expect(pass.status).toBe(0);
      expect(pass.stdout).toContain("PRODUCTION_CUTOVER_CHECK_PASS");

      writeFileSync(checklist, "releaseCommitSha: aaaaaaa\noperator: <operator>\ngo/no-go: no-go\n");
      const fail = await runNode(["scripts/ops-runbook/production-cutover-check.mjs", "--checklist", checklist]);
      expect(fail.status).not.toBe(0);
      expect(fail.stderr).toContain("BLOCKED");
      expect(fail.stderr).toContain("go/no-go");
      expect(fail.stderr).toContain("placeholder");
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("validates post go-live 24h evidence", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-post-24h-"));
    try {
      const evidenceDir = join(tempRoot, "post-go-live-24h");
      mkdirSync(join(evidenceDir, "screenshots"), { recursive: true });
      writeFileSync(
        join(evidenceDir, "post-go-live-24h-check.md"),
        "admin 登录通过\nviewer 登录通过\nexternal_project_site 登录通过\nDashboard 正常\n合同风险正常\n证照健康证正常\n项目点风险台账正常\n库存流水正常\n当日备份成功\n附件下载抽查通过\nP0/P1/P2 异常处理结论\n签核人: manager\n",
      );
      writeFileSync(join(evidenceDir, "health-check.txt"), "PRODUCTION_HEALTH_PASS\n");
      writeFileSync(join(evidenceDir, "app-version.json"), "{}\n");
      writeFileSync(join(evidenceDir, "backup-check.txt"), "当日备份成功\n");
      for (const image of ["dashboard.png", "contracts-risk.png", "certificates-health.png", "project-sites-risk.png", "inventory-movements.png", "audit-log.png"]) {
        writeFileSync(join(evidenceDir, "screenshots", image), "png-placeholder");
      }

      const pass = await runNode(["scripts/ops-runbook/post-go-live-24h-check.mjs", "--evidence-dir", evidenceDir]);
      expect(pass.status).toBe(0);
      expect(pass.stdout).toContain("POST_GO_LIVE_24H_PASS");

      const missing = join(tempRoot, "missing");
      mkdirSync(missing, { recursive: true });
      const fail = await runNode(["scripts/ops-runbook/post-go-live-24h-check.mjs", "--evidence-dir", missing]);
      expect(fail.status).not.toBe(0);
      expect(fail.stderr).toContain("post-go-live-24h-check.md");
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});

describe("production evidence template consistency", () => {
  it("keeps template placeholders aligned with go-live required files without fake PASS files", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "company-erp-template-consistency-"));
    try {
      const output = join(tempRoot, "evidence");
      const templateModule = (await import(pathToFileURL(join(repoRoot, "scripts/ops-runbook/create-go-live-evidence-template.mjs")).href)) as {
        createTemplates: (outputDir: string) => { status: string };
      };
      const checkModule = (await import(pathToFileURL(join(repoRoot, "scripts/ops-runbook/production-go-live-check.mjs")).href)) as {
        requiredGoLiveEvidenceFiles: string[];
        requiredGoLiveManifestFields: string[];
      };
      expect(templateModule.createTemplates(output).status).toBe("GO_LIVE_EVIDENCE_TEMPLATE_CREATED");

      for (const relativePath of checkModule.requiredGoLiveEvidenceFiles) {
        if (relativePath.startsWith("restore-drill/")) {
          expect(existsSync(join(output, "restore-drill/README.md")), relativePath).toBe(true);
          continue;
        }
        if (relativePath === "production-go-live-manifest.json") {
          expect(existsSync(join(output, "production-go-live-manifest.example.json")), relativePath).toBe(true);
          continue;
        }
        if (relativePath.endsWith(".md")) {
          expect(
            existsSync(join(output, relativePath.replace(/\.md$/, ".template.md"))) || existsSync(join(output, relativePath)),
            relativePath,
          ).toBe(true);
          continue;
        }
        expect(existsSync(join(output, relativePath.replace(/\.[^.]+$/, ".README.md"))), relativePath).toBe(true);
      }

      const manifestExample = JSON.parse(readText(join(output, "production-go-live-manifest.example.json"))) as Record<string, unknown>;
      for (const field of checkModule.requiredGoLiveManifestFields) {
        expect(manifestExample).toHaveProperty(field);
      }
      const commands = readText(join(output, "commands.md"));
      expect(commands).toContain("production:go-live-check");
      expect(commands).toContain("production:health-check");
      expect(commands).toContain("access:review-check");
      expect(commands).toContain("audit:verify-export");
      for (const fakePass of [
        "pilot-ready.txt",
        "production-ready.txt",
        "import-pilot-check.txt",
        "import-pilot-smoke.txt",
        "access-review-check.txt",
        "attachment-production-check.txt",
      ]) {
        expect(existsSync(join(output, fakePass)), fakePass).toBe(false);
      }
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
