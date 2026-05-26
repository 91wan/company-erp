import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type {
  AppConfigDto,
  AppVersionDto,
  AttachmentRecordDto,
  AuditLogDto,
} from "@company-erp/shared";
import {
  apiBaseUrl,
  createAttachment,
  formatApiError,
  getAppVersion,
  getAttachmentDownloadUrl,
  getAttachments,
  getAuditLogExportUrl,
  getAuditLogs,
  updateAppConfig,
} from "../../apiClient";
import {
  SectionCard,
  SegmentedTabs,
  StatusBadge as UiStatusBadge,
  WorkspaceScaffold,
  type TabItem,
} from "../ui";

type SystemSettingsWorkspaceProps = {
  companyName: string;
  canManage: boolean;
  canReadAuditLogs: boolean;
  canReadAttachments: boolean;
  canManageAttachments: boolean;
  onCompanyNameChange: (appConfig: AppConfigDto) => void;
};

type SystemSettingsTab = "company" | "version" | "attachments" | "audit" | "goLive";

type GoLiveEvidenceSection = {
  title: string;
  description: string;
  commands: string[];
};

const goLiveEvidenceSections: GoLiveEvidenceSection[] = [
  {
    title: "试点与构建门禁",
    description: "先确认代码、试点导入和正式上线静态门禁全部通过。",
    commands: [
      "npm run pilot:ready",
      "npm run production:ready",
      "npm run production:readiness-gate",
    ],
  },
  {
    title: "证据包",
    description: "证据目录必须在 Git 仓库外；正式上线前运行证据包校验。",
    commands: [
      "npm run production:evidence-template -- --output <outside-git-path>",
      "npm run production:go-live-check -- --evidence-dir <outside-git-path> --base-url http://<nas>:8080 --expected-commit <sha>",
    ],
  },
  {
    title: "权限复核",
    description: "下载权限复核 JSON 后保存到证据目录，再运行 access review gate。",
    commands: [
      "GET /api/user-accounts/export-access-review",
      "npm run access:review-check -- --export <file>",
    ],
  },
  {
    title: "审计导出",
    description: "导出 CSV 后记录响应头中的 sha256 和 record count，再进行复核。",
    commands: [
      "GET /api/audit-logs/export.csv",
      "npm run audit:verify-export -- --csv <file> --sha256 <header-sha256> --record-count <header-count>",
    ],
  },
  {
    title: "附件与恢复",
    description: "附件 legacy gap、附件 readiness 和恢复演练证据必须进入正式上线证据包。",
    commands: [
      "npm run attachments:legacy-report -- --json",
      "npm run attachments:production-check -- --legacy-report <file>",
      "npm run production:restore-drill-check -- --evidence-dir <restore-drill-dir>",
    ],
  },
];

const goLiveEvidenceDocs = [
  "docs/operations/production-go-live-evidence-checklist.md",
  "docs/operations/access-review-runbook.md",
  "docs/operations/production-backup-restore-runbook.md",
];

function toAuditDateTime(
  date: string,
  boundary: "start" | "end",
): string | undefined {
  if (!date.trim()) return undefined;
  return `${date.trim()}T${boundary === "start" ? "00:00:00.000Z" : "23:59:59.999Z"}`;
}

