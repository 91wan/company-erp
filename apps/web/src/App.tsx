import { logout } from "./apiClient";
import { AuthGate } from "./components/AuthGate";
import { DashboardShell } from "./components/DashboardShell";

export default function App() {
  return (
    <AuthGate>
      {(user, onUserChange) => (
        <DashboardShell
          currentUser={user}
          onLogout={async () => {
            await logout();
            onUserChange(null);
          }}
        />
      )}
    </AuthGate>
  );
}
