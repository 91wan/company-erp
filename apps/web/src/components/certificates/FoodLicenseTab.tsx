import { FileBadge } from "lucide-react";
import { SectionCard } from "../ui";
import { CertificateRiskTable } from "./CertificatesWorkspaceParts";
import type { CertificatesWorkspaceController } from "./useCertificatesWorkspaceController";

export function FoodLicenseTab({ model }: { model: CertificatesWorkspaceController }) {
  return (
    <SectionCard title="食品经营许可证" action={<FileBadge aria-hidden="true" size={18} />}>
      <CertificateRiskTable
        status={model.status}
        certificates={model.visibleCertificates}
        rosterPeople={model.rosterPeople}
        onSelectCertificate={(certificate) => model.setSelectedCertificateId(certificate.id)}
      />
    </SectionCard>
  );
}
