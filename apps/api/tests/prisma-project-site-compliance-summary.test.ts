import { describe, expect, it, vi } from "vitest";
import { createPrismaProjectSiteComplianceRepository } from "../src/prismaProjectSitesRepository";

const site = {
  id: "site-1",
  siteCode: "SITE-001",
  siteName: "示例项目点",
  payrollAgencyRequired: false,
};

function createComplianceClient({
  healthCertificates = [],
}: {
  healthCertificates?: unknown[];
}) {
  return {
    projectSite: {
      findUnique: vi.fn(async () => site),
      findMany: vi.fn(async () => [{ id: site.id }]),
    },
    projectSiteRosterPerson: {
      findMany: vi.fn(async () => [{ id: "roster-1" }]),
    },
    certificateRecord: {
      findMany: vi.fn(async (args) => {
        if (args.where?.certificateType === "person_health_cert") {
          expect(args.where).toMatchObject({ ownerRosterPersonId: { in: ["roster-1"] } });
          return healthCertificates;
        }
        return [];
      }),
    },
    projectSiteEmployerLiabilityInsurancePolicy: {
      findMany: vi.fn(async () => [
        {
          startDate: new Date("2026-01-01T00:00:00.000Z"),
          endDate: new Date("2027-01-01T00:00:00.000Z"),
          reviewStatus: "approved",
          coveredPeople: [{ rosterPersonId: "roster-1" }],
        },
      ]),
    },
    projectSitePayrollSubmission: {
      findFirst: vi.fn(async () => null),
    },
  };
}

describe("Prisma project-site compliance summary", () => {
  it("does not count company health certificates in project-site compliance", async () => {
    const prisma = createComplianceClient({
      healthCertificates: [
        {
          ownerEmployeeId: "employee-1",
          ownerRosterPersonId: null,
          isDisabled: false,
          validityType: "fixed_expiry",
          expiryDate: new Date("2026-05-01T00:00:00.000Z"),
          nextReviewDate: null,
          reminderDays: 30,
        },
        {
          ownerEmployeeId: null,
          ownerRosterPersonId: "roster-1",
          isDisabled: false,
          validityType: "fixed_expiry",
          expiryDate: new Date("2027-01-01T00:00:00.000Z"),
          nextReviewDate: null,
          reminderDays: 30,
        },
      ],
    });

    const summary = await createPrismaProjectSiteComplianceRepository(prisma as never).getComplianceSummary(site.id);

    expect(summary).toMatchObject({
      missingHealthCertificateCount: 0,
      expiredHealthCertificateCount: 0,
      blockingIssueCount: 1,
    });
  });

  it("counts expired project-site health certificates in project-site compliance", async () => {
    const prisma = createComplianceClient({
      healthCertificates: [
        {
          ownerEmployeeId: null,
          ownerRosterPersonId: "roster-1",
          isDisabled: false,
          validityType: "fixed_expiry",
          expiryDate: new Date("2026-05-01T00:00:00.000Z"),
          nextReviewDate: null,
          reminderDays: 30,
        },
      ],
    });

    const summary = await createPrismaProjectSiteComplianceRepository(prisma as never).getComplianceSummary(site.id);

    expect(summary).toMatchObject({
      missingHealthCertificateCount: 0,
      expiredHealthCertificateCount: 1,
      blockingIssueCount: 2,
    });
  });
});
