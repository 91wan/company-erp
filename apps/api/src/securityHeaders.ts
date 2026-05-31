import type { FastifyInstance } from "fastify";

function isTruthy(value: string | undefined): boolean {
  return value === "true" || value === "1";
}

export function publicInternetEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return isTruthy(env.PUBLIC_INTERNET_ENABLED);
}

export function securityHeadersEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return publicInternetEnabled(env) || isTruthy(env.PUBLIC_SECURITY_HEADERS_ENABLED);
}

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const PERMISSIONS_POLICY = "camera=(), microphone=(), geolocation=(), payment=(), usb=()";

export function registerSecurityHeaders(app: FastifyInstance): void {
  app.addHook("onSend", async (request, reply, payload) => {
    reply.header("Content-Security-Policy", CSP);
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("Referrer-Policy", "strict-origin-when-cross-origin");
    reply.header("X-Frame-Options", "DENY");
    reply.header("Permissions-Policy", PERMISSIONS_POLICY);
    reply.header("Cross-Origin-Opener-Policy", "same-origin");
    reply.header("Cross-Origin-Resource-Policy", "same-origin");
    if (publicInternetEnabled()) {
      reply.header("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
    }
    if (request.url.startsWith("/api/") && !reply.hasHeader("Cache-Control")) {
      reply.header("Cache-Control", "no-store");
    }
    return payload;
  });
}
