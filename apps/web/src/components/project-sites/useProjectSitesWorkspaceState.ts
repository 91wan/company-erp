import { useCallback, useEffect, useState } from "react";
import type { ProjectUsageStatusCode } from "@company-erp/shared";
import type { ProjectSiteCreateFormState } from "./ProjectSiteCreateFormDrawer";
import type { ProjectSiteKitchenEquipmentChangeFormState } from "./ProjectSiteKitchenEquipmentChangeFormDrawer";
import type { ProjectSiteKitchenEquipmentCreateFormState } from "./ProjectSiteKitchenEquipmentCreateFormDrawer";
import type { ProjectUsageIssueFormState } from "./ProjectUsageIssueFormDrawer";
import type { ProjectUsageRequestFormState } from "./ProjectUsageRequestFormDrawer";
import {
  createInitialIssueForm,
  createInitialKitchenEquipmentChangeForm,
  createInitialKitchenEquipmentForm,
  createInitialSiteForm,
  createInitialUsageForm,
} from "./projectSiteFormState";
import type { ProjectSiteFormDrawer } from "./ProjectSitesHeadquartersView";

export function useProjectSitesWorkspaceState({
  initialEntityId,
  initialEntityType,
}: { initialEntityId?: string; initialEntityType?: string } = {}) {
  const isProjectSiteEntity = !initialEntityType || initialEntityType === "projectSite";
  const [query, setQuery] = useState("");
  const [usageFilter, setUsageFilter] = useState<"all" | ProjectUsageStatusCode>("all");
  const [selectedDetailSiteId, setSelectedDetailSiteId] = useState(isProjectSiteEntity ? initialEntityId ?? "" : "");
  const [openFormDrawer, setOpenFormDrawer] = useState<ProjectSiteFormDrawer>(null);
  const [siteForm, setSiteForm] = useState<ProjectSiteCreateFormState>(createInitialSiteForm);
  const [usageForm, setUsageForm] = useState<ProjectUsageRequestFormState>(createInitialUsageForm);
  const [issueForm, setIssueForm] = useState<ProjectUsageIssueFormState>(createInitialIssueForm);
  const [kitchenEquipmentForm, setKitchenEquipmentForm] = useState<ProjectSiteKitchenEquipmentCreateFormState>(
    createInitialKitchenEquipmentForm,
  );
  const [kitchenEquipmentChangeForm, setKitchenEquipmentChangeForm] = useState<ProjectSiteKitchenEquipmentChangeFormState>(
    createInitialKitchenEquipmentChangeForm,
  );
  const [pendingIssueConfirm, setPendingIssueConfirm] = useState(false);

  const closeFormDrawer = useCallback(() => {
    setPendingIssueConfirm(false);
    setOpenFormDrawer(null);
  }, []);

  useEffect(() => {
    if (!initialEntityId) return;
    if (initialEntityType === "projectSiteRosterPerson") {
      setSelectedDetailSiteId("");
      return;
    }
    if (!initialEntityType || initialEntityType === "projectSite") {
      setSelectedDetailSiteId(initialEntityId);
    }
  }, [initialEntityId, initialEntityType]);

  return {
    query,
    setQuery,
    usageFilter,
    setUsageFilter,
    selectedDetailSiteId,
    setSelectedDetailSiteId,
    openFormDrawer,
    setOpenFormDrawer,
    siteForm,
    setSiteForm,
    usageForm,
    setUsageForm,
    issueForm,
    setIssueForm,
    kitchenEquipmentForm,
    setKitchenEquipmentForm,
    kitchenEquipmentChangeForm,
    setKitchenEquipmentChangeForm,
    pendingIssueConfirm,
    setPendingIssueConfirm,
    closeFormDrawer,
  };
}
