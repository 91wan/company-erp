import { logout } from "./apiClient";
import { AuthGate } from "./components/AuthGate";
import { DashboardShell } from "./components/DashboardShell";
import { ToastProvider } from "./components/ui";

export default function App() {
  return (
    <ToastProvider>
      <AuthGate>
        {(user, onUserChange, appConfig, onAppConfigChange) => (
          <DashboardShell
            currentUser={user}
            appConfig={appConfig}
            onAppConfigChange={onAppConfigChange}
            onLogout={async () => {
              await logout();
              onUserChange(null);
            }}
          />
        )}
      </AuthGate>
    </ToastProvider>
  );
}
