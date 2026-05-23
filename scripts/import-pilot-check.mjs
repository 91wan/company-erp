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
const webSrc = join(root, "apps/web/src");

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

function readWeb(relPath) {
  return readFileSync(join(webSrc, relPath), "utf8");
}

console.log("\n─── NAS 试点导入前置检查 ───\n");

check("package.json 定义 import:pilot-check 和 import:pilot-smoke", () => {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  if (pkg.scripts?.["import:pilot-check"] !== "node scripts/import-pilot-check.mjs") {
    throw new Error("package.json 缺少 import:pilot-check");
  }
  if (pkg.scripts?.["import:pilot-smoke"] !== "node scripts/import-pilot-smoke.mjs") {
    throw new Error("package.json 缺少 import:pilot-smoke");
  }
});

check("import:pilot-smoke 脚本存在", () => {
  if (!existsSync(join(root, "scripts/import-pilot-smoke.mjs"))) {
    throw new Error("缺少 scripts/import-pilot-smoke.mjs");
  }
  if (!existsSync(join(root, "apps/api/src/importPilotSmoke.ts"))) {
    throw new Error("缺少 apps/api/src/importPilotSmoke.ts");
  }
});

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
  if (headersStr.includes("身份证后四位")) throw new Error("身份证后四位 出现在 health_certificates headers");
  if (headersStr.includes("发证机关")) throw new Error("发证机关 出现在 health_certificates headers");
  if (headersStr.includes("发证机构")) throw new Error("发证机构 出现在 health_certificates headers");
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

