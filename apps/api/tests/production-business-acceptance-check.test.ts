import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = new URL("../../..", import.meta.url).pathname;

async function importBusinessAcceptanceCheck() {
  const module = (await import(
    pathToFileURL(join(repoRoot, "scripts/production-business-acceptance-check.mjs")).href
  )) as {
    evaluateBusinessAcceptance: (opts: { text?: string; acceptancePath?: string }) => {
      status: string;
      blockers: string[];
      owner: string;
      acceptanceDate: string;
    };
  };
  return module;
}

const validAcceptance =
  "- 业务负责人: 张三\n" +
  "- 验收日期: 2026-05-25\n" +
  "- Dashboard: 通过\n" +
  "- 项目点风险台账: 通过\n" +
  "- 项目点现场人员: 通过\n" +
  "- 健康证: 通过\n" +
  "- 合同到期提醒: 通过\n" +
  "- 库存流水: 通过\n" +
  "- Excel 导入试点复核: 通过\n" +
  "- 权限复核: 通过\n" +
  "- P0 未解决问题数量: 0\n" +
  "批准进入公司内网正式上线\n";

describe("production-business-acceptance-check fixture gate", () => {
  it("PASS with valid acceptance document", async () => {
    const { evaluateBusinessAcceptance } = await importBusinessAcceptanceCheck();
    const result = evaluateBusinessAcceptance({ text: validAcceptance });

    expect(result.status).toBe("PRODUCTION_BUSINESS_ACCEPTANCE_PASS");
    expect(result.blockers).toHaveLength(0);
    expect(result.owner).toBe("张三");
    expect(result.acceptanceDate).toBe("2026-05-25");
  });

  it("BLOCKED when P0 unresolved count is > 0", async () => {
    const { evaluateBusinessAcceptance } = await importBusinessAcceptanceCheck();
    const text = validAcceptance.replace("P0 未解决问题数量: 0", "P0 未解决问题数量: 2");
    const result = evaluateBusinessAcceptance({ text });

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers.join("\n")).toContain("P0 未解决问题数量");
  });

  it("BLOCKED when 健康证 acceptance item is missing", async () => {
    const { evaluateBusinessAcceptance } = await importBusinessAcceptanceCheck();
    const text = validAcceptance.replace("- 健康证: 通过\n", "");
    const result = evaluateBusinessAcceptance({ text });

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers.join("\n")).toContain("健康证");
  });

  it("BLOCKED when an acceptance item is 不通过", async () => {
    const { evaluateBusinessAcceptance } = await importBusinessAcceptanceCheck();
    const text = validAcceptance.replace("- 库存流水: 通过", "- 库存流水: 不通过");
    const result = evaluateBusinessAcceptance({ text });

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers.join("\n")).toContain("库存流水");
    expect(result.blockers.join("\n")).toContain("不通过");
  });

  it("BLOCKED when 业务负责人 is missing", async () => {
    const { evaluateBusinessAcceptance } = await importBusinessAcceptanceCheck();
    const text = validAcceptance.replace("- 业务负责人: 张三\n", "");
    const result = evaluateBusinessAcceptance({ text });

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers.join("\n")).toContain("业务负责人");
  });

  it("BLOCKED when 批准进入公司内网正式上线 is missing", async () => {
    const { evaluateBusinessAcceptance } = await importBusinessAcceptanceCheck();
    const text = validAcceptance.replace("批准进入公司内网正式上线\n", "");
    const result = evaluateBusinessAcceptance({ text });

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers.join("\n")).toContain("批准进入公司内网正式上线");
  });

  it("BLOCKED when template placeholder values remain", async () => {
    const { evaluateBusinessAcceptance } = await importBusinessAcceptanceCheck();
    const text = validAcceptance.replace("张三", "<owner-name>");
    const result = evaluateBusinessAcceptance({ text });

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers.join("\n")).toContain("placeholder");
  });

  it("--json outputs parseable JSON for blocked case", () => {
    const result = spawnSync(
      "node",
      [join(repoRoot, "scripts/production-business-acceptance-check.mjs"), "--acceptance", "/nonexistent/path.md", "--json"],
      { cwd: repoRoot, encoding: "utf8" },
    );

    const parsed = JSON.parse(result.stdout);
    expect(parsed.status).toBe("BLOCKED");
  });

  it("--json outputs parseable JSON for valid case (text via direct import)", async () => {
    const { evaluateBusinessAcceptance } = await importBusinessAcceptanceCheck();
    const result = evaluateBusinessAcceptance({ text: validAcceptance });

    const serialized = JSON.stringify(result);
    const parsed = JSON.parse(serialized);
    expect(parsed.status).toBe("PRODUCTION_BUSINESS_ACCEPTANCE_PASS");
  });
});
