import { useEffect, useState } from "react";
import type {
  AppVersionDto,
  AuthenticatedUserDto,
  DashboardSummaryDto,
} from "@company-erp/shared";
import { getAppVersion, getDashboardSummary } from "../../apiClient";

export type LoadState<T> =
  | { status: "loading"; data: T }
  | { status: "success"; data: T }
  | { status: "error"; data: T };

export type DashboardLiveData = {
  dashboardSummary: LoadState<DashboardSummaryDto | null>;
  appVersion: LoadState<AppVersionDto | null>;
};

export const emptyDashboardData: DashboardLiveData = {
  dashboardSummary: { status: "loading", data: null },
  appVersion: { status: "loading", data: null },
};

export function useDashboardLiveData(
  currentUser: AuthenticatedUserDto,
): DashboardLiveData {
  const [data, setData] = useState<DashboardLiveData>(emptyDashboardData);

  useEffect(() => {
    let mounted = true;
    setData(emptyDashboardData);

    async function load() {
      const [dashboardSummary, appVersion] = await Promise.all([
        getDashboardSummary()
          .then(
            (summary): LoadState<DashboardSummaryDto | null> => ({
              status: "success",
              data: summary,
            }),
          )
          .catch(
            (): LoadState<DashboardSummaryDto | null> => ({
              status: "error",
              data: null,
            }),
          ),
        getAppVersion()
          .then(
            (version): LoadState<AppVersionDto | null> => ({
              status: "success",
              data: version,
            }),
          )
          .catch(
            (): LoadState<AppVersionDto | null> => ({
              status: "error",
              data: null,
            }),
          ),
      ]);

      if (!mounted) return;
      setData({ dashboardSummary, appVersion });
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [currentUser.id]);

  return data;
}
