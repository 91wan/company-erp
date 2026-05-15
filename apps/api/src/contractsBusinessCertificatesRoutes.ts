import type { FastifyInstance } from "fastify";
import type { CreateCertificateRecordInput, UpdateCertificateRecordInput } from "@company-erp/shared";
import { certificateFiltersForRequest, isOutsideCertificateScope, isOutsideProjectSiteScope, scopedProjectSiteIds, writeAuditLog, type BuildAppOptions } from "./appRouteContext.js";
import { BusinessProjectConflictError, BusinessProjectValidationError, normalizeBusinessProjectFilters, normalizeBusinessProjectInput } from "./businessProjects.js";
import {
  CertificateConflictError,
  CertificateValidationError,
  normalizeCertificateFilters,
  normalizeCertificateInput,
  validateCertificateOwnerState,
} from "./certificates.js";
import {
  ContractConflictError,
  ContractValidationError,
  normalizeContractAttachmentInput,
  normalizeContractFilters,
  normalizeContractInput,
  validateContractEndDateState,
} from "./contracts.js";

type CertificateOwnerScopeInput = Pick<
  CreateCertificateRecordInput | UpdateCertificateRecordInput,
  "ownerType" | "ownerEmployeeId" | "ownerRosterPersonId" | "ownerProjectSiteId" | "ownerPartyId"
>;

async function certificateOwnerScopeFailure(
  request: unknown,
  options: BuildAppOptions,
  owner: CertificateOwnerScopeInput,
): Promise<{ statusCode: number; body: Record<string, unknown> } | null> {
  const scope = scopedProjectSiteIds(request);
  if (scope === null) return null;

  if (owner.ownerType === "project_site") {
    return isOutsideProjectSiteScope(scope, owner.ownerProjectSiteId)
      ? { statusCode: 404, body: { error: "CERTIFICATE_NOT_FOUND" } }
      : null;
  }

  if (owner.ownerType === "person") {
    if (owner.ownerEmployeeId) {
      return { statusCode: 403, body: { error: "FORBIDDEN", permissionArea: "certificates", requiredLevel: "manage" } };
    }
    if (!owner.ownerRosterPersonId) return { statusCode: 404, body: { error: "PROJECT_SITE_ROSTER_PERSON_NOT_FOUND" } };
    if (!options.projectSiteComplianceRepository) {
      return { statusCode: 503, body: { error: "PROJECT_SITE_COMPLIANCE_REPOSITORY_NOT_CONFIGURED" } };
    }

    const scopedRosterPeople = await options.projectSiteComplianceRepository.listRosterPeople({ projectSiteIds: scope });
    return scopedRosterPeople.some((person) => person.id === owner.ownerRosterPersonId)
      ? null
      : { statusCode: 404, body: { error: "PROJECT_SITE_ROSTER_PERSON_NOT_FOUND" } };
  }

  return { statusCode: 403, body: { error: "FORBIDDEN", permissionArea: "certificates", requiredLevel: "manage" } };
}

