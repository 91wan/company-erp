import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { publicInternetEnabled, securityHeadersEnabled } from "../src/securityHeaders";

describe("securityHeadersEnabled / publicInternetEnabled", () => {
  const savedHeaders = process.env.PUBLIC_SECURITY_HEADERS_ENABLED;
  const savedInternet = process.env.PUBLIC_INTERNET_ENABLED;

  afterEach(() => {
    if (savedHeaders === undefined) delete process.env.PUBLIC_SECURITY_HEADERS_ENABLED;
    else process.env.PUBLIC_SECURITY_HEADERS_ENABLED = savedHeaders;
    if (savedInternet === undefined) delete process.env.PUBLIC_INTERNET_ENABLED;
    else process.env.PUBLIC_INTERNET_ENABLED = savedInternet;
  });

  it("is disabled by default", () => {
    delete process.env.PUBLIC_SECURITY_HEADERS_ENABLED;
    delete process.env.PUBLIC_INTERNET_ENABLED;
    expect(securityHeadersEnabled({})).toBe(false);
    expect(publicInternetEnabled({})).toBe(false);
  });

  it("enables via PUBLIC_SECURITY_HEADERS_ENABLED=true", () => {
    expect(securityHeadersEnabled({ PUBLIC_SECURITY_HEADERS_ENABLED: "true" })).toBe(true);
    expect(publicInternetEnabled({ PUBLIC_SECURITY_HEADERS_ENABLED: "true" })).toBe(false);
  });

  it("enables both via PUBLIC_INTERNET_ENABLED=true", () => {
    expect(securityHeadersEnabled({ PUBLIC_INTERNET_ENABLED: "true" })).toBe(true);
    expect(publicInternetEnabled({ PUBLIC_INTERNET_ENABLED: "true" })).toBe(true);
  });
});

describe("security headers middleware", () => {
  const savedHeaders = process.env.PUBLIC_SECURITY_HEADERS_ENABLED;
  const savedInternet = process.env.PUBLIC_INTERNET_ENABLED;

  afterEach(() => {
    if (savedHeaders === undefined) delete process.env.PUBLIC_SECURITY_HEADERS_ENABLED;
    else process.env.PUBLIC_SECURITY_HEADERS_ENABLED = savedHeaders;
    if (savedInternet === undefined) delete process.env.PUBLIC_INTERNET_ENABLED;
    else process.env.PUBLIC_INTERNET_ENABLED = savedInternet;
  });

  it("sets Content-Security-Policy on responses when enabled", async () => {
    process.env.PUBLIC_SECURITY_HEADERS_ENABLED = "true";
    const app = await buildApp({});
    const res = await app.inject({ method: "GET", url: "/health" });
    await app.close();
    expect(res.json().status).toBe("ok");
    expect(res.headers["content-security-policy"]).toContain("default-src 'self'");
    expect(res.headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(res.headers["content-security-policy"]).toContain("object-src 'none'");
  });

  it("keeps JSON response payloads intact and marks API responses no-store", async () => {
    process.env.PUBLIC_SECURITY_HEADERS_ENABLED = "true";
    const app = await buildApp({});
    const res = await app.inject({ method: "GET", url: "/api/app-version" });
    await app.close();
    expect(res.statusCode).toBe(200);
    expect(res.json().appVersion.packageVersion).toBeTruthy();
    expect(String(res.headers["cache-control"])).toContain("no-store");
  });

  it("sets X-Content-Type-Options: nosniff", async () => {
    process.env.PUBLIC_SECURITY_HEADERS_ENABLED = "true";
    const app = await buildApp({});
    const res = await app.inject({ method: "GET", url: "/health" });
    await app.close();
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("sets X-Frame-Options: DENY", async () => {
    process.env.PUBLIC_SECURITY_HEADERS_ENABLED = "true";
    const app = await buildApp({});
    const res = await app.inject({ method: "GET", url: "/health" });
    await app.close();
    expect(res.headers["x-frame-options"]).toBe("DENY");
  });

  it("sets Referrer-Policy", async () => {
    process.env.PUBLIC_SECURITY_HEADERS_ENABLED = "true";
    const app = await buildApp({});
    const res = await app.inject({ method: "GET", url: "/health" });
    await app.close();
    expect(res.headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  });

  it("sets Permissions-Policy restricting sensitive APIs", async () => {
    process.env.PUBLIC_SECURITY_HEADERS_ENABLED = "true";
    const app = await buildApp({});
    const res = await app.inject({ method: "GET", url: "/health" });
    await app.close();
    const pp = res.headers["permissions-policy"] as string;
    expect(pp).toContain("camera=()");
    expect(pp).toContain("geolocation=()");
  });

  it("sets Cross-Origin-Opener-Policy and Cross-Origin-Resource-Policy", async () => {
    process.env.PUBLIC_SECURITY_HEADERS_ENABLED = "true";
    const app = await buildApp({});
    const res = await app.inject({ method: "GET", url: "/health" });
    await app.close();
    expect(res.headers["cross-origin-opener-policy"]).toBe("same-origin");
    expect(res.headers["cross-origin-resource-policy"]).toBe("same-origin");
  });

  it("does NOT set HSTS when only PUBLIC_SECURITY_HEADERS_ENABLED=true", async () => {
    process.env.PUBLIC_SECURITY_HEADERS_ENABLED = "true";
    delete process.env.PUBLIC_INTERNET_ENABLED;
    const app = await buildApp({});
    const res = await app.inject({ method: "GET", url: "/health" });
    await app.close();
    expect(res.headers["strict-transport-security"]).toBeUndefined();
  });

  it("sets HSTS only when PUBLIC_INTERNET_ENABLED=true", async () => {
    process.env.PUBLIC_INTERNET_ENABLED = "true";
    process.env.PUBLIC_SECURITY_HEADERS_ENABLED = "true";
    const app = await buildApp({});
    const res = await app.inject({ method: "GET", url: "/health" });
    await app.close();
    const hsts = res.headers["strict-transport-security"] as string;
    expect(hsts).toContain("max-age=63072000");
    expect(hsts).toContain("includeSubDomains");
    expect(hsts).toContain("preload");
  });

  it("does not add security headers when the feature is disabled", async () => {
    delete process.env.PUBLIC_SECURITY_HEADERS_ENABLED;
    delete process.env.PUBLIC_INTERNET_ENABLED;
    const app = await buildApp({});
    const res = await app.inject({ method: "GET", url: "/health" });
    await app.close();
    expect(res.headers["content-security-policy"]).toBeUndefined();
    expect(res.headers["x-frame-options"]).toBeUndefined();
  });
});
