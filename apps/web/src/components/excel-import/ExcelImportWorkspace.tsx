import { ExcelImportWorkspaceView } from "./ExcelImportWorkspaceView";
import { useExcelImportController, type ExcelImportWorkspaceProps } from "./useExcelImportController";

export function ExcelImportWorkspace(props: ExcelImportWorkspaceProps) {
  const model = useExcelImportController(props);
  return <ExcelImportWorkspaceView model={model} />;
}
