import { useEffect, useState } from "react";
import type { AuthenticatedUserDto, MfaSetupResponseDto, MfaStatusDto } from "@company-erp/shared";
import {
  activateCurrentUserMfa,
  disableCurrentUserMfa,
  getCurrentUserMfaStatus,
  setupCurrentUserMfa,
} from "../../apiClient";
import { StatusBadge } from "../ui";

type CurrentUserMfaSettingsProps = {
  currentUser: AuthenticatedUserDto;
};

type LoadState = "idle" | "loading" | "saving" | "error";

const publicMfaRoles = new Set(["admin"]);

function requiresPublicMfa(user: AuthenticatedUserDto): boolean {
  return user.roles.some((role) => publicMfaRoles.has(role));
}

export function CurrentUserMfaSettings({ currentUser }: CurrentUserMfaSettingsProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<MfaStatusDto | null>(null);
  const [setup, setSetup] = useState<MfaSetupResponseDto | null>(null);
  const [code, setCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [state, setState] = useState<LoadState>("idle");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setState("loading");
    getCurrentUserMfaStatus()
      .then((nextStatus) => {
        if (cancelled) return;
        setStatus(nextStatus);
        setState("idle");
      })
      .catch(() => {
        if (cancelled) return;
        setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function handleSetup() {
    setState("saving");
    try {
      const nextSetup = await setupCurrentUserMfa();
      setSetup(nextSetup);
      setCode("");
      setDisableCode("");
      setConfirmDisable(false);
      setState("idle");
    } catch {
      setState("error");
    }
  }

  async function handleActivate() {
    if (!setup || !code.trim()) return;
    setState("saving");
    try {
      await activateCurrentUserMfa({ factorId: setup.factorId, code: code.trim() });
      setStatus({ enabled: true, factorId: setup.factorId });
      setSetup(null);
      setCode("");
      setDisableCode("");
      setState("idle");
    } catch {
      setState("error");
    }
  }

  async function handleDisable() {
    if (!disableCode.trim()) return;
    setState("saving");
    try {
      await disableCurrentUserMfa({ code: disableCode.trim() });
      setStatus({ enabled: false });
      setConfirmDisable(false);
      setDisableCode("");
      setSetup(null);
      setState("idle");
    } catch {
      setState("error");
    }
  }

  const publicMfaRequired = requiresPublicMfa(currentUser);

  return (
    <div className="current-user-mfa">
      <button
        type="button"
        className="secondary-action"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        MFA 设置
      </button>
      {open ? (
        <section className="current-user-mfa-panel" aria-label="当前用户 MFA 设置">
          {state === "loading" ? <p className="form-hint">正在读取 MFA 状态...</p> : null}
          {status ? (
            <div className="mfa-status-row">
              <StatusBadge tone={status.enabled ? "success" : publicMfaRequired ? "danger" : "warning"}>
                {status.enabled ? "MFA 已启用" : "MFA 未启用"}
              </StatusBadge>
              {publicMfaRequired && !status.enabled ? (
                <span className="form-hint">公网高权限账号需要 MFA。</span>
              ) : null}
            </div>
          ) : null}

          {setup ? (
            <div className="mfa-setup-box">
              <label>
                TOTP URI
                <textarea value={setup.totpUri} readOnly rows={3} />
              </label>
              <div>
                <strong>恢复码只显示一次</strong>
                <ul>
                  {setup.recoveryCodes.map((recoveryCode) => (
                    <li key={recoveryCode}>
                      <code>{recoveryCode}</code>
                    </li>
                  ))}
                </ul>
              </div>
              <label>
                MFA 验证码
                <input
                  value={code}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  onChange={(event) => setCode(event.target.value)}
                />
              </label>
              <button type="button" className="primary-action" disabled={state === "saving"} onClick={handleActivate}>
                完成启用 MFA
              </button>
            </div>
          ) : null}

          {status && !status.enabled && !setup ? (
            <button type="button" className="primary-action" disabled={state === "saving"} onClick={handleSetup}>
              启用 MFA
            </button>
          ) : null}

          {status?.enabled ? (
            <div className="section-actions">
              {!confirmDisable ? (
                <button
                  type="button"
                  className="secondary-action danger"
                  disabled={state === "saving"}
                  onClick={() => setConfirmDisable(true)}
                >
                  禁用 MFA
                </button>
              ) : (
                <>
                  <p className="form-hint">禁用 MFA 需要二次确认。</p>
                  <label>
                    当前 MFA 或恢复码
                    <input
                      value={disableCode}
                      autoComplete="one-time-code"
                      onChange={(event) => setDisableCode(event.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="secondary-action danger"
                    disabled={state === "saving" || !disableCode.trim()}
                    onClick={handleDisable}
                  >
                    确认禁用 MFA
                  </button>
                  <button type="button" className="table-action" onClick={() => { setConfirmDisable(false); setDisableCode(""); }}>
                    取消
                  </button>
                </>
              )}
            </div>
          ) : null}

          {state === "error" ? <p className="form-error">MFA 操作失败，请稍后重试。</p> : null}
        </section>
      ) : null}
    </div>
  );
}
