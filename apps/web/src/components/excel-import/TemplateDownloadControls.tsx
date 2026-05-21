import { Download } from "lucide-react";
import { IMPORT_TEMPLATE_TYPES, type ImportTemplateTypeCode } from "@company-erp/shared";
import { allTemplatesZipUrl, templateDownloadUrl } from "./importDownloadLinks";

export function TemplateDownloadControls({
  templateType,
  onTemplateTypeChange,
}: {
  templateType: ImportTemplateTypeCode;
  onTemplateTypeChange: (templateType: ImportTemplateTypeCode) => void;
}) {
  return (
    <div className="import-template-actions">
      <label>
        <span>模板类型</span>
        <select
          value={templateType}
          onChange={(event) => onTemplateTypeChange(event.target.value as ImportTemplateTypeCode)}
        >
          {IMPORT_TEMPLATE_TYPES.map((template) => (
            <option key={template.code} value={template.code}>{template.label}</option>
          ))}
        </select>
      </label>
      <a className="secondary-action" href={templateDownloadUrl(templateType)} download>
        <Download aria-hidden="true" size={16} />
        下载当前模板
      </a>
      <a className="secondary-action" href={allTemplatesZipUrl} download>
        <Download aria-hidden="true" size={16} />
        下载全部模板包
      </a>
    </div>
  );
}
