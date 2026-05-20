import type { CertificateRecordDto } from "@company-erp/shared";
import type { CertificateStatusFilter, CertificateTab } from "./certificateWorkspaceTypes";

export function filterCertificates({
  certificates,
  query,
  statusFilter,
}: {
  certificates: CertificateRecordDto[];
  query: string;
  statusFilter: CertificateStatusFilter;
}) {
  const normalizedQuery = query.trim().toLowerCase();
  return certificates.filter((certificate) => {
    const matchesStatus = statusFilter === "all" || certificate.computedStatus === statusFilter;
    const matchesQuery =
      normalizedQuery.length === 0 ||
      [
        certificate.certificateCode,
        certificate.certificateName,
        certificate.ownerNameSnapshot,
        certificate.certificateNumber,
        certificate.issuingAuthority,
        certificate.attachmentPath,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery));
    return matchesStatus && matchesQuery;
  });
}

export function visibleCertificatesForTab(certificates: CertificateRecordDto[], activeTab: CertificateTab) {
  return certificates.filter((certificate) => {
    if (activeTab === "review") return certificate.isComplianceCritical && !certificate.confirmedAt && !certificate.isDisabled;
    if (activeTab === "health") return certificate.certificateType === "person_health_cert";
    if (activeTab === "food") return certificate.certificateType === "food_operation_license";
    if (activeTab === "other") return certificate.certificateType !== "person_health_cert" && certificate.certificateType !== "food_operation_license";
    return (
      certificate.computedStatus === "expired" ||
      certificate.computedStatus === "expiring_soon" ||
      certificate.computedStatus === "review_due" ||
      certificate.computedStatus === "review_due_soon"
    );
  });
}
