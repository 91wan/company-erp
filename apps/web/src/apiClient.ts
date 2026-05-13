import type { AppConfigDto, AuthenticatedUserDto, LoginInput, UpdateAppConfigInput } from "@company-erp/shared";

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

export async function requestJson<TPayload>(url: string, init?: RequestInit): Promise<TPayload> {
  const shouldSetJsonContentType = Boolean(init?.body) && !(init?.body instanceof FormData);
  const response = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      ...(shouldSetJsonContentType ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  return (await response.json()) as TPayload;
}

export async function getCurrentUser(): Promise<AuthenticatedUserDto | null> {
  const payload = await requestJson<{ user: AuthenticatedUserDto | null }>(`${apiBaseUrl}/api/auth/me`);
  return payload.user;
}

export async function getAppConfig(): Promise<AppConfigDto> {
  const payload = await requestJson<{ appConfig: AppConfigDto }>(`${apiBaseUrl}/api/app-config`);
  return payload.appConfig;
}

export async function updateAppConfig(input: UpdateAppConfigInput): Promise<AppConfigDto> {
  const payload = await requestJson<{ appConfig: AppConfigDto }>(`${apiBaseUrl}/api/app-config`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return payload.appConfig;
}

export async function login(input: LoginInput): Promise<AuthenticatedUserDto> {
  const payload = await requestJson<{ user: AuthenticatedUserDto }>(`${apiBaseUrl}/api/auth/login`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return payload.user;
}

export async function logout(): Promise<void> {
  await requestJson<{ ok: true }>(`${apiBaseUrl}/api/auth/logout`, { method: "POST" });
}
