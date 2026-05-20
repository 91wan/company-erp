import { FileBadge } from "lucide-react";
import { SectionCard } from "../ui";
import { CertificateRiskTable } from "./CertificatesWorkspaceParts";
import type { CertificatesWorkspaceController } from "./useCertificatesWorkspaceController";

export function CertificateRiskTab({ model }: { model: CertificatesWorkspaceController }) {
  return (
    <SectionCard title="证照风险台账" action={<FileBadge aria-hidden="true" size={18} />}>
      <CertificateRiskTable
        status={model.status}
        certificates={model.visibleCertificates}
        rosterPeople={model.rosterPeople}
        onSelectCertificate={(certificate) => model.setSelectedCertificateId(certificate.id)}
      />
    </SectionCard>
  );
}
