import { describe, expect, it } from "vitest";
import { complianceRiskLabel, complianceStatusTone } from "../src/components/project-sites/projectSiteComplianceStatus";
import { projectSiteComplianceSummary } from "./appTestHelpers";

describe("project site compliance status helpers", () => {
  it("maps blocking states to danger tone", () => {
    for (const status of ["blocking", "red", "missing", "expired", "rejected", "review_due"]) {
      expect(complianceStatusTone(status)).toBe("danger");
    }
  });

  it("maps pending and expiring states to warning tone", () => {
    for (const status of ["warning", "expiring", "expiring_soon", "pending", "review_due_soon"]) {
      expect(complianceStatusTone(status)).toBe("warning");
    }
  });

  it("maps valid and not-applicable states to stable tones", () => {
    expect(complianceStatusTone("valid")).toBe("success");
    expect(complianceStatusTone("approved")).toBe("success");
    expect(complianceStatusTone("not_required")).toBe("notApplicable");
    expect(complianceStatusTone("not_applicable")).toBe("notApplicable");
  });

  it("labels aggregate risk levels in Chinese", () => {
    expect(complianceRiskLabel({ ...projectSiteComplianceSummary, blockingIssueCount: 1, warningIssueCount: 0 })).toBe("红色风险");
    expect(complianceRiskLabel({ ...projectSiteComplianceSummary, blockingIssueCount: 0, warningIssueCount: 1 })).toBe("黄色预警");
    expect(complianceRiskLabel({ ...projectSiteComplianceSummary, blockingIssueCount: 0, warningIssueCount: 0 })).toBe("绿色正常");
  });
});
