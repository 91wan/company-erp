#!/usr/bin/env node
/**
 * P2-2: NAS 试点前导入前置检查脚本
 * 用法: npm run import:pilot-check
 * 不需要连接真实数据库 — 全部为静态检查
 */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const apiSrc = join(root, "apps/api/src");

let passed = 0;
let failed = 0;

function check(label, fn) {
  try {
    const result = fn();
    if (result !== false) {
      console.log(`  ✓ ${label}`);
      passed++;
    } else {
      console.error(`  ✗ ${label}`);
      failed++;
    }
  } catch (err) {
    console.error(`  ✗ ${label}: ${err.message}`);
    failed++;
  }
}

function readSrc(relPath) {
  return readFileSync(join(apiSrc, relPath), "utf8");
}

console.log("\n─── NAS 试点导入前置检查 ───\n");

// 1. IMPORT_TEMPLATE_DEFINITIONS 八个模板均存在
check("importTemplates.ts 定义了全部 8 个模板", () => {
  const src = readSrc("importTemplates.ts");
  const required = ["parties", "materials", "employees", "project_sites", "opening_inventory",
    "contracts", "project_site_roster_people", "health_certificates"];
  for (const t of required) {
    // keys can appear as "parties": or parties: (unquoted)
    if (!src.includes(`"${t}"`) && !src.includes(`${t}:`)) throw new Error(`缺少模板 ${t}`);
  }
});

// 2. health_certificates 不含旧字段
check("health_certificates 模板不含身份证后四位/健康证编号/发证机关", () => {
  const src = readSrc("importTemplates.ts");
  const start = Math.max(src.indexOf('"health_certificates"'), src.indexOf("health_certificates:"));
  const end = src.indexOf("};", start);
  const block = src.slice(start, end);
  // Check in headers array only (not instructions)
  const headersMatch = block.match(/headers:\s*\[([^\]]+)\]/);
  const headersStr = headersMatch ? headersMatch[1] : "";
  if (headersStr.includes("健康证编号")) throw new Error("健康证编号 出现在 health_certificates headers");
  if (headersStr.includes("发证机关")) throw new Error("发证机关 出现在 health_certificates headers");
});

// 3. 图片文件名存在于 health_certificates 模板
check("health_certificates 包含图片文件名字段", () => {
  const src = readSrc("importTemplates.ts");
  const start = Math.max(src.indexOf('"health_certificates"'), src.indexOf("health_certificates:"));
  const end = src.indexOf("};", start);
  const block = src.slice(start, end);
  if (!block.includes("图片文件名")) throw new Error("health_certificates 缺少图片文件名字段");
});

// 4. isSensitiveImportField 包含授权
check("isSensitiveImportField 包含授权中文敏感模式", () => {
  const src = readSrc("importJobRoutes.ts");
  if (!src.includes("授权")) throw new Error("importJobRoutes.ts 缺少授权敏感词");
  if (!src.includes("isSensitiveImportField")) throw new Error("缺少 isSensitiveImportField 函数");
});

// 5. error-report 生成失败有 500 保护
check("error-report 路由有生成失败保护 (IMPORT_REPORT_GENERATION_FAILED)", () => {
  const src = readSrc("importJobRoutes.ts");
  if (!src.includes("IMPORT_REPORT_GENERATION_FAILED")) throw new Error("缺少 IMPORT_REPORT_GENERATION_FAILED 错误处理");
});

// 6. 错误报告 XLSX 有冻结行
check("error-report XLSX 有 views freeze (header row frozen)", () => {
  const src = readSrc("importJobRoutes.ts");
  if (!src.includes("frozen")) throw new Error("问题行 sheet 未设置冻结行");
});

// 7. docs/import/pilot-import-runbook.md 存在
check("docs/import/pilot-import-runbook.md 存在", () => {
  if (!existsSync(join(root, "docs/import/pilot-import-runbook.md"))) {
    throw new Error("缺少 pilot-import-runbook.md");
  }
});

// 8. docs/import/nas-pilot-import-drill.md 存在
check("docs/import/nas-pilot-import-drill.md 存在", () => {
  if (!existsSync(join(root, "docs/import/nas-pilot-import-drill.md"))) {
    throw new Error("缺少 nas-pilot-import-drill.md");
  }
});

// 9. nas-pilot-import-drill.md 包含不能回滚说明
check("nas-pilot-import-drill.md 包含不能回滚说明", () => {
  const src = readFileSync(join(root, "docs/import/nas-pilot-import-drill.md"), "utf8");
  if (!src.includes("不支持导入回滚") && !src.includes("不能回滚")) {
    throw new Error("缺少不能回滚说明");
  }
});

// 10. ExcelImportWorkspace 存在
check("ExcelImportWorkspace 组件存在", () => {
  if (!existsSync(join(root, "apps/web/src/components/excel-import/ExcelImportWorkspace.tsx"))) {
    throw new Error("ExcelImportWorkspace 不存在");
  }
});

// 11. BasicDataWorkspace 存在
check("BasicDataWorkspace 组件存在（P0-1）", () => {
  if (!existsSync(join(root, "apps/web/src/components/basic-data/BasicDataWorkspace.tsx"))) {
    throw new Error("BasicDataWorkspace 不存在");
  }
});

// 12. InventoryWorkspace 包含 movements tab
check("InventoryWorkspace 包含 movements tab", () => {
  const src = readFileSync(join(root, "apps/web/src/components/InventoryWorkspace.tsx"), "utf8");
  if (!src.includes('"movements"') && !src.includes("movements")) throw new Error("缺少 movements tab");
});

// 13. buildNavigationIntent 不再全部跳 inbound
check("ImportRowsTab buildNavigationIntent 对 opening 不返回 inbound", () => {
  const src = readFileSync(
    join(root, "apps/web/src/components/excel-import/ImportRowsTab.tsx"), "utf8"
  );
  const idx = src.indexOf("inventoryMovement");
  if (idx < 0) throw new Error("缺少 inventoryMovement case");
  const block = src.slice(idx, idx + 300);
  if (block.includes('"inbound"') && !block.includes("movements")) {
    throw new Error("inventoryMovement 仍然固定跳 inbound，应改为 movements");
  }
});

console.log(`\n─── 结果：${passed} 通过 / ${failed} 失败 ───\n`);
if (failed > 0) {
  process.exit(1);
}
