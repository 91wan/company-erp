import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";

describe("fetch metadata protection (Sec-Fetch-Site)", () => {
  const saved = process.env.PUBLIC_INTERNET_ENABLED;

  afterEach(async () => {
    if (saved === undefined) delete process.env.PUBLIC_INTERNET_ENABLED;
    else process.env.PUBLIC_INTERNET_ENABLED = saved;
  });

  it("blocks cross-site POST when PUBLIC_INTERNET_ENABLED=true", async () => {
    process.env.PUBLIC_INTERNET_ENABLED = "true";
    const app = await buildApp({});
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "any", password: "any" },
      headers: { "sec-fetch-site": "cross-site" },
    });
    await app.close();
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: "FETCH_METADATA_BLOCKED" });
  });

  it("blocks cross-site PATCH when PUBLIC_INTERNET_ENABLED=true", async () => {
    process.env.PUBLIC_INTERNET_ENABLED = "true";
    const app = await buildApp({});
    const res = await app.inject({
      method: "PATCH",
      url: "/api/app-config",
      payload: {},
      headers: { "sec-fetch-site": "cross-site" },
    });
    await app.close();
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: "FETCH_METADATA_BLOCKED" });
  });

  it("allows same-origin POST when PUBLIC_INTERNET_ENABLED=true", async () => {
    process.env.PUBLIC_INTERNET_ENABLED = "true";
    const app = await buildApp({});
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "any", password: "any" },
      headers: { "sec-fetch-site": "same-origin" },
    });
    await app.close();
    // Falls through to auth — 401 or 200, not 403 FETCH_METADATA_BLOCKED
    expect(res.statusCode).not.toBe(403);
    expect(res.json().error).not.toBe("FETCH_METADATA_BLOCKED");
  });

  it("allows same-site POST when PUBLIC_INTERNET_ENABLED=true", async () => {
    process.env.PUBLIC_INTERNET_ENABLED = "true";
    const app = await buildApp({});
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "any", password: "any" },
      headers: { "sec-fetch-site": "same-site" },
    });
    await app.close();
    expect(res.statusCode).not.toBe(403);
    expect(res.json().error).not.toBe("FETCH_METADATA_BLOCKED");
  });

  it("falls through when Sec-Fetch-Site header is absent", async () => {
    process.env.PUBLIC_INTERNET_ENABLED = "true";
    const app = await buildApp({});
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "any", password: "any" },
    });
    await app.close();
    expect(res.json().error).not.toBe("FETCH_METADATA_BLOCKED");
  });

  it("does not block cross-site when PUBLIC_INTERNET_ENABLED is not set", async () => {
    delete process.env.PUBLIC_INTERNET_ENABLED;
    const app = await buildApp({});
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "any", password: "any" },
      headers: { "sec-fetch-site": "cross-site" },
    });
    await app.close();
    expect(res.json().error).not.toBe("FETCH_METADATA_BLOCKED");
  });

  it("does not block GET requests regardless of Sec-Fetch-Site", async () => {
    process.env.PUBLIC_INTERNET_ENABLED = "true";
    const app = await buildApp({});
    const res = await app.inject({
      method: "GET",
      url: "/health",
      headers: { "sec-fetch-site": "cross-site" },
    });
    await app.close();
    expect(res.statusCode).toBe(200);
  });
});
