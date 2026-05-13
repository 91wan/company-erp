import type { FastifyInstance } from "fastify";
import type { BuildAppOptions } from "./appRouteContext.js";
import { isOutsideProjectSiteScope, scopedProjectSiteIds } from "./appRouteContext.js";
import {
  PurchaseRecordConflictError,
  PurchaseRecordValidationError,
  PurchaseRequestConflictError,
  PurchaseRequestValidationError,
  normalizePurchaseRecordFilters,
  normalizePurchaseRecordInput,
  normalizePurchaseRequestFilters,
  normalizePurchaseRequestInput,
  normalizePurchaseRequestReviewInput,
} from "./purchases.js";

export function registerPurchaseRoutes(app: FastifyInstance, options: BuildAppOptions) {
  app.get("/api/purchase-requests", async (request, reply) => {
    if (!options.purchaseRequestRepository) {
      return reply.status(503).send({ error: "PURCHASE_REQUEST_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const scope = scopedProjectSiteIds(request);
      if (scope?.length === 0) return { purchaseRequests: [] };
      const filters = {
        ...normalizePurchaseRequestFilters(request.query as Record<string, unknown>),
        ...(scope ? { projectSiteIds: scope } : {}),
      };
      const purchaseRequests = await options.purchaseRequestRepository.list(filters);
      return { purchaseRequests };
    } catch (error) {
      if (error instanceof PurchaseRequestValidationError) {
        return reply.status(400).send({ error: "PURCHASE_REQUEST_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });

  app.get("/api/purchase-requests/:id", async (request, reply) => {
    if (!options.purchaseRequestRepository) {
      return reply.status(503).send({ error: "PURCHASE_REQUEST_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    const purchaseRequest = await options.purchaseRequestRepository.getById(id);
    if (isOutsideProjectSiteScope(scopedProjectSiteIds(request), purchaseRequest?.projectSiteId)) {
      return reply.status(404).send({ error: "PURCHASE_REQUEST_NOT_FOUND" });
    }
    if (!purchaseRequest) return reply.status(404).send({ error: "PURCHASE_REQUEST_NOT_FOUND" });
    return { purchaseRequest };
  });

  app.post("/api/purchase-requests", async (request, reply) => {
    if (!options.purchaseRequestRepository) {
      return reply.status(503).send({ error: "PURCHASE_REQUEST_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const input = normalizePurchaseRequestInput(request.body, "create");
      const purchaseRequest = await options.purchaseRequestRepository.create(input);
      return reply.status(201).send({ purchaseRequest });
    } catch (error) {
      if (error instanceof PurchaseRequestValidationError) {
        return reply.status(400).send({ error: "PURCHASE_REQUEST_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof PurchaseRequestConflictError) {
        return reply.status(409).send({ error: "PURCHASE_REQUEST_CONFLICT", field: error.field });
      }
      throw error;
    }
  });

  app.patch("/api/purchase-requests/:id", async (request, reply) => {
    if (!options.purchaseRequestRepository) {
      return reply.status(503).send({ error: "PURCHASE_REQUEST_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };

    try {
      const input = normalizePurchaseRequestInput(request.body, "update");
      const purchaseRequest = await options.purchaseRequestRepository.update(id, input);
      if (!purchaseRequest) return reply.status(404).send({ error: "PURCHASE_REQUEST_NOT_FOUND" });
      return { purchaseRequest };
    } catch (error) {
      if (error instanceof PurchaseRequestValidationError) {
        return reply.status(400).send({ error: "PURCHASE_REQUEST_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof PurchaseRequestConflictError) {
        return reply.status(409).send({ error: "PURCHASE_REQUEST_CONFLICT", field: error.field });
      }
      throw error;
    }
  });

  app.post("/api/purchase-requests/:id/submit", async (request, reply) => {
    if (!options.purchaseRequestRepository) {
      return reply.status(503).send({ error: "PURCHASE_REQUEST_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    const current = await options.purchaseRequestRepository.getById(id);
    if (!current) return reply.status(404).send({ error: "PURCHASE_REQUEST_NOT_FOUND" });
    if (current.status !== "draft") {
      return reply.status(400).send({ error: "PURCHASE_REQUEST_REVIEW_INVALID_STATE" });
    }

    const purchaseRequest = await options.purchaseRequestRepository.submit(id);
    if (!purchaseRequest) return reply.status(404).send({ error: "PURCHASE_REQUEST_NOT_FOUND" });
    return { purchaseRequest };
  });

  app.post("/api/purchase-requests/:id/approve", async (request, reply) => {
    if (!options.purchaseRequestRepository) {
      return reply.status(503).send({ error: "PURCHASE_REQUEST_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };

    try {
      const input = normalizePurchaseRequestReviewInput(request.body, "approve");
      const current = await options.purchaseRequestRepository.getById(id);
      if (!current) return reply.status(404).send({ error: "PURCHASE_REQUEST_NOT_FOUND" });
      if (current.status !== "pending_approval") {
        return reply.status(400).send({ error: "PURCHASE_REQUEST_REVIEW_INVALID_STATE" });
      }
      const purchaseRequest = await options.purchaseRequestRepository.approve(id, input);
      if (!purchaseRequest) return reply.status(404).send({ error: "PURCHASE_REQUEST_NOT_FOUND" });
      return { purchaseRequest };
    } catch (error) {
      if (error instanceof PurchaseRequestValidationError) {
        return reply.status(400).send({ error: "PURCHASE_REQUEST_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });

  app.post("/api/purchase-requests/:id/reject", async (request, reply) => {
    if (!options.purchaseRequestRepository) {
      return reply.status(503).send({ error: "PURCHASE_REQUEST_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };

    try {
      const input = normalizePurchaseRequestReviewInput(request.body, "reject");
      const current = await options.purchaseRequestRepository.getById(id);
      if (!current) return reply.status(404).send({ error: "PURCHASE_REQUEST_NOT_FOUND" });
      if (current.status !== "pending_approval") {
        return reply.status(400).send({ error: "PURCHASE_REQUEST_REVIEW_INVALID_STATE" });
      }
      const purchaseRequest = await options.purchaseRequestRepository.reject(id, input);
      if (!purchaseRequest) return reply.status(404).send({ error: "PURCHASE_REQUEST_NOT_FOUND" });
      return { purchaseRequest };
    } catch (error) {
      if (error instanceof PurchaseRequestValidationError) {
        return reply.status(400).send({ error: "PURCHASE_REQUEST_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });

  app.get("/api/purchase-records", async (request, reply) => {
    if (!options.purchaseRecordRepository) {
      return reply.status(503).send({ error: "PURCHASE_RECORD_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const scope = scopedProjectSiteIds(request);
      if (scope?.length === 0) return { purchaseRecords: [] };
      const filters = {
        ...normalizePurchaseRecordFilters(request.query as Record<string, unknown>),
        ...(scope ? { projectSiteIds: scope } : {}),
      };
      const purchaseRecords = await options.purchaseRecordRepository.list(filters);
      return { purchaseRecords };
    } catch (error) {
      if (error instanceof PurchaseRecordValidationError) {
        return reply.status(400).send({ error: "PURCHASE_RECORD_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });

  app.get("/api/purchase-records/:id", async (request, reply) => {
    if (!options.purchaseRecordRepository) {
      return reply.status(503).send({ error: "PURCHASE_RECORD_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    const purchaseRecord = await options.purchaseRecordRepository.getById(id);
    if (isOutsideProjectSiteScope(scopedProjectSiteIds(request), purchaseRecord?.projectSiteId)) {
      return reply.status(404).send({ error: "PURCHASE_RECORD_NOT_FOUND" });
    }
    if (!purchaseRecord) return reply.status(404).send({ error: "PURCHASE_RECORD_NOT_FOUND" });
    return { purchaseRecord };
  });

  app.post("/api/purchase-records", async (request, reply) => {
    if (!options.purchaseRecordRepository) {
      return reply.status(503).send({ error: "PURCHASE_RECORD_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const input = normalizePurchaseRecordInput(request.body, "create");
      if (input.purchaseRequestId) {
        if (!options.purchaseRequestRepository) {
          return reply.status(503).send({ error: "PURCHASE_REQUEST_REPOSITORY_NOT_CONFIGURED" });
        }
        const purchaseRequest = await options.purchaseRequestRepository.getById(input.purchaseRequestId);
        if (!purchaseRequest || !["pending_purchase", "purchasing"].includes(purchaseRequest.status)) {
          return reply.status(400).send({
            error: "PURCHASE_RECORD_VALIDATION_FAILED",
            issues: ["purchaseRequestId must reference an approved request"],
          });
        }
      }
      const purchaseRecord = await options.purchaseRecordRepository.create(input);
      if (input.purchaseRequestId && options.purchaseRequestRepository) {
        await options.purchaseRequestRepository.markPurchasing(input.purchaseRequestId);
      }
      return reply.status(201).send({ purchaseRecord });
    } catch (error) {
      if (error instanceof PurchaseRecordValidationError) {
        return reply.status(400).send({ error: "PURCHASE_RECORD_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof PurchaseRecordConflictError) {
        return reply.status(409).send({ error: "PURCHASE_RECORD_CONFLICT", field: error.field });
      }
      throw error;
    }
  });

  app.patch("/api/purchase-records/:id", async (request, reply) => {
    if (!options.purchaseRecordRepository) {
      return reply.status(503).send({ error: "PURCHASE_RECORD_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };

    try {
      const input = normalizePurchaseRecordInput(request.body, "update");
      const purchaseRecord = await options.purchaseRecordRepository.update(id, input);
      if (!purchaseRecord) return reply.status(404).send({ error: "PURCHASE_RECORD_NOT_FOUND" });
      return { purchaseRecord };
    } catch (error) {
      if (error instanceof PurchaseRecordValidationError) {
        return reply.status(400).send({ error: "PURCHASE_RECORD_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof PurchaseRecordConflictError) {
        return reply.status(409).send({ error: "PURCHASE_RECORD_CONFLICT", field: error.field });
      }
      throw error;
    }
  });

}
