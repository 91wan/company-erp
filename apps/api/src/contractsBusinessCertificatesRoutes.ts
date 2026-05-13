import type { FastifyInstance } from "fastify";
import type { BuildAppOptions } from "./appRouteContext.js";
import { certificateFiltersForRequest, isOutsideCertificateScope, isOutsideProjectSiteScope, scopedProjectSiteIds } from "./appRouteContext.js";
import { BusinessProjectConflictError, BusinessProjectValidationError, normalizeBusinessProjectFilters, normalizeBusinessProjectInput } from "./businessProjects.js";
import {
  CertificateConflictError,
  CertificateValidationError,
  normalizeCertificateFilters,
  normalizeCertificateInput,
  validateCertificateOwnerState,
} from "./certificates.js";
import { ContractConflictError, ContractValidationError, normalizeContractAttachmentInput, normalizeContractFilters, normalizeContractInput } from "./contracts.js";

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
      const businessProject = await options.businessProjectRepository.update(id, input);
      if (!businessProject) return reply.status(404).send({ error: "BUSINESS_PROJECT_NOT_FOUND" });
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
      const contract = await options.contractRepository.update(id, input);
      if (!contract) return reply.status(404).send({ error: "CONTRACT_NOT_FOUND" });
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
      const certificate = await options.certificateRepository.create(input);
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
      if (isOutsideCertificateScope(request, current)) {
        return reply.status(404).send({ error: "CERTIFICATE_NOT_FOUND" });
      }
      const input = normalizeCertificateInput(request.body, "update");
      const ownerIssues = validateCertificateOwnerState({
        ownerType: input.ownerType ?? current?.ownerType,
        ownerEmployeeId: input.ownerEmployeeId !== undefined ? input.ownerEmployeeId : current?.ownerEmployeeId,
        ownerRosterPersonId: input.ownerRosterPersonId !== undefined ? input.ownerRosterPersonId : current?.ownerRosterPersonId,
        ownerProjectSiteId: input.ownerProjectSiteId !== undefined ? input.ownerProjectSiteId : current?.ownerProjectSiteId,
        ownerPartyId: input.ownerPartyId !== undefined ? input.ownerPartyId : current?.ownerPartyId,
      });
      if (ownerIssues.length > 0) throw new CertificateValidationError(ownerIssues);
      const certificate = await options.certificateRepository.update(id, input);
      if (!certificate) return reply.status(404).send({ error: "CERTIFICATE_NOT_FOUND" });
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
