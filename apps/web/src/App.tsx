import { logout } from "./apiClient";
import { AuthGate } from "./components/AuthGate";
import { DashboardShell } from "./components/DashboardShell";

export default function App() {
  return (
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
  );
}
