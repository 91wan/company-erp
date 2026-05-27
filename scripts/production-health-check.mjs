#!/usr/bin/env node

const PASS = "PRODUCTION_HEALTH_PASS";
const BLOCKED = "BLOCKED";

function usage() {
  return `Usage: npm run production:health-check -- --base-url http://<nas>:8080

Checks deployed Web UI, static assets, /health, and /api/app-version after internal production deployment.
This script does not read .env, does not access NAS roots, and does not start containers.`;
}

function sanitize(value) {
  return String(value ?? "")
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "postgresql://[redacted]")
    .replace(/\/volume\d+\/[^\s"']*/gi, "[redacted-nas-path]")
    .replace(/(password|secret|token|cookie)=?[^\s"']*/gi, "$1=[redacted]");
}

function parseArgs(argv) {
  if (argv.includes("--help") || argv.includes("-h")) return { help: true };
  const baseUrlIndex = argv.indexOf("--base-url");
  if (baseUrlIndex < 0 || !argv[baseUrlIndex + 1]) {
    return { errors: ["Missing --base-url http://<host>:<port>."] };
  }
  return { baseUrl: argv[baseUrlIndex + 1].replace(/\/+$/, "") };
}

async function readJson(url) {
  const response = await fetch(url, { headers: { accept: "application/json" }, redirect: "manual" });
  const text = await response.text();
  let body = {};
  if (text.trim()) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }
  }
  return { response, body };
}

async function readText(url, accept = "text/plain") {
  const response = await fetch(url, { headers: { accept }, redirect: "manual" });
  const text = await response.text();
  return { response, text };
}

function validateAppVersion(body) {
  const blockers = [];
  for (const field of ["commitSha", "buildTime", "deployedAt", "packageVersion", "environment"]) {
    if (!body?.[field]) blockers.push(`/api/app-version missing ${field}.`);
  }
  if (body?.environment && !["nas", "production"].includes(body.environment)) {
    blockers.push(`/api/app-version environment must be nas or production, got ${body.environment}.`);
  }
  return blockers;
}

function hasAppRootMarker(html) {
  return /\bid=["']root["']/i.test(html) || /Company ERP/i.test(html);
}

function extractStaticAssetPath(html) {
  const match = html.match(/(?:src|href)=["']([^"']*\/assets\/[^"']+\.(?:js|css))["']/i);
  return match?.[1] ?? "";
}

function sameOriginUrl(baseUrl, assetPath, blockers) {
  try {
    const base = new URL(baseUrl);
    const asset = new URL(assetPath, base);
    if (asset.origin !== base.origin) {
      blockers.push("Web UI static asset must be same-origin.");
      return null;
    }
    return asset.toString();
  } catch {
    blockers.push(`Web UI static asset URL is invalid: ${assetPath}`);
    return null;
  }
}

async function checkWebEntrypoint(baseUrl, blockers) {
  let html = "";
  try {
    const { response, text } = await readText(`${baseUrl}/`, "text/html");
    html = text;
    if (response.status !== 200) blockers.push(`Web UI / expected 200, got ${response.status}.`);
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("text/html")) {
      blockers.push(`Web UI / Content-Type must include text/html, got ${contentType || "missing"}.`);
    }
    if (!hasAppRootMarker(html)) {
      blockers.push("Web UI / must contain Company ERP app root marker.");
    }
  } catch (error) {
    blockers.push(`Web UI / request failed: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }

  const assetPath = extractStaticAssetPath(html);
  if (!assetPath) {
    blockers.push("Web UI / must reference at least one /assets/*.js or /assets/*.css static asset.");
    return;
  }

  const assetUrl = sameOriginUrl(baseUrl, assetPath, blockers);
  if (!assetUrl) return;

  try {
    const { response } = await readText(assetUrl, "*/*");
    if (response.status !== 200) blockers.push(`Web UI static asset expected 200, got ${response.status}: ${assetPath}.`);
  } catch (error) {
    blockers.push(`Web UI static asset request failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function evaluateProductionHealth({ baseUrl }) {
  const blockers = [];

  await checkWebEntrypoint(baseUrl, blockers);

  try {
    const { response } = await readJson(`${baseUrl}/health`);
    if (response.status !== 200) blockers.push(`/health expected 200, got ${response.status}.`);
  } catch (error) {
    blockers.push(`/health request failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const { response, body } = await readJson(`${baseUrl}/api/app-version`);
    if (response.status !== 200) {
      blockers.push(`/api/app-version expected 200, got ${response.status}.`);
    } else {
      blockers.push(...validateAppVersion(body));
    }
  } catch (error) {
    blockers.push(`/api/app-version request failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  return { ok: blockers.length === 0, blockers: blockers.map(sanitize) };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return 0;
  }
  if (args.errors) {
    console.error(BLOCKED);
    for (const error of args.errors) console.error(`- ${error}`);
    console.error("处理建议: 指定部署后的内网 base URL 后重新运行。");
    return 1;
  }

  const result = await evaluateProductionHealth({ baseUrl: args.baseUrl });
  if (!result.ok) {
    console.error(BLOCKED);
    for (const blocker of result.blockers) console.error(`- ${blocker}`);
    console.error("处理建议: 修复部署健康检查或版本元数据后重新运行 production:health-check。");
    return 1;
  }

  console.log(PASS);
  console.log("Deployment health and app-version metadata are valid for internal production.");
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = await main();
}
