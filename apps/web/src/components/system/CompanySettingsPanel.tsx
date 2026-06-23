import { useState, type FormEvent } from "react";
import type { AppConfigDto } from "@company-erp/shared";
import { formatApiError, updateAppConfig } from "../../apiClient";
import { FieldError, useFormErrors, useToast } from "../ui";

type CompanySettingsPanelProps = {
  companyName: string;
  canManage: boolean;
  onCompanyNameChange: (appConfig: AppConfigDto) => void;
};

export function CompanySettingsPanel({ companyName, canManage, onCompanyNameChange }: CompanySettingsPanelProps) {
  const [nextCompanyName, setNextCompanyName] = useState(companyName);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [settingsError, setSettingsError] = useState("");
  const companyV = useFormErrors<"companyName">();
  const toast = useToast();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!companyV.validate({ companyName: nextCompanyName.trim() ? undefined : "请填写公司名称" })) return;
    setStatus("saving");
    setSettingsError("");
    try {
      const appConfig = await updateAppConfig({ companyName: nextCompanyName });
      onCompanyNameChange(appConfig);
      setNextCompanyName(appConfig.companyName);
      setStatus("success");
      toast.notify("系统设置已保存", "success");
    } catch (error) {
      setSettingsError(formatApiError(error, "保存失败，请检查权限或公司名称。"));
      setStatus("error");
    }
  }

  return (
    <form ref={companyV.formRef} noValidate className="dashboard-panel workspace-form settings-form" onSubmit={handleSubmit}>
      <div className="form-header">
        <div>
          <h3>公司名称</h3>
          <p>当前显示：{companyName}</p>
        </div>
        {canManage ? (
          <button type="submit" className="primary-action" disabled={status === "saving"}>
            {status === "saving" ? "保存中" : "保存设置"}
          </button>
        ) : null}
      </div>

      <label>
        <span>公司名称</span>
        <input
          {...companyV.fieldProps("companyName")}
          value={nextCompanyName}
          onChange={(event) => {
            companyV.clearError("companyName");
            setNextCompanyName(event.target.value);
          }}
          disabled={!canManage}
          maxLength={80}
          required
        />
      </label>
      <FieldError name="companyName" errors={companyV.errors} errorId={companyV.errorId} />

      {status === "error" ? <p className="form-error">{settingsError || "保存失败，请检查权限或公司名称。"}</p> : null}
      {!canManage ? <p className="form-hint">当前账号没有 systemSettings.manage 权限，不能修改公司名称。</p> : null}
    </form>
  );
}
