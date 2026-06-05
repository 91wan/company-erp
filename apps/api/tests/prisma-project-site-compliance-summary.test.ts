import { describe, expect, it, vi } from "vitest";
import { createPrismaProjectSiteComplianceRepository } from "../src/infra/prisma/prismaProjectSitesRepository";

const site = {
  id: "site-1",
  siteCode: "SITE-001",
  siteName: "示例项目点",
  payrollAgencyRequired: false,
};

const site2 = {
  id: "site-2",
  siteCode: "SITE-002",
  siteName: "第二项目点",
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
          projectSiteId: site.id,
          startDate: new Date("2026-01-01T00:00:00.000Z"),
          endDate: new Date("2027-01-01T00:00:00.000Z"),
          reviewStatus: "approved",
          coveredPeople: [{ rosterPersonId: "roster-1" }],
        },
      ]),
    },
    projectSitePayrollSubmission: {
      findFirst: vi.fn(async () => null),
      findMany: vi.fn(async () => []),
    },
  };
}

function createBatchComplianceClient({
  sites: allSites = [site],
  rosterPeople = [{ id: "roster-1", projectSiteId: site.id }],
  healthCertificates = [] as unknown[],
  policies = [] as unknown[],
  foodLicenses = [] as unknown[],
  payrollSubmissions = [] as unknown[],
} = {}) {
  return {
    projectSite: {
      findUnique: vi.fn(async () => null),
      findMany: vi.fn(async () => allSites),
    },
    projectSiteRosterPerson: {
      findMany: vi.fn(async () => rosterPeople),
    },
    certificateRecord: {
      findMany: vi.fn(async (args: { where?: { certificateType?: string } }) => {
        if (args.where?.certificateType === "person_health_cert") return healthCertificates;
        return foodLicenses;
      }),
    },
    projectSiteEmployerLiabilityInsurancePolicy: {
      findMany: vi.fn(async () => policies),
    },
    projectSitePayrollSubmission: {
      findFirst: vi.fn(async () => null),
      findMany: vi.fn(async () => payrollSubmissions),
    },
  };
}

describe("getComplianceSummaries (batch)", () => {
  it("issues a fixed number of queries regardless of site count", async () => {
    const prisma = createBatchComplianceClient({
      sites: [site, site2],
      rosterPeople: [
        { id: "roster-1", projectSiteId: site.id },
        { id: "roster-2", projectSiteId: site2.id },
      ],
    });

    const summaries = await createPrismaProjectSiteComplianceRepository(prisma as never).getComplianceSummaries();

    expect(summaries).toHaveLength(2);
    // projectSite.findMany called once (batch), NOT once per site
    expect(prisma.projectSite.findMany).toHaveBeenCalledTimes(1);
    // projectSiteRosterPerson.findMany called once for all sites combined
    expect(prisma.projectSiteRosterPerson.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.projectSiteRosterPerson.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ projectSiteId: { in: [site.id, site2.id] } }) })
    );
    // certificateRecord.findMany called at most twice (health + food) — not 2× per site
    expect(prisma.certificateRecord.findMany).toHaveBeenCalledTimes(2);
  });

  it("returns correct per-site counts from batched data", async () => {
    const prisma = createBatchComplianceClient({
      sites: [site, site2],
      rosterPeople: [
        { id: "roster-1", projectSiteId: site.id },
        { id: "roster-2", projectSiteId: site2.id },
      ],
      healthCertificates: [
        // site-1: roster-1 has an expired cert
        {
          ownerRosterPersonId: "roster-1",
          isDisabled: false,
          validityType: "fixed_expiry",
          expiryDate: new Date("2025-01-01T00:00:00.000Z"),
          nextReviewDate: null,
          reminderDays: 30,
        },
        // site-2: roster-2 is valid
        {
          ownerRosterPersonId: "roster-2",
          isDisabled: false,
          validityType: "fixed_expiry",
          expiryDate: new Date("2027-01-01T00:00:00.000Z"),
          nextReviewDate: null,
          reminderDays: 30,
        },
      ],
      policies: [
        {
          projectSiteId: site.id,
          startDate: new Date("2026-01-01T00:00:00.000Z"),
          endDate: new Date("2027-01-01T00:00:00.000Z"),
          reviewStatus: "approved",
          coveredPeople: [{ rosterPersonId: "roster-1" }],
        },
        {
          projectSiteId: site2.id,
          startDate: new Date("2026-01-01T00:00:00.000Z"),
          endDate: new Date("2027-01-01T00:00:00.000Z"),
          reviewStatus: "approved",
          coveredPeople: [{ rosterPersonId: "roster-2" }],
        },
      ],
    });

    const summaries = await createPrismaProjectSiteComplianceRepository(prisma as never).getComplianceSummaries();
    const s1 = summaries.find((s) => s.projectSiteId === site.id);
    const s2 = summaries.find((s) => s.projectSiteId === site2.id);

    expect(s1).toMatchObject({ expiredHealthCertificateCount: 1, missingHealthCertificateCount: 0 });
    expect(s2).toMatchObject({ expiredHealthCertificateCount: 0, missingHealthCertificateCount: 0 });
  });

  it("returns empty array when no sites exist", async () => {
    const prisma = createBatchComplianceClient({ sites: [] });
    const summaries = await createPrismaProjectSiteComplianceRepository(prisma as never).getComplianceSummaries();
    expect(summaries).toEqual([]);
    expect(prisma.projectSiteRosterPerson.findMany).not.toHaveBeenCalled();
  });
});

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
