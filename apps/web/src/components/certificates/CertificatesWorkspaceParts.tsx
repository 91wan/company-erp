import { AlertTriangle, Filter, RefreshCw, Search } from "lucide-react";
import type { ReactNode } from "react";
import {
  CERTIFICATE_COMPUTED_STATUSES,
  CERTIFICATE_OWNER_TYPES,
  CERTIFICATE_TYPES,
  type CertificateComputedStatusCode,
  type CertificateRecordDto,
  type ProjectSiteRosterPersonDto,
} from "@company-erp/shared";
import { certificateStatusToBadge } from "../statusMappers";
import { DataTable, EmptyState, StatusBadge, Toolbar } from "../ui";

const typeLabel = new Map(CERTIFICATE_TYPES.map((item) => [item.code, item.label]));
const ownerLabel = new Map(CERTIFICATE_OWNER_TYPES.map((item) => [item.code, item.label]));

export function CertificateFilterToolbar({
  query,
  onQueryChange,
  statusFilter,
  onStatusFilterChange,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  statusFilter: "all" | CertificateComputedStatusCode;
  onStatusFilterChange: (value: "all" | CertificateComputedStatusCode) => void;
}) {
  return (
    <Toolbar
      search={(
        <label className="table-search">
          <Search aria-hidden="true" size={16} />
          <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="搜索证照、归属对象或证照编号" />
        </label>
      )}
      filters={(
        <label className="table-filter">
          <Filter aria-hidden="true" size={16} />
          <select value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value as "all" | CertificateComputedStatusCode)}>
            <option value="all">全部状态</option>
            {CERTIFICATE_COMPUTED_STATUSES.map((item) => (
              <option key={item.code} value={item.code}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      )}
    />
  );
}

export function CertificateRiskTable({
  status,
  certificates,
  rosterPeople,
  onSelectCertificate,
}: {
  status: "loading" | "ready" | "error";
  certificates: CertificateRecordDto[];
  rosterPeople: ProjectSiteRosterPersonDto[];
  onSelectCertificate: (certificate: CertificateRecordDto) => void;
}) {
  if (status === "loading") return <CertificateStateLine icon={<RefreshCw size={16} />} text="正在加载证照台账..." />;
  if (status === "error") return <CertificateStateLine icon={<AlertTriangle size={16} />} text="证照台账加载失败" tone="danger" />;
  return (
    <DataTable
      headers={["证照", "类型", "归属对象", "适用项目点", "到期/复核", "剩余天数", "状态", "审核状态", "人员匹配"]}
      rows={certificates.map((certificate) => {
        const computedStatus = certificateStatusToBadge(certificate.computedStatus);
        const statusTone =
          certificate.isDisabled || certificate.computedStatus === "disabled" || certificate.computedStatus === "archived"
            ? "disabled"
            : computedStatus.tone;
        return [
          <span key={`${certificate.id}-name`} className="table-cell-stack">
            <strong>{certificate.certificateName}</strong>
            <small>
              <span>{certificate.certificateCode}</span>
              <span>{certificate.certificateNumber ? ` / ${certificate.certificateNumber}` : " / 未录入证号"}</span>
            </small>
          </span>,
          typeLabel.get(certificate.certificateType) ?? certificate.certificateType,
          `${ownerLabel.get(certificate.ownerType) ?? certificate.ownerType} / ${certificate.ownerNameSnapshot}`,
          certificate.ownerProjectSiteName ?? rosterProjectSiteName(certificate, rosterPeople) ?? "待后端支持",
          certificate.expiryDate ?? certificate.nextReviewDate ?? "-",
          remainingDaysLabel(certificate),
          <StatusBadge key={`${certificate.id}-status`} tone={statusTone}>
            {computedStatus.label}
          </StatusBadge>,
          <StatusBadge key={`${certificate.id}-review`} tone={certificate.confirmedAt ? "success" : "info"}>
            {certificate.confirmedAt ? "已确认" : "待审核"}
          </StatusBadge>,
          healthMatchLabel(certificate),
        ];
      })}
      emptyState={<EmptyState title="暂无证照资料" description="可通过新增证照登记资料，或调整筛选条件。" />}
      onRowClick={(index) => onSelectCertificate(certificates[index])}
    />
  );
}

export function CertificateDetailFields({
  certificate,
  rosterPeople,
}: {
  certificate: CertificateRecordDto;
  rosterPeople: ProjectSiteRosterPersonDto[];
}) {
  return (
    <dl className="detail-list">
      <dt>归属对象</dt>
      <dd>{ownerLabel.get(certificate.ownerType)} / {certificate.ownerNameSnapshot}</dd>
      <dt>适用项目点</dt>
      <dd>{certificate.ownerProjectSiteName ?? rosterProjectSiteName(certificate, rosterPeople) ?? "待后端支持"}</dd>
      <dt>到期/复核</dt>
      <dd>{certificate.expiryDate ?? certificate.nextReviewDate ?? "-"}</dd>
      <dt>人员匹配</dt>
      <dd>{healthMatchLabel(certificate)}</dd>
      <dt>审核状态</dt>
      <dd>{certificate.confirmedAt ? `已确认：${certificate.confirmedByEmployeeName ?? "-"}` : "待审核"}</dd>
    </dl>
  );
}

export function CertificatePanelHeader({ title, icon }: { title: string; icon: ReactNode }) {
  return (
    <div className="workspace-panel-header">
      <h3>
        {icon}
        {title}
      </h3>
    </div>
  );
}

export function CertificateStateLine({
  text,
  icon,
  tone = "muted",
}: {
  text: string;
  icon?: ReactNode;
  tone?: "muted" | "danger";
}) {
  return (
    <p className={`state-line ${tone}`}>
      {icon}
      {text}
    </p>
  );
}

function remainingDaysLabel(certificate: CertificateRecordDto): string {
  const targetDate = certificate.expiryDate ?? certificate.nextReviewDate;
  if (!targetDate) return certificate.validityType === "long_term" ? "长期有效" : "待后端支持";
  const today = new Date();
  const target = new Date(targetDate);
  if (Number.isNaN(target.getTime())) return "-";
  const days = Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return `已过期 ${Math.abs(days)} 天`;
  return `${days} 天`;
}

function rosterProjectSiteName(certificate: CertificateRecordDto, rosterPeople: ProjectSiteRosterPersonDto[]): string | null {
  if (!certificate.ownerRosterPersonProjectSiteId) return null;
  return rosterPeople.find((person) => person.projectSiteId === certificate.ownerRosterPersonProjectSiteId)?.projectSiteName ?? null;
}

function healthMatchLabel(certificate: CertificateRecordDto): string {
  if (certificate.certificateType !== "person_health_cert") return "不适用";
  if (!certificate.ownerRosterPersonId) return "未绑定项目点现场人员";
  if (!certificate.ownerRosterPersonName) return "待后端支持";
  if (certificate.ownerNameSnapshot && certificate.ownerRosterPersonName !== certificate.ownerNameSnapshot) return "姓名不一致";
  return "人员已绑定，身份证后四位待后端支持";
}
