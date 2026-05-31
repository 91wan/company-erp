import { LockKeyhole, LogIn, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { AppConfigDto, AuthenticatedUserDto } from "@company-erp/shared";
import { activateMfaSetupChallenge, createMfaSetupChallenge, getAppConfig, getCurrentUser, login, verifyMfaLogin } from "../apiClient";

type AuthGateProps = {
  children: (
    user: AuthenticatedUserDto,
    onUserChange: (user: AuthenticatedUserDto | null) => void,
    appConfig: AppConfigDto,
    onAppConfigChange: (appConfig: AppConfigDto) => void,
  ) => ReactNode;
};

const defaultAppConfig: AppConfigDto = { companyName: "Company ERP" };

export function AuthGate({ children }: AuthGateProps) {
  const [status, setStatus] = useState<"loading" | "anonymous" | "authenticated">("loading");
  const [user, setUser] = useState<AuthenticatedUserDto | null>(null);
  const [appConfig, setAppConfig] = useState<AppConfigDto>(defaultAppConfig);

  useEffect(() => {
    let mounted = true;

    Promise.allSettled([getAppConfig(), getCurrentUser()])
      .then(([configResult, userResult]) => {
        if (!mounted) return;
        if (
          configResult.status === "fulfilled" &&
          typeof configResult.value?.companyName === "string" &&
          configResult.value.companyName.trim()
        ) {
          setAppConfig(configResult.value);
        }
        const currentUser = userResult.status === "fulfilled" ? userResult.value : null;
        setUser(currentUser);
        setStatus(currentUser ? "authenticated" : "anonymous");
      })
      .catch(() => {
        if (!mounted) return;
        setUser(null);
        setStatus("anonymous");
      });

    return () => {
      mounted = false;
    };
  }, []);

  function handleUserChange(nextUser: AuthenticatedUserDto | null) {
    setUser(nextUser);
    setStatus(nextUser ? "authenticated" : "anonymous");
  }

  if (status === "loading") {
    return (
      <main className="auth-screen">
        <section className="auth-card">
          <RefreshCw aria-hidden="true" size={22} />
          <h1>{appConfig.companyName}</h1>
          <p>正在检查内网登录状态...</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return <LoginPanel companyName={appConfig.companyName} onLogin={handleUserChange} />;
  }


  return children(user, handleUserChange, appConfig, setAppConfig);
}

function LoginPanel({ companyName, onLogin }: { companyName: string; onLogin: (user: AuthenticatedUserDto) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [pendingMfaToken, setPendingMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaStatus, setMfaStatus] = useState<"idle" | "saving" | "error">("idle");
  const [mfaSetupToken, setMfaSetupToken] = useState<string | null>(null);
  const [mfaSetup, setMfaSetup] = useState<{ factorId: string; totpUri: string; recoveryCodes: readonly string[] } | null>(null);
  const [mfaSetupCode, setMfaSetupCode] = useState("");
  const [mfaSetupStatus, setMfaSetupStatus] = useState<"idle" | "saving" | "error">("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    try {
      const result = await login({ username, password });
      if ("pendingMfaToken" in result) {
        setPendingMfaToken(result.pendingMfaToken);
        setStatus("idle");
      } else if ("mfaSetupToken" in result) {
        setMfaSetupToken(result.mfaSetupToken);
        setStatus("idle");
        setMfaSetupStatus("saving");
        try {
          const setup = await createMfaSetupChallenge({ mfaSetupToken: result.mfaSetupToken });
          setMfaSetup(setup);
          setMfaSetupStatus("idle");
        } catch {
          setMfaSetupStatus("error");
        }
      } else {
        onLogin(result);
      }
    } catch {
      setStatus("error");
    }
  }

  async function handleMfaSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pendingMfaToken) return;
    setMfaStatus("saving");
    try {
      const user = await verifyMfaLogin({ pendingMfaToken, code: mfaCode });
      onLogin(user);
    } catch {
      setMfaStatus("error");
    }
  }

  async function handleMfaSetupSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mfaSetupToken || !mfaSetup) return;
    setMfaSetupStatus("saving");
    try {
      const user = await activateMfaSetupChallenge({
        mfaSetupToken,
        factorId: mfaSetup.factorId,
        code: mfaSetupCode,
      });
      onLogin(user);
    } catch {
      setMfaSetupStatus("error");
    }
  }

  if (mfaSetupToken) {
    return (
      <main className="auth-screen">
        <form className="auth-card" onSubmit={handleMfaSetupSubmit}>
          <span className="auth-icon">
            <ShieldCheck aria-hidden="true" size={24} />
          </span>
          <div>
            <h1>{companyName}</h1>
            <p>首次设置双因素验证</p>
          </div>
          {mfaSetup ? (
            <>
              <label>
                <span>Authenticator URI</span>
                <textarea value={mfaSetup.totpUri} readOnly rows={3} />
              </label>
              <div className="auth-recovery-codes" aria-label="恢复码">
                {mfaSetup.recoveryCodes.map((code) => (
                  <code key={code}>{code}</code>
                ))}
              </div>
              <label>
                <span>验证码</span>
                <input
                  value={mfaSetupCode}
                  onChange={(event) => setMfaSetupCode(event.target.value)}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={10}
                  required
                  placeholder="输入 Authenticator 6 位验证码"
                />
              </label>
            </>
          ) : (
            <p>{mfaSetupStatus === "error" ? "MFA 设置初始化失败，请重新登录。" : "正在创建 MFA 设置..."}</p>
          )}
          <button type="submit" disabled={!mfaSetup || mfaSetupStatus === "saving"}>
            <ShieldCheck aria-hidden="true" size={17} />
            {mfaSetupStatus === "saving" ? "处理中" : "完成设置并登录"}
          </button>
          {mfaSetupStatus === "error" && mfaSetup ? <p className="form-error">MFA 设置失败，请检查验证码后重试。</p> : null}
          <button
            type="button"
            className="secondary-action"
            onClick={() => {
              setMfaSetupToken(null);
              setMfaSetup(null);
              setMfaSetupCode("");
              setMfaSetupStatus("idle");
            }}
          >
            返回登录
          </button>
        </form>
      </main>
    );
  }

  if (pendingMfaToken) {
    return (
      <main className="auth-screen">
        <form className="auth-card" onSubmit={handleMfaSubmit}>
          <span className="auth-icon">
            <ShieldCheck aria-hidden="true" size={24} />
          </span>
          <div>
            <h1>{companyName}</h1>
            <p>双因素验证</p>
          </div>
          <label>
            <span>验证码</span>
            <input
              value={mfaCode}
              onChange={(event) => setMfaCode(event.target.value)}
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={10}
              required
              placeholder="6 位 TOTP 码或恢复码"
            />
          </label>
          <button type="submit" disabled={mfaStatus === "saving"}>
            <ShieldCheck aria-hidden="true" size={17} />
            {mfaStatus === "saving" ? "验证中" : "验证"}
          </button>
          {mfaStatus === "error" ? <p className="form-error">验证码无效，请重试。</p> : null}
          <button
            type="button"
            className="secondary-action"
            onClick={() => { setPendingMfaToken(null); setMfaCode(""); setMfaStatus("idle"); }}
          >
            返回登录
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="auth-screen">
      <form className="auth-card" onSubmit={handleSubmit}>
        <span className="auth-icon">
          <LockKeyhole aria-hidden="true" size={24} />
        </span>
        <div>
          <h1>{companyName}</h1>
          <p>内网 ERP 登录</p>
        </div>

        <label>
          <span>用户名</span>
          <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required />
        </label>
        <label>
          <span>密码</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        <button type="submit" disabled={status === "saving"}>
          <LogIn aria-hidden="true" size={17} />
          {status === "saving" ? "登录中" : "登录"}
        </button>

        {status === "error" ? <p className="form-error">登录失败，请检查账号状态、用户名或密码。</p> : null}
      </form>
    </main>
  );
}
