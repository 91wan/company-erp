import { FileBadge } from "lucide-react";
import { SectionCard } from "../ui";
import { CertificateRiskTable } from "./CertificatesWorkspaceParts";
import type { CertificatesWorkspaceController } from "./useCertificatesWorkspaceController";

export function OtherCertificatesTab({ model }: { model: CertificatesWorkspaceController }) {
  return (
    <SectionCard title="其他资质" action={<FileBadge aria-hidden="true" size={18} />}>
      <CertificateRiskTable
        status={model.status}
        certificates={model.visibleCertificates}
        rosterPeople={model.rosterPeople}
        onSelectCertificate={(certificate) => model.setSelectedCertificateId(certificate.id)}
      />
    </SectionCard>
  );
}
