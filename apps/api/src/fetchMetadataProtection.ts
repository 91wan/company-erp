import type { FastifyInstance } from "fastify";

function isTruthy(value: string | undefined): boolean {
  return value === "true" || value === "1";
}

export function publicInternetEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return isTruthy(env.PUBLIC_INTERNET_ENABLED);
}

const UNSAFE_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);
const ALLOWED_FETCH_SITE_VALUES = new Set(["cross-site", "same-origin", "same-site", "none"]);

function logSecurityEvent(event: {
  blockedReason: string;
  ip: string | undefined;
  userAgent: string | undefined;
  path: string;
  method: string;
  secFetchSite: string | undefined;
}): void {
  console.warn(
    JSON.stringify({
      securityEvent: "fetch_metadata_blocked",
      blockedReason: event.blockedReason,
      ip: event.ip,
      userAgent: event.userAgent,
      path: event.path,
      method: event.method,
      secFetchSite: event.secFetchSite,
    }),
  );
}

export function registerFetchMetadataProtection(app: FastifyInstance): void {
  app.addHook("preHandler", async (request, reply) => {
    if (!publicInternetEnabled()) return;
    if (!UNSAFE_METHODS.has(request.method)) return;

    const secFetchSite =
      typeof request.headers["sec-fetch-site"] === "string" ? request.headers["sec-fetch-site"] : undefined;

    if (!secFetchSite) return; // no header → fall through to existing Origin/CSRF checks

    if (secFetchSite === "cross-site") {
      logSecurityEvent({
        blockedReason: "sec-fetch-site=cross-site",
        ip: request.ip,
        userAgent: typeof request.headers["user-agent"] === "string" ? request.headers["user-agent"] : undefined,
        path: request.url,
        method: request.method,
        secFetchSite,
      });
      return reply.status(403).send({ error: "FETCH_METADATA_BLOCKED" });
    }

    if (!ALLOWED_FETCH_SITE_VALUES.has(secFetchSite)) {
      logSecurityEvent({
        blockedReason: `sec-fetch-site=unknown:${secFetchSite}`,
        ip: request.ip,
        userAgent: typeof request.headers["user-agent"] === "string" ? request.headers["user-agent"] : undefined,
        path: request.url,
        method: request.method,
        secFetchSite,
      });
      return reply.status(403).send({ error: "FETCH_METADATA_BLOCKED" });
    }

    // same-origin | same-site | none → allowed
  });
}
