import type { FastifyInstance } from "fastify";
import type { BuildAppOptions } from "./appRouteContext.js";
import type { AuthenticatedRequest } from "./auth.js";
import { externalProjectSiteAccountSiteIds, isOutsideProjectSiteScope, redactProjectUsageRequestForResponse, scopedProjectSiteIds } from "./appRouteContext.js";
import { ProjectSiteConflictError, ProjectSiteValidationError, ProjectUsageRequestConflictError, ProjectUsageRequestValidationError, normalizeCoveredPersonInput, normalizeInsurancePolicyFilters, normalizeInsurancePolicyInput, normalizeIssueProjectUsageRequestInput, normalizePayrollSubmissionFilters, normalizePayrollSubmissionInput, normalizeProjectSiteFilters, normalizeProjectSiteInput, normalizeProjectUsageRequestFilters, normalizeProjectUsageRequestInput, normalizeRosterPersonFilters, normalizeRosterPersonInput } from "./projectSites.js";

export function registerProjectSiteRoutes(app: FastifyInstance, options: BuildAppOptions) {
  app.get("/api/project-sites", async (request, reply) => {
    if (!options.projectSiteRepository) {
      return reply.status(503).send({ error: "PROJECT_SITE_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const scope = scopedProjectSiteIds(request);
      if (scope?.length === 0) return { projectSites: [] };
      const filters = {
        ...normalizeProjectSiteFilters(request.query as Record<string, unknown>),
        ...(scope ? { projectSiteIds: scope } : {}),
      };
      const projectSites = await options.projectSiteRepository.list(filters);
      return { projectSites };
    } catch (error) {
      if (error instanceof ProjectSiteValidationError) {
        return reply.status(400).send({ error: "PROJECT_SITE_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });

  app.get("/api/project-sites/:id/investment-summary", async (request, reply) => {
    if (!options.projectSiteRepository) {
      return reply.status(503).send({ error: "PROJECT_SITE_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    if (isOutsideProjectSiteScope(scopedProjectSiteIds(request), id)) {
      return reply.status(404).send({ error: "PROJECT_SITE_NOT_FOUND" });
    }

    const investmentSummary = await options.projectSiteRepository.getInvestmentSummary(id);
    if (!investmentSummary) return reply.status(404).send({ error: "PROJECT_SITE_NOT_FOUND" });
    return { investmentSummary };
  });

  app.get("/api/project-sites/:id", async (request, reply) => {
    if (!options.projectSiteRepository) {
      return reply.status(503).send({ error: "PROJECT_SITE_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    const projectSite = await options.projectSiteRepository.getById(id);
    if (isOutsideProjectSiteScope(scopedProjectSiteIds(request), projectSite?.id)) {
      return reply.status(404).send({ error: "PROJECT_SITE_NOT_FOUND" });
    }
    if (!projectSite) return reply.status(404).send({ error: "PROJECT_SITE_NOT_FOUND" });
    return { projectSite };
  });

  app.post("/api/project-sites", async (request, reply) => {
    if (!options.projectSiteRepository) {
      return reply.status(503).send({ error: "PROJECT_SITE_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      if (scopedProjectSiteIds(request) !== null) {
        return reply.status(403).send({ error: "FORBIDDEN", permissionArea: "projectSites", requiredLevel: "manage" });
      }
      const input = normalizeProjectSiteInput(request.body, "create");
      const projectSite = await options.projectSiteRepository.create(input);
      return reply.status(201).send({ projectSite });
    } catch (error) {
      if (error instanceof ProjectSiteValidationError) {
        return reply.status(400).send({ error: "PROJECT_SITE_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof ProjectSiteConflictError) {
        return reply.status(409).send({ error: "PROJECT_SITE_CONFLICT", field: error.field });
      }
      throw error;
    }
  });

  app.patch("/api/project-sites/:id", async (request, reply) => {
    if (!options.projectSiteRepository) {
      return reply.status(503).send({ error: "PROJECT_SITE_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    try {
      if (scopedProjectSiteIds(request) !== null) {
        return reply.status(403).send({ error: "FORBIDDEN", permissionArea: "projectSites", requiredLevel: "manage" });
      }
      const input = normalizeProjectSiteInput(request.body, "update");
      const projectSite = await options.projectSiteRepository.update(id, input);
      if (!projectSite) return reply.status(404).send({ error: "PROJECT_SITE_NOT_FOUND" });
      return { projectSite };
    } catch (error) {
      if (error instanceof ProjectSiteValidationError) {
        return reply.status(400).send({ error: "PROJECT_SITE_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof ProjectSiteConflictError) {
        return reply.status(409).send({ error: "PROJECT_SITE_CONFLICT", field: error.field });
      }
      throw error;
    }
  });

  app.get("/api/project-site-roster-persons", async (request, reply) => {
    if (!options.projectSiteComplianceRepository) {
      return reply.status(503).send({ error: "PROJECT_SITE_COMPLIANCE_REPOSITORY_NOT_CONFIGURED" });
    }
    try {
      const scope = scopedProjectSiteIds(request);
      if (scope?.length === 0) return { rosterPeople: [] };
      const filters = {
        ...normalizeRosterPersonFilters(request.query as Record<string, unknown>),
        ...(scope ? { projectSiteIds: scope } : {}),
      };
      if (isOutsideProjectSiteScope(scope, filters.projectSiteId)) return { rosterPeople: [] };
      const rosterPeople = await options.projectSiteComplianceRepository.listRosterPeople(filters);
      return { rosterPeople };
    } catch (error) {
      if (error instanceof ProjectSiteValidationError) {
        return reply.status(400).send({ error: "PROJECT_SITE_COMPLIANCE_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });

  app.post("/api/project-site-roster-persons", async (request, reply) => {
    if (!options.projectSiteComplianceRepository) {
      return reply.status(503).send({ error: "PROJECT_SITE_COMPLIANCE_REPOSITORY_NOT_CONFIGURED" });
    }
    try {
      const input = normalizeRosterPersonInput(request.body);
      if (isOutsideProjectSiteScope(scopedProjectSiteIds(request), input.projectSiteId)) {
        return reply.status(404).send({ error: "PROJECT_SITE_NOT_FOUND" });
      }
      const rosterPerson = await options.projectSiteComplianceRepository.createRosterPerson(input);
      return reply.status(201).send({ rosterPerson });
    } catch (error) {
      if (error instanceof ProjectSiteValidationError) {
        return reply.status(400).send({ error: "PROJECT_SITE_COMPLIANCE_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });

  app.get("/api/employer-liability-insurance-policies", async (request, reply) => {
    if (!options.projectSiteComplianceRepository) {
      return reply.status(503).send({ error: "PROJECT_SITE_COMPLIANCE_REPOSITORY_NOT_CONFIGURED" });
    }
    const scope = scopedProjectSiteIds(request);
    if (scope?.length === 0) return { insurancePolicies: [] };
    const filters = {
      ...normalizeInsurancePolicyFilters(request.query as Record<string, unknown>),
      ...(scope ? { projectSiteIds: scope } : {}),
    };
    if (isOutsideProjectSiteScope(scope, filters.projectSiteId)) return { insurancePolicies: [] };
    const insurancePolicies = await options.projectSiteComplianceRepository.listInsurancePolicies(filters);
    return { insurancePolicies };
  });

  app.post("/api/employer-liability-insurance-policies", async (request, reply) => {
    if (!options.projectSiteComplianceRepository) {
      return reply.status(503).send({ error: "PROJECT_SITE_COMPLIANCE_REPOSITORY_NOT_CONFIGURED" });
    }
    try {
      const input = normalizeInsurancePolicyInput(request.body);
      if (isOutsideProjectSiteScope(scopedProjectSiteIds(request), input.projectSiteId)) {
        return reply.status(404).send({ error: "PROJECT_SITE_NOT_FOUND" });
      }
      const insurancePolicy = await options.projectSiteComplianceRepository.createInsurancePolicy(input);
      return reply.status(201).send({ insurancePolicy });
    } catch (error) {
      if (error instanceof ProjectSiteValidationError) {
        return reply.status(400).send({ error: "PROJECT_SITE_COMPLIANCE_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });

  app.post("/api/employer-liability-insurance-covered-persons", async (request, reply) => {
    if (!options.projectSiteComplianceRepository) {
      return reply.status(503).send({ error: "PROJECT_SITE_COMPLIANCE_REPOSITORY_NOT_CONFIGURED" });
    }
    try {
      const input = normalizeCoveredPersonInput(request.body);
      const coveredPerson = await options.projectSiteComplianceRepository.createCoveredPerson(input);
      return reply.status(201).send({ coveredPerson });
    } catch (error) {
      if (error instanceof ProjectSiteValidationError) {
        return reply.status(400).send({ error: "PROJECT_SITE_COMPLIANCE_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });

  app.get("/api/project-site-payroll-submissions", async (request, reply) => {
    if (!options.projectSiteComplianceRepository) {
      return reply.status(503).send({ error: "PROJECT_SITE_COMPLIANCE_REPOSITORY_NOT_CONFIGURED" });
    }
    const scope = scopedProjectSiteIds(request);
    if (scope?.length === 0) return { payrollSubmissions: [] };
    const filters = {
      ...normalizePayrollSubmissionFilters(request.query as Record<string, unknown>),
      ...(scope ? { projectSiteIds: scope } : {}),
    };
    if (isOutsideProjectSiteScope(scope, filters.projectSiteId)) return { payrollSubmissions: [] };
    const payrollSubmissions = await options.projectSiteComplianceRepository.listPayrollSubmissions(filters);
    return { payrollSubmissions };
  });

  app.post("/api/project-site-payroll-submissions", async (request, reply) => {
    if (!options.projectSiteComplianceRepository) {
      return reply.status(503).send({ error: "PROJECT_SITE_COMPLIANCE_REPOSITORY_NOT_CONFIGURED" });
    }
    try {
      const input = normalizePayrollSubmissionInput(request.body);
      if (isOutsideProjectSiteScope(scopedProjectSiteIds(request), input.projectSiteId)) {
        return reply.status(404).send({ error: "PROJECT_SITE_NOT_FOUND" });
      }
      const payrollSubmission = await options.projectSiteComplianceRepository.createPayrollSubmission(input);
      return reply.status(201).send({ payrollSubmission });
    } catch (error) {
      if (error instanceof ProjectSiteValidationError) {
        return reply.status(400).send({ error: "PROJECT_SITE_COMPLIANCE_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });

  app.get("/api/project-sites/:id/compliance-summary", async (request, reply) => {
    if (!options.projectSiteComplianceRepository) {
      return reply.status(503).send({ error: "PROJECT_SITE_COMPLIANCE_REPOSITORY_NOT_CONFIGURED" });
    }
    const { id } = request.params as { id: string };
    if (isOutsideProjectSiteScope(scopedProjectSiteIds(request), id)) {
      return reply.status(404).send({ error: "PROJECT_SITE_NOT_FOUND" });
    }
    const complianceSummary = await options.projectSiteComplianceRepository.getComplianceSummary(id);
    if (!complianceSummary) return reply.status(404).send({ error: "PROJECT_SITE_NOT_FOUND" });
    return { complianceSummary };
  });

  app.get("/api/project-usage-options", async (_request, reply) => {
    if (!options.materialRepository || !options.warehouseRepository) {
      return reply.status(503).send({ error: "PROJECT_USAGE_OPTIONS_REPOSITORY_NOT_CONFIGURED" });
    }

    const [warehouses, materials] = await Promise.all([
      options.warehouseRepository.list({ status: "enabled" }),
      options.materialRepository.list({ status: "enabled" }),
    ]);
    const defaultWarehouse =
      warehouses.find((warehouse) => warehouse.warehouseCode === "WH-WX-HQ") ?? warehouses.find((warehouse) => warehouse.status === "enabled") ?? null;

    return {
      defaultWarehouse: defaultWarehouse
        ? {
            id: defaultWarehouse.id,
            warehouseCode: defaultWarehouse.warehouseCode,
            warehouseName: defaultWarehouse.warehouseName,
          }
        : null,
      materials: materials
        .filter((material) => material.isProjectSiteSaleEnabled)
        .map((material) => ({
          id: material.id,
          materialCode: material.materialCode,
          materialName: material.materialName,
          specification: material.specification,
          unit: material.projectSiteSaleUnit || material.baseUnit,
        })),
    };
  });

  app.get("/api/project-usage-requests", async (request, reply) => {
    if (!options.projectUsageRequestRepository) {
      return reply.status(503).send({ error: "PROJECT_USAGE_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const scope = scopedProjectSiteIds(request);
      if (scope?.length === 0) return { projectUsageRequests: [] };
      const filters = {
        ...normalizeProjectUsageRequestFilters(request.query as Record<string, unknown>),
        ...(scope ? { projectSiteIds: scope } : {}),
      };
      const projectUsageRequests = await options.projectUsageRequestRepository.list(filters);
      return {
        projectUsageRequests: projectUsageRequests.map((projectUsageRequest) =>
          redactProjectUsageRequestForResponse(request, projectUsageRequest),
        ),
      };
    } catch (error) {
      if (error instanceof ProjectUsageRequestValidationError) {
        return reply.status(400).send({ error: "PROJECT_USAGE_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });

  app.get("/api/project-usage-requests/:id", async (request, reply) => {
    if (!options.projectUsageRequestRepository) {
      return reply.status(503).send({ error: "PROJECT_USAGE_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    const projectUsageRequest = await options.projectUsageRequestRepository.getById(id);
    if (isOutsideProjectSiteScope(scopedProjectSiteIds(request), projectUsageRequest?.projectSiteId)) {
      return reply.status(404).send({ error: "PROJECT_USAGE_REQUEST_NOT_FOUND" });
    }
    if (!projectUsageRequest) return reply.status(404).send({ error: "PROJECT_USAGE_REQUEST_NOT_FOUND" });
    return { projectUsageRequest: redactProjectUsageRequestForResponse(request, projectUsageRequest) };
  });

  app.post("/api/project-usage-requests", async (request, reply) => {
    if (!options.projectUsageRequestRepository) {
      return reply.status(503).send({ error: "PROJECT_USAGE_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const externalScope = externalProjectSiteAccountSiteIds(request);
      const user = (request as AuthenticatedRequest).currentUser;
      if (externalScope !== null) {
        if (externalScope.length === 0) return reply.status(404).send({ error: "PROJECT_USAGE_REQUEST_NOT_FOUND" });
      }
      let input = normalizeProjectUsageRequestInput(
        externalScope !== null
          ? {
              ...((request.body && typeof request.body === "object" && !Array.isArray(request.body)
                ? request.body
                : {}) as Record<string, unknown>),
              projectSiteId: externalScope[0],
              status: "pending",
            }
          : request.body,
        "create",
      );
      if (externalScope !== null) {
        input = {
          ...input,
          projectSiteId: externalScope[0],
          status: "pending",
          submittedByAccountId: user?.id ?? null,
          submittedByNameSnapshot: user?.externalProjectSiteContactName ?? user?.employeeName ?? null,
          submittedByPhoneSnapshot: user?.externalProjectSiteContactPhone ?? null,
        };
      }
      const scope = scopedProjectSiteIds(request);
      if (isOutsideProjectSiteScope(scope, input.projectSiteId)) {
        return reply.status(404).send({ error: "PROJECT_USAGE_REQUEST_NOT_FOUND" });
      }
      if (scope !== null && input.status && input.status !== "pending") {
        return reply.status(400).send({ error: "PROJECT_USAGE_VALIDATION_FAILED", issues: ["project-site users can only create pending usage requests"] });
      }
      const projectUsageRequest = await options.projectUsageRequestRepository.create(input);
      return reply.status(201).send({ projectUsageRequest: redactProjectUsageRequestForResponse(request, projectUsageRequest) });
    } catch (error) {
      if (error instanceof ProjectUsageRequestValidationError) {
        return reply.status(400).send({ error: "PROJECT_USAGE_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof ProjectUsageRequestConflictError) {
        return reply.status(409).send({ error: "PROJECT_USAGE_CONFLICT", field: error.field });
      }
      throw error;
    }
  });

  app.patch("/api/project-usage-requests/:id", async (request, reply) => {
    if (!options.projectUsageRequestRepository) {
      return reply.status(503).send({ error: "PROJECT_USAGE_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    try {
      if (externalProjectSiteAccountSiteIds(request) !== null) {
        return reply.status(403).send({ error: "FORBIDDEN", permissionArea: "projectUsageRequest", requiredLevel: "manage" });
      }
      const input = normalizeProjectUsageRequestInput(request.body, "update");
      const scope = scopedProjectSiteIds(request);
      if (scope !== null) {
        const current = await options.projectUsageRequestRepository.getById(id);
        if (isOutsideProjectSiteScope(scope, current?.projectSiteId)) {
          return reply.status(404).send({ error: "PROJECT_USAGE_REQUEST_NOT_FOUND" });
        }
        if (input.projectSiteId !== undefined && isOutsideProjectSiteScope(scope, input.projectSiteId)) {
          return reply.status(404).send({ error: "PROJECT_USAGE_REQUEST_NOT_FOUND" });
        }
        if (input.status && input.status !== "pending") {
          return reply.status(400).send({ error: "PROJECT_USAGE_VALIDATION_FAILED", issues: ["project-site users can only keep usage requests pending"] });
        }
      }
      const projectUsageRequest = await options.projectUsageRequestRepository.update(id, input);
      if (!projectUsageRequest) return reply.status(404).send({ error: "PROJECT_USAGE_REQUEST_NOT_FOUND" });
      return { projectUsageRequest: redactProjectUsageRequestForResponse(request, projectUsageRequest) };
    } catch (error) {
      if (error instanceof ProjectUsageRequestValidationError) {
        return reply.status(400).send({ error: "PROJECT_USAGE_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof ProjectUsageRequestConflictError) {
        return reply.status(409).send({ error: "PROJECT_USAGE_CONFLICT", field: error.field });
      }
      throw error;
    }
  });

  app.post("/api/project-usage-requests/:id/issue", async (request, reply) => {
    if (!options.projectUsageRequestRepository) {
      return reply.status(503).send({ error: "PROJECT_USAGE_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    try {
      const input = normalizeIssueProjectUsageRequestInput(request.body);
      const projectUsageRequest = await options.projectUsageRequestRepository.issue(id, input);
      if (!projectUsageRequest) return reply.status(404).send({ error: "PROJECT_USAGE_REQUEST_NOT_FOUND" });
      return reply.status(201).send({ projectUsageRequest });
    } catch (error) {
      if (error instanceof ProjectUsageRequestValidationError) {
        return reply.status(400).send({ error: "PROJECT_USAGE_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof ProjectUsageRequestConflictError) {
        return reply.status(409).send({ error: "PROJECT_USAGE_CONFLICT", field: error.field });
      }
      throw error;
    }
  });

}
