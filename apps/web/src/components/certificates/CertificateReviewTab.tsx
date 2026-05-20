import { FileBadge } from "lucide-react";
import { SectionCard } from "../ui";
import { CertificateRiskTable } from "./CertificatesWorkspaceParts";
import type { CertificatesWorkspaceController } from "./useCertificatesWorkspaceController";

export function CertificateReviewTab({ model }: { model: CertificatesWorkspaceController }) {
  return (
    <SectionCard title="待审核资料" action={<FileBadge aria-hidden="true" size={18} />}>
      <CertificateRiskTable
        status={model.status}
        certificates={model.visibleCertificates}
        rosterPeople={model.rosterPeople}
        onSelectCertificate={(certificate) => model.setSelectedCertificateId(certificate.id)}
      />
    </SectionCard>
  );
}