export function registerContractsBusinessCertificatesRoutes(app: FastifyInstance, options: BuildAppOptions) {
  app.get("/api/contracts", async (request, reply) => {
    if (!options.contractRepository) {
      return reply.status(503).send({ error: "CONTRACT_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const scope = scopedProjectSiteIds(request);
      if (scope?.length === 0) return { contracts: [] };
      const filters = {
        ...normalizeContractFilters(request.query as Record<string, unknown>),
        ...(scope ? { projectSiteIds: scope } : {}),
      };
      const contracts = await options.contractRepository.list(filters);
      return { contracts };
    } catch (error) {
      if (error instanceof ContractValidationError) {
        return reply.status(400).send({ error: "CONTRACT_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });

  app.get("/api/business-projects", async (request, reply) => {
    if (!options.businessProjectRepository) {
      return reply.status(503).send({ error: "BUSINESS_PROJECT_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const filters = normalizeBusinessProjectFilters(request.query as Record<string, unknown>);
      const businessProjects = await options.businessProjectRepository.list(filters);
      return { businessProjects };
    } catch (error) {
      if (error instanceof BusinessProjectValidationError) {
        return reply.status(400).send({ error: "BUSINESS_PROJECT_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });

  app.get("/api/business-projects/:id", async (request, reply) => {
    if (!options.businessProjectRepository) {
      return reply.status(503).send({ error: "BUSINESS_PROJECT_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    const businessProject = await options.businessProjectRepository.getById(id);
    if (!businessProject) return reply.status(404).send({ error: "BUSINESS_PROJECT_NOT_FOUND" });
    return { businessProject };
  });

  app.post("/api/business-projects", async (request, reply) => {
    if (!options.businessProjectRepository) {
      return reply.status(503).send({ error: "BUSINESS_PROJECT_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const input = normalizeBusinessProjectInput(request.body, "create");
      const businessProject = await options.businessProjectRepository.create(input);
      await writeAuditLog(request, options, {
        action: "business_project.create",
        entityType: "business_project",
        entityId: businessProject.id,
        afterJson: businessProject,
      });
      return reply.status(201).send({ businessProject });
    } catch (error) {
      if (error instanceof BusinessProjectValidationError) {
        return reply.status(400).send({ error: "BUSINESS_PROJECT_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof BusinessProjectConflictError) {
        return reply.status(409).send({ error: "BUSINESS_PROJECT_CONFLICT", field: error.field });
      }
      throw error;
    }
  });

  app.patch("/api/business-projects/:id", async (request, reply) => {
    if (!options.businessProjectRepository) {
      return reply.status(503).send({ error: "BUSINESS_PROJECT_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    try {
      const input = normalizeBusinessProjectInput(request.body, "update");
      const before = await options.businessProjectRepository.getById(id);
      const businessProject = await options.businessProjectRepository.update(id, input);
      if (!businessProject) return reply.status(404).send({ error: "BUSINESS_PROJECT_NOT_FOUND" });
      await writeAuditLog(request, options, {
        action: "business_project.update",
        entityType: "business_project",
        entityId: businessProject.id,
        beforeJson: before,
        afterJson: businessProject,
      });
      return { businessProject };
    } catch (error) {
      if (error instanceof BusinessProjectValidationError) {
        return reply.status(400).send({ error: "BUSINESS_PROJECT_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof BusinessProjectConflictError) {
        return reply.status(409).send({ error: "BUSINESS_PROJECT_CONFLICT", field: error.field });
      }
      throw error;
    }
  });

  app.get("/api/business-projects/:id/investment-summary", async (request, reply) => {
    if (!options.businessProjectRepository) {
      return reply.status(503).send({ error: "BUSINESS_PROJECT_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    const investmentSummary = await options.businessProjectRepository.getInvestmentSummary(id);
    if (!investmentSummary) return reply.status(404).send({ error: "BUSINESS_PROJECT_NOT_FOUND" });
    return { investmentSummary };
  });

  app.get("/api/contracts/:id", async (request, reply) => {
    if (!options.contractRepository) {
      return reply.status(503).send({ error: "CONTRACT_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    const contract = await options.contractRepository.getById(id);
    if (isOutsideProjectSiteScope(scopedProjectSiteIds(request), contract?.projectSiteId)) {
      return reply.status(404).send({ error: "CONTRACT_NOT_FOUND" });
    }
    if (!contract) return reply.status(404).send({ error: "CONTRACT_NOT_FOUND" });
    return { contract };
  });

  app.post("/api/contracts", async (request, reply) => {
    if (!options.contractRepository) {
      return reply.status(503).send({ error: "CONTRACT_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const input = normalizeContractInput(request.body, "create");
      const contract = await options.contractRepository.create(input);
      await writeAuditLog(request, options, {
        action: "contract.create",
        entityType: "contract",
        entityId: contract.id,
        afterJson: contract,
      });
      return reply.status(201).send({ contract });
    } catch (error) {
      if (error instanceof ContractValidationError) {
        return reply.status(400).send({ error: "CONTRACT_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof ContractConflictError) {
        return reply.status(409).send({ error: "CONTRACT_CONFLICT", field: error.field });
      }
      throw error;
    }
  });

  app.patch("/api/contracts/:id", async (request, reply) => {
    if (!options.contractRepository) {
      return reply.status(503).send({ error: "CONTRACT_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    try {
      const input = normalizeContractInput(request.body, "update");
      const current = await options.contractRepository.getById(id);
      if (isOutsideProjectSiteScope(scopedProjectSiteIds(request), current?.projectSiteId)) {
        return reply.status(404).send({ error: "CONTRACT_NOT_FOUND" });
      }
      if (!current) return reply.status(404).send({ error: "CONTRACT_NOT_FOUND" });
      const finalStateIssues = validateContractEndDateState({
        contractForm: input.contractForm ?? current.contractForm,
        endDate: input.endDate !== undefined ? input.endDate : current.endDate,
      });
      if (finalStateIssues.length > 0) throw new ContractValidationError(finalStateIssues);
      const contract = await options.contractRepository.update(id, input);
      if (!contract) return reply.status(404).send({ error: "CONTRACT_NOT_FOUND" });
      await writeAuditLog(request, options, {
        action: "contract.update",
        entityType: "contract",
        entityId: contract.id,
        beforeJson: current,
        afterJson: contract,
      });
      return { contract };
    } catch (error) {
      if (error instanceof ContractValidationError) {
        return reply.status(400).send({ error: "CONTRACT_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof ContractConflictError) {
        return reply.status(409).send({ error: "CONTRACT_CONFLICT", field: error.field });
      }
      throw error;
    }
  });

  app.get("/api/contracts/:id/attachments", async (request, reply) => {
    if (!options.contractRepository) {
      return reply.status(503).send({ error: "CONTRACT_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    const contract = await options.contractRepository.getById(id);
    if (isOutsideProjectSiteScope(scopedProjectSiteIds(request), contract?.projectSiteId)) {
      return reply.status(404).send({ error: "CONTRACT_NOT_FOUND" });
    }
    if (!contract) return reply.status(404).send({ error: "CONTRACT_NOT_FOUND" });
    const contractAttachments = await options.contractRepository.listAttachments(id);
    if (!contractAttachments) return reply.status(404).send({ error: "CONTRACT_NOT_FOUND" });
    return { contractAttachments };
  });

  app.post("/api/contracts/:id/attachments", async (request, reply) => {
    if (!options.contractRepository) {
      return reply.status(503).send({ error: "CONTRACT_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    try {
      const input = normalizeContractAttachmentInput(request.body, "create");
      const contractAttachment = await options.contractRepository.createAttachment(id, input);
      await writeAuditLog(request, options, {
        action: "contract_attachment.create",
        entityType: "contract_attachment",
        entityId: contractAttachment.id,
        afterJson: contractAttachment,
      });
      return reply.status(201).send({ contractAttachment });
    } catch (error) {
      if (error instanceof ContractValidationError) {
        return reply.status(400).send({ error: "CONTRACT_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });

  app.patch("/api/contract-attachments/:id", async (request, reply) => {
    if (!options.contractRepository) {
      return reply.status(503).send({ error: "CONTRACT_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    try {
      const input = normalizeContractAttachmentInput(request.body, "update");
      const contractAttachment = await options.contractRepository.updateAttachment(id, input);
      if (!contractAttachment) return reply.status(404).send({ error: "CONTRACT_ATTACHMENT_NOT_FOUND" });
      await writeAuditLog(request, options, {
        action: "contract_attachment.update",
        entityType: "contract_attachment",
        entityId: contractAttachment.id,
        afterJson: contractAttachment,
      });
      return { contractAttachment };
    } catch (error) {
      if (error instanceof ContractValidationError) {
        return reply.status(400).send({ error: "CONTRACT_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });

  app.get("/api/certificates", async (request, reply) => {
    if (!options.certificateRepository) {
      return reply.status(503).send({ error: "CERTIFICATE_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const scopeFilters = certificateFiltersForRequest(request);
      if ("projectSiteIds" in scopeFilters && scopeFilters.projectSiteIds?.length === 0) {
        return { certificates: [] };
      }
      const filters = {
        ...normalizeCertificateFilters(request.query as Record<string, unknown>),
        ...scopeFilters,
      };
      const certificates = await options.certificateRepository.list(filters);
      return { certificates };
    } catch (error) {
      if (error instanceof CertificateValidationError) {
        return reply.status(400).send({ error: "CERTIFICATE_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });

  app.get("/api/certificates/:id", async (request, reply) => {
    if (!options.certificateRepository) {
      return reply.status(503).send({ error: "CERTIFICATE_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    const certificate = await options.certificateRepository.getById(id);
    if (isOutsideCertificateScope(request, certificate)) {
      return reply.status(404).send({ error: "CERTIFICATE_NOT_FOUND" });
    }
    if (!certificate) return reply.status(404).send({ error: "CERTIFICATE_NOT_FOUND" });
    return { certificate };
  });

  app.post("/api/certificates", async (request, reply) => {
    if (!options.certificateRepository) {
      return reply.status(503).send({ error: "CERTIFICATE_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const input = normalizeCertificateInput(request.body, "create");
      const scopeFailure = await certificateOwnerScopeFailure(request, options, input);
      if (scopeFailure) return reply.status(scopeFailure.statusCode).send(scopeFailure.body);
      const certificate = await options.certificateRepository.create(input);
      await writeAuditLog(request, options, {
        action: "certificate.create",
        entityType: "certificate",
        entityId: certificate.id,
        afterJson: certificate,
      });
      return reply.status(201).send({ certificate });
    } catch (error) {
      if (error instanceof CertificateValidationError) {
        return reply.status(400).send({ error: "CERTIFICATE_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof CertificateConflictError) {
        return reply.status(409).send({ error: "CERTIFICATE_CONFLICT", field: error.field });
      }
      throw error;
    }
  });

  app.patch("/api/certificates/:id", async (request, reply) => {
    if (!options.certificateRepository) {
      return reply.status(503).send({ error: "CERTIFICATE_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    try {
      const current = await options.certificateRepository.getById(id);
      if (!current) return reply.status(404).send({ error: "CERTIFICATE_NOT_FOUND" });
      if (isOutsideCertificateScope(request, current)) {
        return reply.status(404).send({ error: "CERTIFICATE_NOT_FOUND" });
      }
      const input = normalizeCertificateInput(request.body, "update");
      const finalOwner = {
        ownerType: input.ownerType ?? current.ownerType,
        ownerEmployeeId: input.ownerEmployeeId !== undefined ? input.ownerEmployeeId : current.ownerEmployeeId,
        ownerRosterPersonId: input.ownerRosterPersonId !== undefined ? input.ownerRosterPersonId : current.ownerRosterPersonId,
        ownerProjectSiteId: input.ownerProjectSiteId !== undefined ? input.ownerProjectSiteId : current.ownerProjectSiteId,
        ownerPartyId: input.ownerPartyId !== undefined ? input.ownerPartyId : current.ownerPartyId,
      };
      const ownerIssues = validateCertificateOwnerState({
        ownerType: finalOwner.ownerType,
        ownerEmployeeId: finalOwner.ownerEmployeeId,
        ownerRosterPersonId: finalOwner.ownerRosterPersonId,
        ownerProjectSiteId: finalOwner.ownerProjectSiteId,
        ownerPartyId: finalOwner.ownerPartyId,
      });
      if (ownerIssues.length > 0) throw new CertificateValidationError(ownerIssues);
      const scopeFailure = await certificateOwnerScopeFailure(request, options, finalOwner);
      if (scopeFailure) return reply.status(scopeFailure.statusCode).send(scopeFailure.body);
      const certificate = await options.certificateRepository.update(id, input);
      if (!certificate) return reply.status(404).send({ error: "CERTIFICATE_NOT_FOUND" });
      await writeAuditLog(request, options, {
        action: "certificate.update",
        entityType: "certificate",
        entityId: certificate.id,
        beforeJson: current,
        afterJson: certificate,
      });
      return { certificate };
    } catch (error) {
      if (error instanceof CertificateValidationError) {
        return reply.status(400).send({ error: "CERTIFICATE_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof CertificateConflictError) {
        return reply.status(409).send({ error: "CERTIFICATE_CONFLICT", field: error.field });
      }
      throw error;
    }
  });
}