// 6b. error-report 有导入说明 sheet
check("error-report XLSX 有导入说明 sheet", () => {
  const src = readSrc("importJobRoutes.ts");
  if (!src.includes("导入说明")) throw new Error("缺少导入说明 sheet");
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

check("nas-pilot-import-drill.md 包含静态检查和真实导入演练命令", () => {
  const src = readFileSync(join(root, "docs/import/nas-pilot-import-drill.md"), "utf8");
  if (!src.includes("npm run import:pilot-check")) throw new Error("缺少 import:pilot-check 命令");
  if (!src.includes("npm run import:pilot-smoke")) throw new Error("缺少 import:pilot-smoke 命令");
});

// 9. nas-pilot-import-drill.md 包含不能回滚说明
check("nas-pilot-import-drill.md 包含不能回滚说明", () => {
  const src = readFileSync(join(root, "docs/import/nas-pilot-import-drill.md"), "utf8");
  if (!src.includes("不支持导入回滚") && !src.includes("不能回滚")) {
    throw new Error("缺少不能回滚说明");
  }
});

check("import-module-stop-line.md 存在并写明导入停止线", () => {
  const docPath = join(root, "docs/import/import-module-stop-line.md");
  if (!existsSync(docPath)) throw new Error("缺少 docs/import/import-module-stop-line.md");
  const src = readFileSync(docPath, "utf8");
  for (const phrase of ["不做", "OCR", "ZIP 图片批量入库", "合同 PDF", "导入一键回滚", "外部项目点账号自助全局导入", "Storage Key"]) {
    if (!src.includes(phrase)) throw new Error(`停止线文档缺少：${phrase}`);
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

// 12. BasicDataWorkspace 支持 initialEntityId 透传
check("BasicDataWorkspace 支持 initialTab/initialEntityId 定位", () => {
  const src = readWeb("components/basic-data/BasicDataWorkspace.tsx");
  if (!src.includes("initialTab")) throw new Error("缺少 initialTab");
  if (!src.includes("initialEntityId")) throw new Error("缺少 initialEntityId");
  if (!src.includes("PartiesWorkspace") || !src.includes("initialEntityId={initialEntityId}")) {
    throw new Error("未把 initialEntityId 透传给基础资料子工作区");
  }
});

// 13. InventoryWorkspace 包含 movements tab
check("InventoryWorkspace 包含 movements tab", () => {
  const src = readFileSync(join(root, "apps/web/src/components/InventoryWorkspace.tsx"), "utf8");
  if (!src.includes('"movements"') && !src.includes("movements")) throw new Error("缺少 movements tab");
});

// 14. ImportRowsTab 的基础资料跳转必须带 tab
check("ImportRowsTab party/material 跳转包含精确 tab", () => {
  const src = readWeb("components/excel-import/ImportRowsTab.tsx");
  const partyIdx = src.indexOf('case "party"');
  const materialIdx = src.indexOf('case "material"');
  if (partyIdx < 0 || !src.slice(partyIdx, partyIdx + 180).includes('tab: "parties"')) {
    throw new Error("party 导入结果缺少 tab=parties");
  }
  if (materialIdx < 0 || !src.slice(materialIdx, materialIdx + 180).includes('tab: "materials"')) {
    throw new Error("material 导入结果缺少 tab=materials");
  }
});

// 15. buildNavigationIntent 不再全部跳 inbound，并按 movementType 分流
check("ImportRowsTab inventoryMovement 按 movementType 跳转库存流水", () => {
  const src = readWeb("components/excel-import/ImportRowsTab.tsx");
  const idx = src.indexOf('case "inventoryMovement"');
  if (idx < 0) throw new Error("缺少 inventoryMovement case");
  const block = src.slice(idx, idx + 900);
  for (const token of ["normalizedData", "movementType", '"movements"', '"opening"', '"inbound"', '"outbound"', '"adjustment_in"', '"adjustment_out"']) {
    if (!block.includes(token)) throw new Error(`inventoryMovement 缺少 ${token}`);
  }
  if (/return\s*\{\s*workspace:\s*"库存"\s*,\s*tab:\s*"inbound"/s.test(block)) {
    throw new Error("inventoryMovement 仍然固定跳 inbound，应按 movementType 分流");
  }
});

// 16. projectSiteRosterPerson 不能被当成 projectSiteId
check("ImportRowsTab 区分 projectSite 与 projectSiteRosterPerson entityType", () => {
  const src = readWeb("components/excel-import/ImportRowsTab.tsx");
  const projectIdx = src.indexOf('case "projectSite"');
  const rosterIdx = src.indexOf('case "projectSiteRosterPerson"');
  if (projectIdx < 0 || !src.slice(projectIdx, projectIdx + 220).includes('entityType: "projectSite"')) {
    throw new Error("projectSite 导入跳转缺少 entityType=projectSite");
  }
  if (rosterIdx < 0 || !src.slice(rosterIdx, rosterIdx + 260).includes('entityType: "projectSiteRosterPerson"')) {
    throw new Error("projectSiteRosterPerson 导入跳转缺少 entityType=projectSiteRosterPerson");
  }
  if (!src.slice(rosterIdx, rosterIdx + 420).includes("relatedEntityId")) {
    throw new Error("projectSiteRosterPerson 导入跳转缺少 relatedEntityId，无法定位所属项目点");
  }
});

// 17. ProjectSitesWorkspace 支持 entityType，不误把 rosterPersonId 当 projectSiteId
check("ProjectSitesWorkspace 支持 initialEntityType/initialRelatedEntityId", () => {
  const stateSrc = readWeb("components/project-sites/useProjectSitesWorkspaceState.ts");
  const controllerSrc = readWeb("components/project-sites/useProjectSitesWorkspaceController.ts");
  if (!stateSrc.includes("initialEntityType") || !stateSrc.includes("projectSiteRosterPerson")) {
    throw new Error("项目点状态层未处理 projectSiteRosterPerson");
  }
  if (!stateSrc.includes("initialRelatedEntityId")) {
    throw new Error("项目点状态层缺少 initialRelatedEntityId，不能打开所属项目点");
  }
  if (!controllerSrc.includes("项目点现场人员记录不可见或无权限")) {
    throw new Error("项目点导入定位缺少项目点现场人员不可见提示");
  }
  if (!controllerSrc.includes("已定位到导入的项目点现场人员")) {
    throw new Error("项目点导入定位缺少已定位到所属项目点的提示");
  }
});

// 18. ConfirmAction 摘要必须提示不可一键回滚
check("确认导入 UI 包含不能一键回滚提示", () => {
  const src = readWeb("components/excel-import/ImportRowsTab.tsx");
  if (!src.includes("不支持一键回滚")) throw new Error("确认摘要缺少不能一键回滚提示");
});

// 19. 默认仓库名
check("默认仓库名为无锡总部仓库", () => {
  const trial = readSrc("trialData.ts");
  const templates = readSrc("importTemplates.ts");
  if (!trial.includes('warehouseName: "无锡总部仓库"')) throw new Error("trialData 默认仓库名不是无锡总部仓库");
  if (!templates.includes("无锡总部仓库")) throw new Error("导入模板示例未使用无锡总部仓库");
});

console.log(`\n─── 结果：${passed} 通过 / ${failed} 失败 ───`);
if (failed === 0) {
  console.log("静态检查已通过；请继续运行 npm run import:pilot-smoke 完成真实导入演练。\n");
} else {
  console.log("");
}
if (failed > 0) {
  process.exit(1);
}
