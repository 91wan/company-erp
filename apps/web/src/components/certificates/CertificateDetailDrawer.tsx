import { getAttachmentDownloadUrl } from "../../apiClient";
import { BusinessAttachmentsPanel } from "../BusinessAttachmentsPanel";
import { DetailDrawer } from "../ui";
import {
  CertificateDetailFields,
} from "./CertificatesWorkspaceParts";
import type { CertificatesWorkspaceController } from "./useCertificatesWorkspaceController";

export function CertificateDetailDrawer({ model }: { model: CertificatesWorkspaceController }) {
  const certificate = model.selectedCertificate;
  return (
    <DetailDrawer
      title={certificate ? `${certificate.certificateCode} ${certificate.certificateName}` : "证照详情"}
      open={Boolean(certificate)}
      onClose={() => model.setSelectedCertificateId("")}
    >
      {certificate ? (
        <>
          <CertificateDetailFields certificate={certificate} rosterPeople={model.rosterPeople} />
          <BusinessAttachmentsPanel
            ownerModule="certificates"
            ownerEntityType="certificate"
            ownerEntityId={certificate.id}
            canManage={model.canManage}
            legacyPaths={[
              { label: "附件引用（历史路径）", value: certificate.attachmentPath },
              { label: "来源文件引用（历史路径）", value: certificate.sourceFilePath },
            ]}
            loadAttachments={model.loadUnifiedAttachments}
            getAttachmentDownloadUrl={getAttachmentDownloadUrl}
          />
        </>
      ) : null}
    </DetailDrawer>
  );
}
