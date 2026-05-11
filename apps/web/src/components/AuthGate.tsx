import { LockKeyhole, LogIn, RefreshCw } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { AuthenticatedUserDto } from "@company-erp/shared";
import { getCurrentUser, login } from "../apiClient";

type AuthGateProps = {
  children: (user: AuthenticatedUserDto, onUserChange: (user: AuthenticatedUserDto | null) => void) => ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  const [status, setStatus] = useState<"loading" | "anonymous" | "authenticated">("loading");
  const [user, setUser] = useState<AuthenticatedUserDto | null>(null);

  useEffect(() => {
    let mounted = true;

    getCurrentUser()
      .then((currentUser) => {
        if (!mounted) return;
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
          <h1>Company ERP</h1>
          <p>正在检查内网登录状态...</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return <LoginPanel onLogin={handleUserChange} />;
  }

  return children(user, handleUserChange);
}

function LoginPanel({ onLogin }: { onLogin: (user: AuthenticatedUserDto) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");

    try {
      const user = await login({ username, password });
      onLogin(user);
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className="auth-screen">
      <form className="auth-card" onSubmit={handleSubmit}>
        <span className="auth-icon">
          <LockKeyhole aria-hidden="true" size={24} />
        </span>
        <div>
          <h1>Company ERP</h1>
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
