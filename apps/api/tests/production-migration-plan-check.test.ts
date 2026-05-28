import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = new URL("../../..", import.meta.url).pathname;

const validPlan =
  "# Production Migration Plan\n\n" +
  "数据库迁移一旦执行，不能只回滚代码。\n\n" +
  `releaseCommitSha: ${"a".repeat(40)}\n` +
  `previousCommitSha: ${"b".repeat(40)}\n` +
  "migration directories: database/migrations\n" +
  "是否包含 schema change: 否\n" +
  "是否包含 data backfill: 否\n" +
  "是否可逆: 是\n" +
  "restore point: 不适用\n" +
  "迁移前数据库备份: backup-2026-05-25\n" +
  "迁移后验证 SQL 或验证步骤: SELECT 1;\n" +
  "migration output: /tmp/migration-output.log\n" +
  "rollback strategy: 使用 previousCommitSha 代码版本和数据库备份恢复\n";

async function importMigrationPlanCheck() {
  const module = (await import(
    pathToFileURL(join(repoRoot, "scripts/production-migration-plan-check.mjs")).href
  )) as {
    evaluateProductionMigrationPlan: (options: { text: string }) => {
      status: string;
      blockers: string[];
      releaseCommitSha: string;
      previousCommitSha: string;
      isReversible: string;
      hasDataBackfill: string;
    };
  };
  return module;
}

describe("production-migration-plan-check fixture gate", () => {
  it("accepts a valid migration plan", async () => {
    const { evaluateProductionMigrationPlan } = await importMigrationPlanCheck();

    const result = evaluateProductionMigrationPlan({ text: validPlan });

    expect(result.status).toBe("PRODUCTION_MIGRATION_PLAN_PASS");
    expect(result.blockers).toHaveLength(0);
    expect(result.releaseCommitSha).toBe("a".repeat(40));
    expect(result.isReversible).toBe("是");
  });

  it("blocks irreversible migration without restore point", async () => {
    const { evaluateProductionMigrationPlan } = await importMigrationPlanCheck();
    const plan = validPlan.replace("是否可逆: 是", "是否可逆: 否").replace("restore point: 不适用\n", "");

    const result = evaluateProductionMigrationPlan({ text: plan });

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers.join("\n")).toContain("restore point");
  });

  it("blocks data backfill without verification steps", async () => {
    const { evaluateProductionMigrationPlan } = await importMigrationPlanCheck();
    const plan = validPlan
      .replace("是否包含 data backfill: 否", "是否包含 data backfill: 是")
      .replace("迁移后验证 SQL 或验证步骤: SELECT 1;\n", "");

    const result = evaluateProductionMigrationPlan({ text: plan });

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers.join("\n")).toContain("迁移后验证 SQL 或验证步骤");
  });

  it("blocks missing rollback strategy", async () => {
    const { evaluateProductionMigrationPlan } = await importMigrationPlanCheck();
    const plan = validPlan.replace("rollback strategy: 使用 previousCommitSha 代码版本和数据库备份恢复", "rollback strategy:");

    const result = evaluateProductionMigrationPlan({ text: plan });

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers.join("\n")).toContain("rollback strategy");
  });

  it("blocks template placeholder values", async () => {
    const { evaluateProductionMigrationPlan } = await importMigrationPlanCheck();
    const plan = validPlan.replace(`releaseCommitSha: ${"a".repeat(40)}`, "releaseCommitSha: <release-commit-sha>");

    const result = evaluateProductionMigrationPlan({ text: plan });

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers.join("\n")).toContain("placeholder");
  });

  it("blocks missing required marker", async () => {
    const { evaluateProductionMigrationPlan } = await importMigrationPlanCheck();
    const plan = validPlan.replace("数据库迁移一旦执行，不能只回滚代码。\n\n", "");

    const result = evaluateProductionMigrationPlan({ text: plan });

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers.join("\n")).toContain("数据库迁移一旦执行，不能只回滚代码");
  });

  it("--json outputs parseable JSON for blocked case", () => {
    const result = spawnSync(
      "node",
      [join(repoRoot, "scripts/production-migration-plan-check.mjs"), "--plan", "/nonexistent/path.md", "--json"],
      { cwd: repoRoot, encoding: "utf8" },
    );

    const parsed = JSON.parse(result.stdout);
    expect(parsed.status).toBe("BLOCKED");
  });
});
