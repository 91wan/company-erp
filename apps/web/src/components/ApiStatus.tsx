import { useEffect, useState } from "react";

export type HealthResponse = {
  status: string;
  service: string;
};

type ApiStatusProps = {
  loadHealth?: () => Promise<HealthResponse>;
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

async function defaultLoadHealth(): Promise<HealthResponse> {
  const response = await fetch(`${apiBaseUrl}/health`);

  if (!response.ok) {
    throw new Error(`Health check failed with ${response.status}`);
  }

  return response.json() as Promise<HealthResponse>;
}

export function ApiStatus({ loadHealth = defaultLoadHealth }: ApiStatusProps) {
  const [state, setState] = useState<"loading" | "online" | "offline">("loading");

  useEffect(() => {
    let mounted = true;

    loadHealth()
      .then(() => {
        if (mounted) setState("online");
      })
      .catch(() => {
        if (mounted) setState("offline");
      });

    return () => {
      mounted = false;
    };
  }, [loadHealth]);

  if (state === "loading") {
    return <div className="api-status neutral">Checking API</div>;
  }

  if (state === "online") {
    return <div className="api-status success">API online</div>;
  }

  return <div className="api-status danger">API offline</div>;
}
