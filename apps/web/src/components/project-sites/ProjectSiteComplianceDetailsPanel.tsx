import { useEffect, useMemo, useState } from "react";
import {
  CERTIFICATE_TYPES,
  PROJECT_SITE_COMPLIANCE_REVIEW_STATUSES,
  PROJECT_SITE_ROSTER_STATUSES,
  PROJECT_SITE_ROSTER_WORKER_TYPES,
  type CertificateRecordDto,
  type ProjectSiteEmployerLiabilityInsuranceCoveredPersonDto,
  type ProjectSiteEmployerLiabilityInsurancePolicyDto,
  type ProjectSitePayrollSubmissionDto,
  type ProjectSiteRosterPersonDto,
} from "@company-erp/shared";
import { apiBaseUrl, requestJson } from "../../apiClient";
import { certificateStatusToBadge, payrollStatusToBadge } from "../statusMappers";
import { DataTable, EmptyState, SectionCard, StatusBadge } from "../ui";

export type ProjectSiteComplianceDetailSection = "all" | "rosterHealth" | "foodLicense" | "insurance" | "payroll";

type LoadStatus = "loading" | "ready" | "error";

type ComplianceDetails = {
  rosterPeople: ProjectSiteRosterPersonDto[];
  certificates: CertificateRecordDto[];
  insurancePolicies: ProjectSiteEmployerLiabilityInsurancePolicyDto[];
  coveredPersons: ProjectSiteEmployerLiabilityInsuranceCoveredPersonDto[];
  payrollSubmissions: ProjectSitePayrollSubmissionDto[];
};

const emptyDetails: ComplianceDetails = {
  rosterPeople: [],
  certificates: [],
  insurancePolicies: [],
  coveredPersons: [],
  payrollSubmissions: [],
};

const rosterWorkerTypeLabel = new Map(PROJECT_SITE_ROSTER_WORKER_TYPES.map((item) => [item.code, item.label]));
const rosterStatusLabel = new Map(PROJECT_SITE_ROSTER_STATUSES.map((item) => [item.code, item.label]));
const reviewStatusLabel = new Map(PROJECT_SITE_COMPLIANCE_REVIEW_STATUSES.map((item) => [item.code, item.label]));
const certificateTypeLabel = new Map(CERTIFICATE_TYPES.map((item) => [item.code, item.label]));

export function ProjectSiteComplianceDetailsPanel({
  siteId,
  section = "all",
}: {
  siteId: string;
  section?: ProjectSiteComplianceDetailSection;
}) {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [details, setDetails] = useState<ComplianceDetails>(emptyDetails);

  useEffect(() => {
    let mounted = true;
    setStatus("loading");
    loadComplianceDetails(siteId)
      .then((nextDetails) => {
        if (!mounted) return;
        setDetails(nextDetails);
        setStatus("ready");
      })
      .catch(() => {
        if (!mounted) return;
        setDetails(emptyDetails);
        setStatus("error");
      });

    return () => {
      mounted = false;
    };
  }, [siteId]);

  const healthCertificates = useMemo(
    () => details.certificates.filter((certificate) => certificate.certificateType === "person_health_cert"),
    [details.certificates],
  );
  const foodLicenses = useMemo(
    () => details.certificates.filter((certificate) => certificate.certificateType === "food_operation_license"),
    [details.certificates],
  );

  if (status === "loading") return <p className="form-helper">合规明细加载中...</p>;
  if (status === "error") return <p className="form-error">合规明细暂不可用，请稍后重试。</p>;

  return (
    <div className="project-site-compliance-details">
      {section === "all" || section === "rosterHealth" ? (
        <>
          <RosterPeopleSection rosterPeople={details.rosterPeople} />
          <CertificatesSection
            title="健康证明细"
            certificates={healthCertificates}
            emptyTitle="暂无健康证记录"
            emptyDescription="该项目点暂无可见健康证记录。"
          />
        </>
      ) : null}

      {section === "all" || section === "foodLicense" ? (
        <CertificatesSection
          title="食品经营许可证"
          certificates={foodLicenses}
          emptyTitle="暂无食品经营许可证"
          emptyDescription="该项目点暂无可见食品经营许可证记录。"
        />
      ) : null}

      {section === "all" || section === "insurance" ? (
        <InsurancePoliciesSection insurancePolicies={details.insurancePolicies} coveredPersons={details.coveredPersons} />
      ) : null}

      {section === "all" || section === "payroll" ? (
        <PayrollSubmissionsSection payrollSubmissions={details.payrollSubmissions} />
      ) : null}
    </div>
  );
}

