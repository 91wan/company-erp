import type { AuthRepository, AuthSessionRecord } from "../src/auth";

export function createFakeAuthSessionMethods(): Required<
  Pick<
    AuthRepository,
    | "createSession"
    | "findSessionByTokenHash"
    | "touchSession"
    | "updateSessionCsrfToken"
    | "revokeSession"
    | "revokeSessionsForAccount"
  >
> {
  const sessions: AuthSessionRecord[] = [];

  return {
    async createSession(input) {
      const session: AuthSessionRecord = {
        id: `session-${sessions.length + 1}`,
        userAccountId: input.userAccountId,
        tokenHash: input.tokenHash,
        csrfTokenHash: input.csrfTokenHash ?? null,
        expiresAt: input.expiresAt.toISOString(),
        revokedAt: null,
        revokedReason: null,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        lastSeenAt: input.createdAt.toISOString(),
        createdAt: input.createdAt.toISOString(),
        updatedAt: input.createdAt.toISOString(),
      };
      sessions.push(session);
      return session;
    },
    async findSessionByTokenHash(tokenHash) {
      return sessions.find((session) => session.tokenHash === tokenHash) ?? null;
    },
    async touchSession(id, at) {
      const session = sessions.find((item) => item.id === id);
      if (session) {
        session.lastSeenAt = at.toISOString();
        session.updatedAt = at.toISOString();
      }
    },
    async updateSessionCsrfToken(id, csrfTokenHash, at) {
      const session = sessions.find((item) => item.id === id);
      if (session) {
        session.csrfTokenHash = csrfTokenHash;
        session.updatedAt = at.toISOString();
      }
    },
    async revokeSession(id, at, reason) {
      const session = sessions.find((item) => item.id === id);
      if (session) {
        session.revokedAt = at.toISOString();
        session.revokedReason = reason;
        session.updatedAt = at.toISOString();
      }
    },
    async revokeSessionsForAccount(userAccountId, at, reason) {
      for (const session of sessions) {
        if (session.userAccountId === userAccountId && !session.revokedAt) {
          session.revokedAt = at.toISOString();
          session.revokedReason = reason;
          session.updatedAt = at.toISOString();
        }
      }
    },
  };
}
