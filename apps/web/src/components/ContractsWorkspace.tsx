import { ContractsWorkspaceView } from "./contracts/ContractsWorkspaceView";
import { useContractsController } from "./contracts/useContractsController";
import type { ContractsWorkspaceProps } from "./contracts/contractsTypes";

export function ContractsWorkspace(props: ContractsWorkspaceProps) {
  const model = useContractsController(props);
  return <ContractsWorkspaceView model={model} />;
}
