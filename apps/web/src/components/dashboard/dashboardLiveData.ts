import { useEffect, useState } from "react";
import type {
  AppVersionDto,
  AuthenticatedUserDto,
  CertificateRecordDto,
  ContractDto,
  DashboardSummaryDto,
  InventoryBalanceDto,
  InventoryMovementDto,
  ProjectSiteComplianceSummaryDto,
  ProjectSiteDto,
  ProjectUsageRequestDto,
  PurchaseRecordDto,
  PurchaseRequestDto,
} from "@company-erp/shared";
import { apiBaseUrl, getAppVersion, getDashboardSummary, requestJson } from "../../apiClient";

export type LoadState<T> =
  | { status: "loading"; data: T }
  | { status: "success"; data: T }
  | { status: "error"; data: T };

export type DashboardLiveData = {
  dashboardSummary: LoadState<DashboardSummaryDto | null>;
  purchaseRequests: LoadState<PurchaseRequestDto[]>;
  purchaseRecords: LoadState<PurchaseRecordDto[]>;
  inventoryMovements: LoadState<InventoryMovementDto[]>;
  inventoryBalances: LoadState<InventoryBalanceDto[]>;
  projectUsageRequests: LoadState<ProjectUsageRequestDto[]>;
  contracts: LoadState<ContractDto[]>;
  certificates: LoadState<CertificateRecordDto[]>;
  projectSites: LoadState<ProjectSiteDto[]>;
  projectSiteComplianceSummaries: LoadState<ProjectSiteComplianceSummaryDto[]>;
  appVersion: LoadState<AppVersionDto | null>;
};

export const emptyDashboardData: DashboardLiveData = {
  dashboardSummary: { status: "loading", data: null },
  purchaseRequests: { status: "loading", data: [] },
  purchaseRecords: { status: "loading", data: [] },
  inventoryMovements: { status: "loading", data: [] },
  inventoryBalances: { status: "loading", data: [] },
  projectUsageRequests: { status: "loading", data: [] },
  contracts: { status: "loading", data: [] },
  certificates: { status: "loading", data: [] },
  projectSites: { status: "loading", data: [] },
  projectSiteComplianceSummaries: { status: "loading", data: [] },
  appVersion: { status: "loading", data: null },
};

async function loadDashboardResource<T>(path: string, key: string): Promise<LoadState<T[]>> {
  try {
    const payload = await requestJson<Record<string, T[]>>(`${apiBaseUrl}${path}`);
    return { status: "success", data: Array.isArray(payload[key]) ? payload[key] : [] };
  } catch {
    return { status: "error", data: [] };
  }
}

async function loadProjectSiteComplianceSummaries(projectSites: LoadState<ProjectSiteDto[]>): Promise<LoadState<ProjectSiteComplianceSummaryDto[]>> {
  if (projectSites.status === "error") return { status: "error", data: [] };

  try {
    const summaries = await Promise.all(
      projectSites.data.map(async (site) => {
        const payload = await requestJson<{ complianceSummary: ProjectSiteComplianceSummaryDto }>(
          `${apiBaseUrl}/api/project-sites/${site.id}/compliance-summary`,
        );
        return payload.complianceSummary;
      }),
    );
    return { status: "success", data: summaries };
  } catch {
    return { status: "error", data: [] };
  }
}

export function useDashboardLiveData(currentUser: AuthenticatedUserDto, isProjectSiteOnly: boolean): DashboardLiveData {
  const [data, setData] = useState<DashboardLiveData>(emptyDashboardData);

  useEffect(() => {
    let mounted = true;
    setData(emptyDashboardData);

    async function load() {
      const appVersionPromise = getAppVersion()
        .then((version): LoadState<AppVersionDto | null> => ({ status: "success", data: version }))
        .catch((): LoadState<AppVersionDto | null> => ({ status: "error", data: null }));

      const summary = await getDashboardSummary()
        .then((dashboardSummary): LoadState<DashboardSummaryDto | null> => ({ status: "success", data: dashboardSummary }))
        .catch((): LoadState<DashboardSummaryDto | null> => ({ status: "error", data: null }));

      if (summary.status === "success") {
        const appVersion = await appVersionPromise;
        if (!mounted) return;
        setData({
          ...emptyDashboardData,
          dashboardSummary: summary,
          purchaseRequests: { status: "success", data: [] },
          purchaseRecords: { status: "success", data: [] },
          inventoryMovements: { status: "success", data: [] },
          inventoryBalances: { status: "success", data: [] },
          projectUsageRequests: { status: "success", data: [] },
          contracts: { status: "success", data: [] },
          certificates: { status: "success", data: [] },
          projectSites: { status: "success", data: [] },
          projectSiteComplianceSummaries: { status: "success", data: [] },
          appVersion,
        });
        return;
      }

      const [
        purchaseRequests,
        purchaseRecords,
        inventoryMovements,
        inventoryBalances,
        projectUsageRequests,
        contracts,
        certificates,
        projectSites,
        appVersion,
      ] = await Promise.all([
        loadDashboardResource<PurchaseRequestDto>("/api/purchase-requests", "purchaseRequests"),
        loadDashboardResource<PurchaseRecordDto>("/api/purchase-records", "purchaseRecords"),
        loadDashboardResource<InventoryMovementDto>("/api/inventory-movements", "inventoryMovements"),
        isProjectSiteOnly
          ? Promise.resolve<LoadState<InventoryBalanceDto[]>>({ status: "error", data: [] })
          : loadDashboardResource<InventoryBalanceDto>("/api/inventory-balances", "inventoryBalances"),
        loadDashboardResource<ProjectUsageRequestDto>("/api/project-usage-requests", "projectUsageRequests"),
        loadDashboardResource<ContractDto>("/api/contracts", "contracts"),
        loadDashboardResource<CertificateRecordDto>("/api/certificates", "certificates"),
        loadDashboardResource<ProjectSiteDto>("/api/project-sites", "projectSites"),
        appVersionPromise,
      ]);
      const projectSiteComplianceSummaries = await loadProjectSiteComplianceSummaries(projectSites);

      if (!mounted) return;
      setData({
        dashboardSummary: summary,
        purchaseRequests,
        purchaseRecords,
        inventoryMovements,
        inventoryBalances,
        projectUsageRequests,
        contracts,
        certificates,
        projectSites,
        projectSiteComplianceSummaries,
        appVersion,
      });
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [currentUser.id, isProjectSiteOnly]);

  return data;
}
