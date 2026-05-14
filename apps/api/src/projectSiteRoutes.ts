import type { FastifyInstance } from "fastify";
import type { AuthenticatedRequest } from "./auth.js";
import { externalProjectSiteAccountSiteIds, isOutsideProjectSiteScope, redactProjectUsageRequestForResponse, scopedProjectSiteIds, writeAuditLog, type BuildAppOptions } from "./appRouteContext.js";
import { ProjectSiteConflictError, ProjectSiteValidationError, ProjectUsageRequestConflictError, ProjectUsageRequestValidationError, normalizeCoveredPersonInput, normalizeInsurancePolicyFilters, normalizeInsurancePolicyInput, normalizeIssueProjectUsageRequestInput, normalizePayrollSubmissionFilters, normalizePayrollSubmissionInput, normalizeProjectSiteFilters, normalizeProjectSiteInput, normalizeProjectSiteKitchenEquipmentChangeRequestFilters, normalizeProjectSiteKitchenEquipmentChangeRequestInput, normalizeProjectSiteKitchenEquipmentChangeRequestReviewInput, normalizeProjectSiteKitchenEquipmentFilters, normalizeProjectSiteKitchenEquipmentInput, normalizeProjectUsageRequestFilters, normalizeProjectUsageRequestInput, normalizeRosterPersonFilters, normalizeRosterPersonInput } from "./projectSites.js";

