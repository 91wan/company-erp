import { CertificatesWorkspaceView } from "./certificates/CertificatesWorkspaceView";
import type { CertificatesWorkspaceProps } from "./certificates/certificateWorkspaceTypes";
import { useCertificatesWorkspaceController } from "./certificates/useCertificatesWorkspaceController";

export function CertificatesWorkspace(props: CertificatesWorkspaceProps) {
  const model = useCertificatesWorkspaceController(props);
  return <CertificatesWorkspaceView model={model} />;
}
