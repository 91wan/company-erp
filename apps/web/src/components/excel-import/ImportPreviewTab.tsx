import { UploadCloud } from "lucide-react";
import { SectionCard } from "../ui";
import { TemplateDownloadControls } from "./TemplateDownloadControls";
import type { ExcelImportController } from "./useExcelImportController";

export function ImportPreviewTab({ model }: { model: ExcelImportController }) {
  if (!model.canManage) {
    return (
      <SectionCard title="导入模板">
        <TemplateDownloadControls
          templateType={model.templateType}
          onTemplateTypeChange={model.setTemplateType}
        />
        <p className="workspace-state">当前账号可以下载模板和查看导入记录，不能执行导入预检。</p>
      </SectionCard>
    );
  }

  return (
    <div className="workspace-form import-preview-form" aria-label="导入预检表单">
      <h3>导入预检</h3>
      <TemplateDownloadControls
        templateType={model.templateType}
        onTemplateTypeChange={model.setTemplateType}
      />
      <label>
        <span>Excel 文件</span>
        <input
          aria-label="Excel 文件"
          type="file"
          accept=".xlsx"
          onChange={(event) => model.setFile(event.target.files?.[0] ?? null)}
        />
      </label>
      <button
        className="primary-action"
        type="button"
        disabled={model.actionStatus === "saving"}
        onClick={() => void model.handlePreview()}
      >
        <UploadCloud aria-hidden="true" size={16} />
        {model.actionStatus === "saving" ? "预检中" : "导入预检"}
      </button>
    </div>
  );
}