export function SystemSettingsWorkspace({
  companyName,
  canManage,
  canReadAuditLogs,
  canReadAttachments,
  canManageAttachments,
  onCompanyNameChange,
}: SystemSettingsWorkspaceProps) {
  const [nextCompanyName, setNextCompanyName] = useState(companyName);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">(
    "idle",
  );
  const [appVersion, setAppVersion] = useState<AppVersionDto | null>(null);
  const [versionStatus, setVersionStatus] = useState<
    "loading" | "success" | "error"
  >("loading");
  const [auditLogs, setAuditLogs] = useState<AuditLogDto[]>([]);
  const [auditStatus, setAuditStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >(canReadAuditLogs ? "loading" : "idle");
  const [auditFilters, setAuditFilters] = useState({
    entityType: "",
    action: "",
    actorUsername: "",
    dateFrom: "",
    dateTo: "",
  });
  const [attachments, setAttachments] = useState<AttachmentRecordDto[]>([]);
  const [attachmentStatus, setAttachmentStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >(canReadAttachments ? "loading" : "idle");
  const [activeTab, setActiveTab] = useState<SystemSettingsTab>("company");
  const [attachmentForm, setAttachmentForm] = useState({
    attachmentCode: "",
    displayName: "",
    storageKey: "",
    ownerModule: "contracts",
    ownerEntityType: "contract",
    ownerEntityId: "",
    remark: "",
  });
  const [attachmentSaveStatus, setAttachmentSaveStatus] = useState<
    "idle" | "saving" | "success" | "error"
  >("idle");
  const [settingsError, setSettingsError] = useState("");
  const [attachmentSaveError, setAttachmentSaveError] = useState("");
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<
    string | null
  >(null);
  const [attachmentDownloadError, setAttachmentDownloadError] = useState<
    string | null
  >(null);

  const auditFilterInput = {
    entityType: auditFilters.entityType.trim() || undefined,
    action: auditFilters.action.trim() || undefined,
    actorUsername: auditFilters.actorUsername.trim() || undefined,
    dateFrom: toAuditDateTime(auditFilters.dateFrom, "start"),
    dateTo: toAuditDateTime(auditFilters.dateTo, "end"),
    limit: 20,
  };

  useEffect(() => {
    let isMounted = true;
    setVersionStatus("loading");
    getAppVersion()
      .then((version) => {
        if (!isMounted) return;
        setAppVersion(version);
        setVersionStatus("success");
      })
      .catch(() => {
        if (!isMounted) return;
        setAppVersion(null);
        setVersionStatus("error");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!canReadAuditLogs) return;
    let isMounted = true;
    setAuditStatus("loading");
    getAuditLogs(auditFilterInput)
      .then((logs) => {
        if (!isMounted) return;
        setAuditLogs(logs);
        setAuditStatus("success");
      })
      .catch(() => {
        if (!isMounted) return;
        setAuditLogs([]);
        setAuditStatus("error");
      });

    return () => {
      isMounted = false;
    };
  }, [
    auditFilters.action,
    auditFilters.actorUsername,
    auditFilters.dateFrom,
    auditFilters.dateTo,
    auditFilters.entityType,
    canReadAuditLogs,
  ]);

  useEffect(() => {
    if (!canReadAttachments) return;
    let isMounted = true;
    setAttachmentStatus("loading");
    getAttachments()
      .then((records) => {
        if (!isMounted) return;
        setAttachments(records);
        setAttachmentStatus("success");
      })
      .catch(() => {
        if (!isMounted) return;
        setAttachments([]);
        setAttachmentStatus("error");
      });

    return () => {
      isMounted = false;
    };
  }, [canReadAttachments]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setSettingsError("");
    try {
      const appConfig = await updateAppConfig({ companyName: nextCompanyName });
      onCompanyNameChange(appConfig);
      setNextCompanyName(appConfig.companyName);
      setStatus("success");
    } catch (error) {
      setSettingsError(
        formatApiError(error, "保存失败，请检查权限或公司名称。"),
      );
      setStatus("error");
    }
  }

  async function handleAttachmentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttachmentSaveStatus("saving");
    setAttachmentSaveError("");
    try {
      const attachment = await createAttachment({
        attachmentCode: attachmentForm.attachmentCode,
        displayName: attachmentForm.displayName,
        storageKey: attachmentForm.storageKey,
        ownerModule: attachmentForm.ownerModule,
        ownerEntityType: attachmentForm.ownerEntityType,
        ownerEntityId: attachmentForm.ownerEntityId.trim()
          ? attachmentForm.ownerEntityId.trim()
          : null,
        remark: attachmentForm.remark.trim()
          ? attachmentForm.remark.trim()
          : null,
      });
      setAttachments((records) => [
        attachment,
        ...records.filter((record) => record.id !== attachment.id),
      ]);
      setAttachmentForm({
        attachmentCode: "",
        displayName: "",
        storageKey: "",
        ownerModule: "contracts",
        ownerEntityType: "contract",
        ownerEntityId: "",
        remark: "",
      });
      setAttachmentStatus("success");
      setAttachmentSaveStatus("success");
    } catch (error) {
      setAttachmentSaveError(
        formatApiError(error, "附件引用格式不合法或保存失败。"),
      );
      setAttachmentSaveStatus("error");
    }
  }

  async function handleAttachmentDownload(attachment: AttachmentRecordDto) {
    setDownloadingAttachmentId(attachment.id);
    setAttachmentDownloadError(null);
    try {
      const downloadRef = await getAttachmentDownloadUrl(attachment.id);
      if (!downloadRef.startsWith("/") || downloadRef.startsWith("//")) {
        throw new Error("Unsafe attachment download reference");
      }
      window.open(
        new URL(downloadRef, apiBaseUrl).toString(),
        "_blank",
        "noopener,noreferrer",
      );
    } catch {
      setAttachmentDownloadError(
        "附件内容不可用，请检查权限或文件是否已登记到服务器。",
      );
    } finally {
      setDownloadingAttachmentId(null);
    }
  }

  const tabs: TabItem<SystemSettingsTab>[] = [
    { key: "company", label: "公司信息" },
    { key: "version", label: "版本与健康检查" },
    ...(canReadAttachments
      ? [{ key: "attachments" as const, label: "附件管理" }]
      : []),
    ...(canReadAuditLogs ? [{ key: "audit" as const, label: "审计日志" }] : []),
    ...(canManage ? [{ key: "goLive" as const, label: "正式上线证据" }] : []),
  ];

  return (
    <WorkspaceScaffold
      eyebrow="基础与系统"
      title="系统设置"
      subtitle="分区查看公司信息、部署版本、附件管理和审计日志。"
      actions={
        <UiStatusBadge tone={canManage ? "success" : "disabled"}>
          {canManage ? "管理员可修改" : "只读查看"}
        </UiStatusBadge>
      }
      tabs={
        <SegmentedTabs
          items={tabs}
          activeKey={activeTab}
          onChange={setActiveTab}
          ariaLabel="系统设置分区"
        />
      }
    >
      <section className="system-settings-workspace">
        {activeTab === "company" ? (
          <form
            className="dashboard-panel workspace-form settings-form"
            onSubmit={handleSubmit}
          >
            <div className="form-header">
              <div>
                <h3>公司名称</h3>
                <p>当前显示：{companyName}</p>
              </div>
              {canManage ? (
                <button
                  type="submit"
                  className="primary-action"
                  disabled={status === "saving"}
                >
                  {status === "saving" ? "保存中" : "保存设置"}
                </button>
              ) : null}
            </div>

            <label>
              <span>公司名称</span>
              <input
                value={nextCompanyName}
                onChange={(event) => setNextCompanyName(event.target.value)}
                disabled={!canManage}
                maxLength={80}
                required
              />
            </label>

            {status === "success" ? (
              <p className="form-success">系统设置已保存。</p>
            ) : null}
            {status === "error" ? (
              <p className="form-error">
                {settingsError || "保存失败，请检查权限或公司名称。"}
              </p>
            ) : null}
            {!canManage ? (
              <p className="form-hint">
                当前账号没有 systemSettings.manage 权限，不能修改公司名称。
              </p>
            ) : null}
          </form>
        ) : null}

        {activeTab === "version" ? (
          <SectionCard
            title="部署版本"
            badge={
              <UiStatusBadge
                tone={versionStatus === "success" ? "success" : "warning"}
              >
                {versionStatus === "success" ? "可用" : "检查中"}
              </UiStatusBadge>
            }
          >
            <p className="form-hint">
              部署元数据只读显示，用于确认 NAS 当前运行版本。
            </p>

            {versionStatus === "loading" ? (
              <p className="form-hint">版本信息加载中。</p>
            ) : null}
            {versionStatus === "error" ? (
              <p className="form-error">版本信息不可用</p>
            ) : null}
            {versionStatus === "success" && appVersion ? (
              <dl className="version-grid">
                <div>
                  <dt>短 commit</dt>
                  <dd>{appVersion.shortCommitSha}</dd>
                </div>
                <div>
                  <dt>包版本</dt>
                  <dd>{appVersion.packageVersion}</dd>
                </div>
                <div>
                  <dt>环境</dt>
                  <dd>{appVersion.environment}</dd>
                </div>
                <div>
                  <dt>构建时间</dt>
                  <dd>{appVersion.buildTime}</dd>
                </div>
                <div>
                  <dt>部署时间</dt>
                  <dd>{appVersion.deployedAt}</dd>
                </div>
              </dl>
            ) : null}
          </SectionCard>
        ) : null}

        {activeTab === "audit" && canReadAuditLogs ? (
          <SectionCard
            title="审计日志"
            badge={<UiStatusBadge tone="info">只读</UiStatusBadge>}
          >
            <div className="section-inline-header">
              <p className="form-hint">
                只读查看最近的高风险业务操作记录。导出 CSV 下载后记录
                SHA256、筛选条件、导出人和部署版本。
              </p>
              <button
                type="button"
                className="secondary-action"
                onClick={() =>
                  window.open(
                    getAuditLogExportUrl(auditFilterInput),
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
              >
                导出 CSV
              </button>
            </div>

            <div
              className="form-grid settings-filter-grid"
              aria-label="审计日志筛选"
            >
              <label>
                <span>审计对象类型</span>
                <input
                  value={auditFilters.entityType}
                  onChange={(event) =>
                    setAuditFilters((filters) => ({
                      ...filters,
                      entityType: event.target.value,
                    }))
                  }
                  placeholder="例如：证照记录"
                />
              </label>
              <label>
                <span>审计动作</span>
                <input
                  value={auditFilters.action}
                  onChange={(event) =>
                    setAuditFilters((filters) => ({
                      ...filters,
                      action: event.target.value,
                    }))
                  }
                  placeholder="例如：创建证照"
                />
              </label>
              <label>
                <span>操作账号</span>
                <input
                  value={auditFilters.actorUsername}
                  onChange={(event) =>
                    setAuditFilters((filters) => ({
                      ...filters,
                      actorUsername: event.target.value,
                    }))
                  }
                  placeholder="例如：管理员"
                />
              </label>
              <label>
                <span>审计开始日期</span>
                <input
                  type="date"
                  value={auditFilters.dateFrom}
                  onChange={(event) =>
                    setAuditFilters((filters) => ({
                      ...filters,
                      dateFrom: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                <span>审计结束日期</span>
                <input
                  type="date"
                  value={auditFilters.dateTo}
                  onChange={(event) =>
                    setAuditFilters((filters) => ({
                      ...filters,
                      dateTo: event.target.value,
                    }))
                  }
                />
              </label>
              <div className="filter-actions">
                <button
                  type="button"
                  className="secondary-action"
                  onClick={() =>
                    setAuditFilters({
                      entityType: "",
                      action: "",
                      actorUsername: "",
                      dateFrom: "",
                      dateTo: "",
                    })
                  }
                >
                  清空筛选
                </button>
              </div>
            </div>

            {auditStatus === "loading" ? (
              <p className="form-hint">审计日志加载中。</p>
            ) : null}
            {auditStatus === "error" ? (
              <p className="form-error">审计日志暂不可用</p>
            ) : null}
            {auditStatus === "success" && auditLogs.length === 0 ? (
              <p className="form-hint">暂无审计日志。</p>
            ) : null}
            {auditStatus === "success" && auditLogs.length > 0 ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>时间</th>
                      <th>账号</th>
                      <th>动作</th>
                      <th>对象</th>
                      <th>IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td>{log.createdAt}</td>
                        <td>{log.actorUsername ?? "-"}</td>
                        <td>{log.action}</td>
                        <td>{log.entityType}</td>
                        <td>{log.ip ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </SectionCard>
        ) : null}

        {activeTab === "attachments" && canReadAttachments ? (
          <SectionCard
            title="附件管理"
            badge={
              <UiStatusBadge
                tone={canManageAttachments ? "success" : "disabled"}
              >
                {canManageAttachments ? "可登记" : "只读"}
              </UiStatusBadge>
            }
          >
            <p className="form-hint">
              登记后端认可的相对存储键；不要填写 NAS
              绝对路径、网址或本地文件路径。
            </p>

            {canManageAttachments ? (
              <form
                className="workspace-form settings-form"
                onSubmit={handleAttachmentSubmit}
              >
                <div className="form-grid">
                  <label>
                    <span>附件编号</span>
                    <input
                      value={attachmentForm.attachmentCode}
                      onChange={(event) =>
                        setAttachmentForm((form) => ({
                          ...form,
                          attachmentCode: event.target.value,
                        }))
                      }
                      placeholder="ATT-DEMO-001"
                      required
                    />
                  </label>
                  <label>
                    <span>显示名称</span>
                    <input
                      value={attachmentForm.displayName}
                      onChange={(event) =>
                        setAttachmentForm((form) => ({
                          ...form,
                          displayName: event.target.value,
                        }))
                      }
                      placeholder="合同附件"
                      required
                    />
                  </label>
                  <label>
                    <span>存储键</span>
                    <input
                      value={attachmentForm.storageKey}
                      onChange={(event) =>
                        setAttachmentForm((form) => ({
                          ...form,
                          storageKey: event.target.value,
                        }))
                      }
                      placeholder="contracts/uuid.pdf"
                      required
                    />
                  </label>
                  <label>
                    <span>归属模块</span>
                    <input
                      value={attachmentForm.ownerModule}
                      onChange={(event) =>
                        setAttachmentForm((form) => ({
                          ...form,
                          ownerModule: event.target.value,
                        }))
                      }
                      required
                    />
                  </label>
                  <label>
                    <span>归属对象</span>
                    <input
                      value={attachmentForm.ownerEntityType}
                      onChange={(event) =>
                        setAttachmentForm((form) => ({
                          ...form,
                          ownerEntityType: event.target.value,
                        }))
                      }
                      required
                    />
                  </label>
                  <label>
                    <span>归属 ID（可选）</span>
                    <input
                      value={attachmentForm.ownerEntityId}
                      onChange={(event) =>
                        setAttachmentForm((form) => ({
                          ...form,
                          ownerEntityId: event.target.value,
                        }))
                      }
                      placeholder="UUID"
                    />
                  </label>
                </div>
                <label>
                  <span>备注</span>
                  <textarea
                    value={attachmentForm.remark}
                    onChange={(event) =>
                      setAttachmentForm((form) => ({
                        ...form,
                        remark: event.target.value,
                      }))
                    }
                    rows={2}
                  />
                </label>
                <button
                  type="submit"
                  className="primary-action"
                  disabled={attachmentSaveStatus === "saving"}
                >
                  {attachmentSaveStatus === "saving"
                    ? "登记中"
                    : "登记附件引用"}
                </button>
                {attachmentSaveStatus === "success" ? (
                  <p className="form-success">附件引用已登记。</p>
                ) : null}
                {attachmentSaveStatus === "error" ? (
                  <p className="form-error">
                    {attachmentSaveError || "附件引用格式不合法或保存失败。"}
                  </p>
                ) : null}
              </form>
            ) : (
              <p className="form-hint">
                当前账号只能查看附件元数据，不能登记或修改附件引用。
              </p>
            )}

            {attachmentStatus === "loading" ? (
              <p className="form-hint">附件元数据加载中。</p>
            ) : null}
            {attachmentStatus === "error" ? (
              <p className="form-error">附件元数据暂不可用</p>
            ) : null}
            {attachmentStatus === "success" && attachments.length === 0 ? (
              <p className="form-hint">暂无附件元数据。</p>
            ) : null}
            {attachmentStatus === "success" && attachments.length > 0 ? (
              <div className="table-scroll">
                {attachmentDownloadError ? (
                  <p className="form-error">{attachmentDownloadError}</p>
                ) : null}
                <table>
                  <thead>
                    <tr>
                      <th>附件编号</th>
                      <th>名称</th>
                      <th>存储键</th>
                      <th>归属</th>
                      <th>状态</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attachments.map((attachment) => (
                      <tr key={attachment.id}>
                        <td>{attachment.attachmentCode}</td>
                        <td>{attachment.displayName}</td>
                        <td>{attachment.storageKey}</td>
                        <td>
                          {attachment.ownerModule}/{attachment.ownerEntityType}
                        </td>
                        <td>
                          {attachment.status === "active" ? "启用" : "停用"}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="inline-action"
                            onClick={() =>
                              void handleAttachmentDownload(attachment)
                            }
                            disabled={downloadingAttachmentId === attachment.id}
                            aria-label={`下载/打开 ${attachment.displayName}`}
                          >
                            {downloadingAttachmentId === attachment.id
                              ? "获取中"
                              : "下载/打开"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </SectionCard>
        ) : null}

        {activeTab === "goLive" && canManage ? (
          <ProductionGoLiveEvidencePanel />
        ) : null}
      </section>
    </WorkspaceScaffold>
  );
}

function ProductionGoLiveEvidencePanel() {
  return (
    <SectionCard
      title="正式上线证据包"
      badge={<UiStatusBadge tone="warning">运维只读</UiStatusBadge>}
    >
      <p className="form-hint">
        以下内容用于公司内网正式上线审批。浏览器只展示命令和证据要求；不要在页面中输入
        secret，不要使用 Git 仓库内路径保存证据包。
      </p>
      <div className="settings-ops-grid">
        {goLiveEvidenceSections.map((section) => (
          <article className="settings-ops-card" key={section.title}>
            <h3>{section.title}</h3>
            <p className="form-hint">{section.description}</p>
            <div className="settings-command-list" aria-label={`${section.title}命令`}>
              {section.commands.map((command) => (
                <pre className="settings-command-block" key={command}>
                  <code>{command}</code>
                </pre>
              ))}
            </div>
          </article>
        ))}
      </div>
      <div className="settings-doc-links" aria-label="正式上线证据文档">
        <h3>相关文档</h3>
        <ul>
          {goLiveEvidenceDocs.map((docPath) => (
            <li key={docPath}>
              <code>{docPath}</code>
            </li>
          ))}
        </ul>
      </div>
    </SectionCard>
  );
}
