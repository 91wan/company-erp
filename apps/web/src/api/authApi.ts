import type {
  AuthenticatedUserDto,
  LoginInput,
  MfaSetupResponseDto,
  MfaStatusDto,
} from "@company-erp/shared";
import { apiBaseUrl, clearCsrfToken, rememberCsrfToken, requestJson } from "./http";

export async function getCurrentUser(): Promise<AuthenticatedUserDto | null> {
  const payload = await requestJson<{ user: AuthenticatedUserDto | null; csrfToken?: string }>(`${apiBaseUrl}/api/auth/me`);
  rememberCsrfToken(payload.csrfToken);
  return payload.user;
}

export async function login(
  input: LoginInput,
): Promise<AuthenticatedUserDto | { pendingMfaToken: string } | { mfaSetupToken: string; setupUser: { id: string; username: string } }> {
  const payload = await requestJson<
    | { user: AuthenticatedUserDto; csrfToken?: string }
    | { status: "MFA_REQUIRED"; pendingMfaToken: string }
    | { status: "MFA_SETUP_REQUIRED"; mfaSetupToken: string; user: { id: string; username: string } }
  >(`${apiBaseUrl}/api/auth/login`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  if ("status" in payload && payload.status === "MFA_REQUIRED") {
    return { pendingMfaToken: payload.pendingMfaToken };
  }
  if ("status" in payload && payload.status === "MFA_SETUP_REQUIRED") {
    return { mfaSetupToken: payload.mfaSetupToken, setupUser: payload.user };
  }
  const typed = payload as { user: AuthenticatedUserDto; csrfToken?: string };
  rememberCsrfToken(typed.csrfToken);
  return typed.user;
}

export async function createMfaSetupChallenge(input: { mfaSetupToken: string }): Promise<{
  factorId: string;
  totpUri: string;
  recoveryCodes: readonly string[];
}> {
  return requestJson(`${apiBaseUrl}/api/auth/mfa/setup-challenge`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function activateMfaSetupChallenge(input: {
  mfaSetupToken: string;
  factorId: string;
  code: string;
}): Promise<AuthenticatedUserDto> {
  const payload = await requestJson<{ user: AuthenticatedUserDto; csrfToken?: string }>(
    `${apiBaseUrl}/api/auth/mfa/activate-challenge`,
    { method: "POST", body: JSON.stringify(input) },
  );
  rememberCsrfToken(payload.csrfToken);
  return payload.user;
}

export async function verifyMfaLogin(input: {
  pendingMfaToken: string;
  code: string;
}): Promise<AuthenticatedUserDto> {
  const payload = await requestJson<{ user: AuthenticatedUserDto; csrfToken?: string }>(
    `${apiBaseUrl}/api/auth/mfa/verify-login`,
    { method: "POST", body: JSON.stringify(input) },
  );
  rememberCsrfToken(payload.csrfToken);
  return payload.user;
}

export async function getCurrentUserMfaStatus(): Promise<MfaStatusDto> {
  const payload = await requestJson<{ mfaStatus: MfaStatusDto }>(`${apiBaseUrl}/api/auth/mfa/status`);
  return payload.mfaStatus;
}

export async function setupCurrentUserMfa(): Promise<MfaSetupResponseDto> {
  return requestJson<MfaSetupResponseDto>(`${apiBaseUrl}/api/auth/mfa/setup`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function activateCurrentUserMfa(input: { factorId: string; code: string }): Promise<{ ok: true }> {
  return requestJson<{ ok: true }>(`${apiBaseUrl}/api/auth/mfa/activate`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function disableCurrentUserMfa(input: { code: string }): Promise<{ ok: true }> {
  return requestJson<{ ok: true }>(`${apiBaseUrl}/api/auth/mfa/disable`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function logout(): Promise<void> {
  await requestJson<{ ok: true }>(`${apiBaseUrl}/api/auth/logout`, { method: "POST" });
  clearCsrfToken();
}
