import { describe, expect, it } from "vitest";
import {
  certificateStatusToBadge,
  contractExpiryToBadge,
  inventoryRiskToBadge,
  payrollStatusToBadge,
  projectSiteComplianceStatusToBadge,
  projectUsageStatusToBadge,
} from "../src/components/statusMappers";

describe("status mappers", () => {
  it("maps blocking compliance states to danger", () => {
    for (const status of ["missing", "expired", "rejected", "review_due"]) {
      expect(projectSiteComplianceStatusToBadge(status)).toMatchObject({ tone: "danger" });
    }
  });

  it("maps warning compliance states to warning", () => {
    for (const status of ["pending", "expiring_soon", "review_due_soon"]) {
      expect(projectSiteComplianceStatusToBadge(status)).toMatchObject({ tone: "warning" });
    }
  });

  it("maps success and not-applicable states consistently", () => {
    expect(projectSiteComplianceStatusToBadge("valid")).toMatchObject({ label: "正常", tone: "success" });
    expect(projectSiteComplianceStatusToBadge("approved")).toMatchObject({ label: "已通过", tone: "success" });
    expect(projectSiteComplianceStatusToBadge("not_required")).toMatchObject({ label: "不需要", tone: "notApplicable" });
    expect(projectSiteComplianceStatusToBadge("not_applicable")).toMatchObject({ label: "不适用", tone: "notApplicable" });
  });

  it("maps domain statuses to Chinese labels and tones", () => {
    expect(certificateStatusToBadge("expired")).toEqual({ label: "已过期", tone: "danger" });
    expect(contractExpiryToBadge("expiring_soon")).toEqual({ label: "即将到期", tone: "warning" });
    expect(payrollStatusToBadge("rejected")).toEqual({ label: "已驳回", tone: "danger" });
    expect(projectUsageStatusToBadge("issued")).toEqual({ label: "已出库", tone: "success" });
    expect(inventoryRiskToBadge(true)).toEqual({ label: "低库存", tone: "danger" });
  });
});
