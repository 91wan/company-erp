import { CERTIFICATE_OWNER_TYPES, type CertificateOwnerTypeCode } from "@company-erp/shared";
import type { ExternalProjectSitePortalSection } from "../project-sites/ExternalProjectSitePortal";
import type { CertificateFormState } from "./certificateWorkspaceTypes";

export function certificatePortalOwnerType(section: ExternalProjectSitePortalSection | undefined): CertificateOwnerTypeCode | undefined {
  if (section === "foodLicense") return "project_site";
  if (section === "rosterHealth") return "person";
  return undefined;
}

export function buildCertificateOwnerOptions({
  allowedOwnerTypes,
  allowedPersonOwnerSources,
  portalSection,
}: {
  allowedOwnerTypes?: readonly CertificateOwnerTypeCode[];
  allowedPersonOwnerSources?: readonly CertificateFormState["ownerPersonSource"][];
  portalSection?: ExternalProjectSitePortalSection;
}) {
  const ownerTypeOptions = CERTIFICATE_OWNER_TYPES.filter((item) => !allowedOwnerTypes || allowedOwnerTypes.includes(item.code));
  const personOwnerSourceOptions = (allowedPersonOwnerSources ?? ["employee", "roster"]) as readonly CertificateFormState["ownerPersonSource"][];
  const portalOwnerType = certificatePortalOwnerType(portalSection);
  const defaultOwnerType = ownerTypeOptions.find((item) => item.code === portalOwnerType)?.code ?? ownerTypeOptions[0]?.code ?? "company";
  const defaultPersonOwnerSource = personOwnerSourceOptions[0] ?? "employee";

  return {
    defaultOwnerType,
    defaultPersonOwnerSource,
    ownerTypeOptions,
    personOwnerSourceOptions,
    portalOwnerType,
    shouldLoadEmployees: ownerTypeOptions.some((item) => item.code === "person") && personOwnerSourceOptions.includes("employee"),
    shouldLoadRosterPeople: ownerTypeOptions.some((item) => item.code === "person") && personOwnerSourceOptions.includes("roster"),
    shouldLoadProjectSites: ownerTypeOptions.some((item) => item.code === "project_site"),
    shouldLoadParties: ownerTypeOptions.some((item) => item.code === "supplier" || item.code === "company"),
  };
}
