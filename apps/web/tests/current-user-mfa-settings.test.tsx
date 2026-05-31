import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TopBar } from "../src/components/shell/TopBar";
import { adminUser } from "./appTestHelpers";
import {
  activateCurrentUserMfa,
  disableCurrentUserMfa,
  getCurrentUserMfaStatus,
  setupCurrentUserMfa,
} from "../src/apiClient";

vi.mock("../src/apiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/apiClient")>();
  return {
    ...actual,
    getCurrentUserMfaStatus: vi.fn(),
    setupCurrentUserMfa: vi.fn(),
    activateCurrentUserMfa: vi.fn(),
    disableCurrentUserMfa: vi.fn(),
  };
});

function storedLocalStorageValues(): string[] {
  const values: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key) continue;
    values.push(localStorage.getItem(key) ?? "");
  }
  return values;
}

describe("Current user MFA settings", () => {
  afterEach(() => {
    vi.mocked(getCurrentUserMfaStatus).mockReset();
    vi.mocked(setupCurrentUserMfa).mockReset();
    vi.mocked(activateCurrentUserMfa).mockReset();
    vi.mocked(disableCurrentUserMfa).mockReset();
    localStorage.clear();
  });

  it("lets the current user view status, start MFA setup, and keeps recovery codes out of localStorage", async () => {
    vi.mocked(getCurrentUserMfaStatus).mockResolvedValue({ enabled: false });
    vi.mocked(setupCurrentUserMfa).mockResolvedValue({
      factorId: "factor-1",
      totpUri: "otpauth://totp/company-erp:admin?secret=EXAMPLE",
      recoveryCodes: ["RC-111111", "RC-222222"],
    });
    vi.mocked(activateCurrentUserMfa).mockResolvedValue({ ok: true });

    render(<TopBar currentUser={adminUser} onLogout={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "MFA 设置" }));

    expect(await screen.findByText("MFA 未启用")).toBeInTheDocument();
    expect(screen.getByText("公网高权限账号需要 MFA。")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "启用 MFA" }));

    expect(await screen.findByText("RC-111111")).toBeInTheDocument();
    expect(screen.getByText("RC-222222")).toBeInTheDocument();
    expect(storedLocalStorageValues().join("\n")).not.toContain("RC-111111");

    fireEvent.change(screen.getByLabelText("MFA 验证码"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "完成启用 MFA" }));

    await waitFor(() => {
      expect(activateCurrentUserMfa).toHaveBeenCalledWith({ factorId: "factor-1", code: "123456" });
    });
  });

  it("requires a second confirmation before disabling current user MFA", async () => {
    vi.mocked(getCurrentUserMfaStatus).mockResolvedValue({ enabled: true, factorId: "factor-1" });
    vi.mocked(disableCurrentUserMfa).mockResolvedValue({ ok: true });

    render(<TopBar currentUser={{ ...adminUser, username: "admin" }} onLogout={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "MFA 设置" }));
    expect(await screen.findByText("MFA 已启用")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "禁用 MFA" }));
    expect(disableCurrentUserMfa).not.toHaveBeenCalled();

    fireEvent.click(await screen.findByRole("button", { name: "确认禁用 MFA" }));
    await waitFor(() => {
      expect(disableCurrentUserMfa).toHaveBeenCalledTimes(1);
    });
  });
});