async function coveredPersonScopeFailure(
  request: unknown,
  options: BuildAppOptions,
  input: { policyId: string; rosterPersonId?: string | null },
): Promise<{ statusCode: number; body: Record<string, unknown> } | null> {
  const scope = scopedProjectSiteIds(request);
  if (scope === null) return null;
  if (!options.projectSiteComplianceRepository) {
    return { statusCode: 503, body: { error: "PROJECT_SITE_COMPLIANCE_REPOSITORY_NOT_CONFIGURED" } };
  }

  const policies = await options.projectSiteComplianceRepository.listInsurancePolicies({ projectSiteIds: scope });
  if (!policies.some((policy) => policy.id === input.policyId)) {
    return { statusCode: 404, body: { error: "PROJECT_SITE_INSURANCE_POLICY_NOT_FOUND" } };
  }

  if (input.rosterPersonId) {
    const rosterPeople = await options.projectSiteComplianceRepository.listRosterPeople({ projectSiteIds: scope });
    if (!rosterPeople.some((person) => person.id === input.rosterPersonId)) {
      return { statusCode: 404, body: { error: "PROJECT_SITE_ROSTER_PERSON_NOT_FOUND" } };
    }
  }

  return null;
}

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
      await writeAuditLog(request, options, {
        action: "project_site_roster_person.create",
        entityType: "project_site_roster_person",
        entityId: rosterPerson.id,
        afterJson: rosterPerson,
      });
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
      await writeAuditLog(request, options, {
        action: "employer_liability_insurance_policy.create",
        entityType: "employer_liability_insurance_policy",
        entityId: insurancePolicy.id,
        afterJson: insurancePolicy,
      });
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
      const scopeFailure = await coveredPersonScopeFailure(request, options, input);
      if (scopeFailure) return reply.status(scopeFailure.statusCode).send(scopeFailure.body);
      const coveredPerson = await options.projectSiteComplianceRepository.createCoveredPerson(input);
      await writeAuditLog(request, options, {
        action: "employer_liability_insurance_covered_person.create",
        entityType: "employer_liability_insurance_covered_person",
        entityId: coveredPerson.id,
        afterJson: coveredPerson,
      });
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
      await writeAuditLog(request, options, {
        action: "project_site_payroll_submission.create",
        entityType: "project_site_payroll_submission",
        entityId: payrollSubmission.id,
        afterJson: payrollSubmission,
      });
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

  app.get("/api/project-site-kitchen-equipment", async (request, reply) => {
    if (!options.projectSiteKitchenEquipmentRepository) {
      return reply.status(503).send({ error: "PROJECT_SITE_KITCHEN_EQUIPMENT_REPOSITORY_NOT_CONFIGURED" });
    }
    try {
      const scope = scopedProjectSiteIds(request);
      if (scope?.length === 0) return { kitchenEquipment: [] };
      const filters = {
        ...normalizeProjectSiteKitchenEquipmentFilters(request.query as Record<string, unknown>),
        ...(scope ? { projectSiteIds: scope } : {}),
      };
      if (filters.projectSiteId && isOutsideProjectSiteScope(scope, filters.projectSiteId)) return { kitchenEquipment: [] };
      const kitchenEquipment = await options.projectSiteKitchenEquipmentRepository.listEquipment(filters);
      return { kitchenEquipment };
    } catch (error) {
      if (error instanceof ProjectSiteValidationError) {
        return reply.status(400).send({ error: "PROJECT_SITE_KITCHEN_EQUIPMENT_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });

  app.post("/api/project-site-kitchen-equipment", async (request, reply) => {
    if (!options.projectSiteKitchenEquipmentRepository) {
      return reply.status(503).send({ error: "PROJECT_SITE_KITCHEN_EQUIPMENT_REPOSITORY_NOT_CONFIGURED" });
    }
    if (externalProjectSiteAccountSiteIds(request) !== null) {
      return reply.status(403).send({ error: "FORBIDDEN", permissionArea: "projectSiteKitchenEquipment", requiredLevel: "manage" });
    }
    try {
      const input = normalizeProjectSiteKitchenEquipmentInput(request.body, "create");
      if (isOutsideProjectSiteScope(scopedProjectSiteIds(request), input.projectSiteId)) {
        return reply.status(404).send({ error: "PROJECT_SITE_NOT_FOUND" });
      }
      const kitchenEquipment = await options.projectSiteKitchenEquipmentRepository.createEquipment(input);
      return reply.status(201).send({ kitchenEquipment });
    } catch (error) {
      if (error instanceof ProjectSiteValidationError) {
        return reply.status(400).send({ error: "PROJECT_SITE_KITCHEN_EQUIPMENT_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });

  app.patch("/api/project-site-kitchen-equipment/:id", async (request, reply) => {
    if (!options.projectSiteKitchenEquipmentRepository) {
      return reply.status(503).send({ error: "PROJECT_SITE_KITCHEN_EQUIPMENT_REPOSITORY_NOT_CONFIGURED" });
    }
    if (externalProjectSiteAccountSiteIds(request) !== null) {
      return reply.status(403).send({ error: "FORBIDDEN", permissionArea: "projectSiteKitchenEquipment", requiredLevel: "manage" });
    }
    try {
      const { id } = request.params as { id: string };
      const input = normalizeProjectSiteKitchenEquipmentInput(request.body, "update");
      if (input.projectSiteId && isOutsideProjectSiteScope(scopedProjectSiteIds(request), input.projectSiteId)) {
        return reply.status(404).send({ error: "PROJECT_SITE_NOT_FOUND" });
      }
      const kitchenEquipment = await options.projectSiteKitchenEquipmentRepository.updateEquipment(id, input);
      if (!kitchenEquipment) return reply.status(404).send({ error: "PROJECT_SITE_KITCHEN_EQUIPMENT_NOT_FOUND" });
      if (isOutsideProjectSiteScope(scopedProjectSiteIds(request), kitchenEquipment.projectSiteId)) {
        return reply.status(404).send({ error: "PROJECT_SITE_KITCHEN_EQUIPMENT_NOT_FOUND" });
      }
      return { kitchenEquipment };
    } catch (error) {
      if (error instanceof ProjectSiteValidationError) {
        return reply.status(400).send({ error: "PROJECT_SITE_KITCHEN_EQUIPMENT_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });

  app.get("/api/project-site-kitchen-equipment-change-requests", async (request, reply) => {
    if (!options.projectSiteKitchenEquipmentRepository) {
      return reply.status(503).send({ error: "PROJECT_SITE_KITCHEN_EQUIPMENT_REPOSITORY_NOT_CONFIGURED" });
    }
    try {
      const scope = scopedProjectSiteIds(request);
      if (scope?.length === 0) return { kitchenEquipmentChangeRequests: [] };
      const filters = {
        ...normalizeProjectSiteKitchenEquipmentChangeRequestFilters(request.query as Record<string, unknown>),
        ...(scope ? { projectSiteIds: scope } : {}),
      };
      if (filters.projectSiteId && isOutsideProjectSiteScope(scope, filters.projectSiteId)) {
        return { kitchenEquipmentChangeRequests: [] };
      }
      const kitchenEquipmentChangeRequests = await options.projectSiteKitchenEquipmentRepository.listChangeRequests(filters);
      return { kitchenEquipmentChangeRequests };
    } catch (error) {
      if (error instanceof ProjectSiteValidationError) {
        return reply.status(400).send({ error: "PROJECT_SITE_KITCHEN_EQUIPMENT_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });

  app.post("/api/project-site-kitchen-equipment-change-requests", async (request, reply) => {
    if (!options.projectSiteKitchenEquipmentRepository) {
      return reply.status(503).send({ error: "PROJECT_SITE_KITCHEN_EQUIPMENT_REPOSITORY_NOT_CONFIGURED" });
    }
    try {
      const input = normalizeProjectSiteKitchenEquipmentChangeRequestInput(request.body);
      const externalSiteIds = externalProjectSiteAccountSiteIds(request);
      const scopedInput =
        externalSiteIds !== null
          ? {
              ...input,
              projectSiteId: externalSiteIds[0] ?? input.projectSiteId,
              submittedByAccountId: (request as AuthenticatedRequest).currentUser?.id ?? input.submittedByAccountId,
              submittedByNameSnapshot:
                (request as AuthenticatedRequest).currentUser?.externalProjectSiteContactName ?? input.submittedByNameSnapshot,
              submittedByPhoneSnapshot:
                (request as AuthenticatedRequest).currentUser?.externalProjectSiteContactPhone ?? input.submittedByPhoneSnapshot,
            }
          : input;
      if (isOutsideProjectSiteScope(scopedProjectSiteIds(request), scopedInput.projectSiteId)) {
        return reply.status(404).send({ error: "PROJECT_SITE_NOT_FOUND" });
      }
      const kitchenEquipmentChangeRequest = await options.projectSiteKitchenEquipmentRepository.createChangeRequest(scopedInput);
      return reply.status(201).send({ kitchenEquipmentChangeRequest });
    } catch (error) {
      if (error instanceof ProjectSiteValidationError) {
        return reply.status(400).send({ error: "PROJECT_SITE_KITCHEN_EQUIPMENT_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });

  app.post("/api/project-site-kitchen-equipment-change-requests/:id/review", async (request, reply) => {
    if (!options.projectSiteKitchenEquipmentRepository) {
      return reply.status(503).send({ error: "PROJECT_SITE_KITCHEN_EQUIPMENT_REPOSITORY_NOT_CONFIGURED" });
    }
    if (externalProjectSiteAccountSiteIds(request) !== null) {
      return reply.status(403).send({ error: "FORBIDDEN", permissionArea: "projectSiteKitchenEquipment", requiredLevel: "manage" });
    }
    try {
      const { id } = request.params as { id: string };
      const user = (request as AuthenticatedRequest).currentUser;
      const input = normalizeProjectSiteKitchenEquipmentChangeRequestReviewInput(request.body);
      const kitchenEquipmentChangeRequest = await options.projectSiteKitchenEquipmentRepository.reviewChangeRequest(id, {
        ...input,
        reviewedByEmployeeId: input.reviewedByEmployeeId ?? user?.employeeId ?? null,
        reviewedByEmployeeName: input.reviewedByEmployeeName ?? user?.employeeName ?? null,
      });
      if (!kitchenEquipmentChangeRequest) {
        return reply.status(404).send({ error: "PROJECT_SITE_KITCHEN_EQUIPMENT_CHANGE_REQUEST_NOT_FOUND" });
      }
      if (isOutsideProjectSiteScope(scopedProjectSiteIds(request), kitchenEquipmentChangeRequest.projectSiteId)) {
        return reply.status(404).send({ error: "PROJECT_SITE_KITCHEN_EQUIPMENT_CHANGE_REQUEST_NOT_FOUND" });
      }
      return { kitchenEquipmentChangeRequest };
    } catch (error) {
      if (error instanceof ProjectSiteValidationError) {
        return reply.status(400).send({ error: "PROJECT_SITE_KITCHEN_EQUIPMENT_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
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
      await writeAuditLog(request, options, {
        action: "project_usage_request.issue",
        entityType: "project_usage_request",
        entityId: projectUsageRequest.id,
        afterJson: projectUsageRequest,
      });
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