function RosterPeopleSection({ rosterPeople }: { rosterPeople: ProjectSiteRosterPersonDto[] }) {
  return (
    <SectionCard title="项目点现场人员明细">
      <DataTable
        headers={["姓名", "类型", "岗位", "手机号", "身份证后四位", "状态"]}
        rows={rosterPeople.map((person) => [
          person.personName,
          rosterWorkerTypeLabel.get(person.workerType) ?? "项目点现场人员",
          person.jobRole ?? "-",
          person.phone ?? "-",
          person.identityNoLast4 ?? "-",
          rosterStatusLabel.get(person.status) ?? person.status,
        ])}
        emptyState={<EmptyState title="暂无项目点现场人员" description="该项目点暂无可见现场人员明细。" />}
      />
    </SectionCard>
  );
}

function CertificatesSection({
  title,
  certificates,
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  certificates: CertificateRecordDto[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  return (
    <SectionCard title={title}>
      <DataTable
        headers={["证照", "类型", "归属对象", "证号", "到期/复核", "状态", "总部确认"]}
        rows={certificates.map((certificate) => {
          const status = certificateStatusToBadge(certificate.computedStatus);
          return [
            certificate.certificateName,
            certificateTypeLabel.get(certificate.certificateType) ?? certificate.certificateType,
            certificate.ownerRosterPersonName ?? certificate.ownerProjectSiteName ?? certificate.ownerNameSnapshot,
            certificate.certificateNumber ?? "-",
            certificate.expiryDate ?? certificate.nextReviewDate ?? "-",
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>,
            certificate.confirmedAt ? "已确认" : "待总部确认",
          ];
        })}
        emptyState={<EmptyState title={emptyTitle} description={emptyDescription} />}
      />
    </SectionCard>
  );
}

function InsurancePoliciesSection({
  insurancePolicies,
  coveredPersons,
}: {
  insurancePolicies: ProjectSiteEmployerLiabilityInsurancePolicyDto[];
  coveredPersons: ProjectSiteEmployerLiabilityInsuranceCoveredPersonDto[];
}) {
  return (
    <>
      <SectionCard title="保单明细">
        <DataTable
          headers={["保单号", "保险公司", "起止日期", "审核状态", "备注"]}
          rows={insurancePolicies.map((policy) => [
            policy.policyNo,
            policy.insurerName,
            `${policy.startDate} 至 ${policy.endDate}`,
            <StatusBadge tone={payrollStatusToBadge(policy.reviewStatus).tone}>
              {reviewStatusLabel.get(policy.reviewStatus) ?? payrollStatusToBadge(policy.reviewStatus).label}
            </StatusBadge>,
            policy.remark ?? "-",
          ])}
          emptyState={<EmptyState title="暂无雇主责任险保单" description="该项目点暂无可见雇主责任险保单。" />}
        />
      </SectionCard>
      <SectionCard title="被保人员明细">
        <DataTable
          headers={["被保人", "绑定项目点现场人员", "身份证后四位", "保单", "备注"]}
          rows={coveredPersons.map((person) => {
            const policy = insurancePolicies.find((item) => item.id === person.policyId);
            return [
              person.coveredNameSnapshot,
              person.rosterPersonName ?? "未绑定",
              person.identityNoLast4Snapshot ?? "-",
              policy?.policyNo ?? person.policyId,
              person.remark ?? "-",
            ];
          })}
          emptyState={<EmptyState title="暂无被保人员" description="该项目点暂无可见被保人员明细。" />}
        />
      </SectionCard>
    </>
  );
}

function PayrollSubmissionsSection({
  payrollSubmissions,
}: {
  payrollSubmissions: ProjectSitePayrollSubmissionDto[];
}) {
  return (
    <SectionCard title="月度提交记录">
      <DataTable
        headers={["月份", "提交人", "提交时间", "审核状态", "备注"]}
        rows={payrollSubmissions.map((submission) => {
          const status = payrollStatusToBadge(submission.reviewStatus);
          return [
            submission.payrollMonth,
            submission.submittedBy ?? "-",
            submission.submittedAt,
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>,
            submission.remark ?? "-",
          ];
        })}
        emptyState={<EmptyState title="暂无工资表提交" description="该项目点暂无可见工资表提交记录。" />}
      />
    </SectionCard>
  );
}

async function loadComplianceDetails(siteId: string): Promise<ComplianceDetails> {
  const [rosterPeople, certificates, insurancePolicies, coveredPersons, payrollSubmissions] = await Promise.all([
    loadRosterPeople(siteId),
    loadCertificates(siteId),
    loadInsurancePolicies(siteId),
    loadCoveredPersons(siteId),
    loadPayrollSubmissions(siteId),
  ]);

  return {
    rosterPeople,
    certificates,
    insurancePolicies,
    coveredPersons,
    payrollSubmissions,
  };
}

async function loadRosterPeople(siteId: string): Promise<ProjectSiteRosterPersonDto[]> {
  const params = new URLSearchParams({ projectSiteId: siteId });
  const payload = await requestJson<{ rosterPeople: ProjectSiteRosterPersonDto[] }>(
    `${apiBaseUrl}/api/project-site-roster-persons?${params.toString()}`,
  );
  return payload.rosterPeople.filter((person) => person.projectSiteId === siteId);
}

async function loadCertificates(siteId: string): Promise<CertificateRecordDto[]> {
  const payload = await requestJson<{ certificates: CertificateRecordDto[] }>(`${apiBaseUrl}/api/certificates`);
  return payload.certificates.filter(
    (certificate) => certificate.ownerProjectSiteId === siteId || certificate.ownerRosterPersonProjectSiteId === siteId,
  );
}

async function loadInsurancePolicies(siteId: string): Promise<ProjectSiteEmployerLiabilityInsurancePolicyDto[]> {
  const params = new URLSearchParams({ projectSiteId: siteId });
  const payload = await requestJson<{ insurancePolicies: ProjectSiteEmployerLiabilityInsurancePolicyDto[] }>(
    `${apiBaseUrl}/api/employer-liability-insurance-policies?${params.toString()}`,
  );
  return payload.insurancePolicies.filter((policy) => policy.projectSiteId === siteId);
}

async function loadCoveredPersons(siteId: string): Promise<ProjectSiteEmployerLiabilityInsuranceCoveredPersonDto[]> {
  const params = new URLSearchParams({ projectSiteId: siteId });
  const payload = await requestJson<{ coveredPersons: ProjectSiteEmployerLiabilityInsuranceCoveredPersonDto[] }>(
    `${apiBaseUrl}/api/employer-liability-insurance-covered-persons?${params.toString()}`,
  );
  return payload.coveredPersons;
}

async function loadPayrollSubmissions(siteId: string): Promise<ProjectSitePayrollSubmissionDto[]> {
  const params = new URLSearchParams({ projectSiteId: siteId });
  const payload = await requestJson<{ payrollSubmissions: ProjectSitePayrollSubmissionDto[] }>(
    `${apiBaseUrl}/api/project-site-payroll-submissions?${params.toString()}`,
  );
  return payload.payrollSubmissions.filter((submission) => submission.projectSiteId === siteId);
}
