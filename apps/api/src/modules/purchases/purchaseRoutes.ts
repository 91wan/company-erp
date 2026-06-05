import type { FastifyInstance } from "fastify";
import type { BuildAppOptions } from "../../appRouteContext.js";
import { isOutsideProjectSiteScope, runWithAuditTransaction, scopedProjectSiteIds, writeAuditLog } from "../../appRouteContext.js";
import {
  PurchaseRecordConflictError,
  PurchaseRecordValidationError,
  PurchaseRequestConflictError,
  PurchaseRequestStateConflictError,
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
      const purchaseRequest = await runWithAuditTransaction(options, async (txOptions) => {
        const created = await txOptions.purchaseRequestRepository!.create(input);
        await writeAuditLog(request, options, {
          action: "purchase_request.create",
          entityType: "purchase_request",
          entityId: created.id,
          afterJson: created,
        }, { tx: txOptions });
        return created;
      });
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
      const purchaseRequest = await runWithAuditTransaction(options, async (txOptions) => {
        const before = await txOptions.purchaseRequestRepository!.getById(id);
        const updated = await txOptions.purchaseRequestRepository!.update(id, input);
        if (!updated) return null;
        await writeAuditLog(request, options, {
          action: "purchase_request.update",
          entityType: "purchase_request",
          entityId: updated.id,
          beforeJson: before,
          afterJson: updated,
        }, { tx: txOptions });
        return updated;
      });
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

    try {
      const { id } = request.params as { id: string };
      const purchaseRequest = await runWithAuditTransaction(options, async (txOptions) => {
        const submitted = await txOptions.purchaseRequestRepository!.submit(id, "draft");
        if (!submitted) return null;
        await writeAuditLog(request, options, {
          action: "purchase_request.submit",
          entityType: "purchase_request",
          entityId: submitted.id,
          afterJson: submitted,
        }, { tx: txOptions });
        return submitted;
      });
      if (!purchaseRequest) return reply.status(404).send({ error: "PURCHASE_REQUEST_NOT_FOUND" });
      return { purchaseRequest };
    } catch (error) {
      if (error instanceof PurchaseRequestStateConflictError) {
        return reply.status(409).send({ error: "PURCHASE_REQUEST_STATE_CONFLICT" });
      }
      throw error;
    }
  });

  app.post("/api/purchase-requests/:id/approve", async (request, reply) => {
    if (!options.purchaseRequestRepository) {
      return reply.status(503).send({ error: "PURCHASE_REQUEST_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };

    try {
      const input = normalizePurchaseRequestReviewInput(request.body, "approve");
      const purchaseRequest = await runWithAuditTransaction(options, async (txOptions) => {
        const approved = await txOptions.purchaseRequestRepository!.approve(id, "pending_approval", input);
        if (!approved) return null;
        await writeAuditLog(request, options, {
          action: "purchase_request.approve",
          entityType: "purchase_request",
          entityId: approved.id,
          afterJson: approved,
        }, { tx: txOptions });
        return approved;
      });
      if (!purchaseRequest) return reply.status(404).send({ error: "PURCHASE_REQUEST_NOT_FOUND" });
      return { purchaseRequest };
    } catch (error) {
      if (error instanceof PurchaseRequestValidationError) {
        return reply.status(400).send({ error: "PURCHASE_REQUEST_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof PurchaseRequestStateConflictError) {
        return reply.status(409).send({ error: "PURCHASE_REQUEST_STATE_CONFLICT" });
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
      const purchaseRequest = await runWithAuditTransaction(options, async (txOptions) => {
        const rejected = await txOptions.purchaseRequestRepository!.reject(id, "pending_approval", input);
        if (!rejected) return null;
        await writeAuditLog(request, options, {
          action: "purchase_request.reject",
          entityType: "purchase_request",
          entityId: rejected.id,
          afterJson: rejected,
        }, { tx: txOptions });
        return rejected;
      });
      if (!purchaseRequest) return reply.status(404).send({ error: "PURCHASE_REQUEST_NOT_FOUND" });
      return { purchaseRequest };
    } catch (error) {
      if (error instanceof PurchaseRequestValidationError) {
        return reply.status(400).send({ error: "PURCHASE_REQUEST_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof PurchaseRequestStateConflictError) {
        return reply.status(409).send({ error: "PURCHASE_REQUEST_STATE_CONFLICT" });
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
      const purchaseRecord = await runWithAuditTransaction(options, async (txOptions) => {
        const created = await txOptions.purchaseRecordRepository!.create(input);
        if (input.purchaseRequestId && txOptions.purchaseRequestRepository) {
          await txOptions.purchaseRequestRepository.markPurchasing(input.purchaseRequestId);
        }
        await writeAuditLog(request, options, {
          action: "purchase_record.create",
          entityType: "purchase_record",
          entityId: created.id,
          afterJson: created,
        }, { tx: txOptions });
        return created;
      });
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
      const purchaseRecord = await runWithAuditTransaction(options, async (txOptions) => {
        const before = await txOptions.purchaseRecordRepository!.getById(id);
        const updated = await txOptions.purchaseRecordRepository!.update(id, input);
        if (!updated) return null;
        await writeAuditLog(request, options, {
          action: "purchase_record.update",
          entityType: "purchase_record",
          entityId: updated.id,
          beforeJson: before,
          afterJson: updated,
        }, { tx: txOptions });
        return updated;
      });
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
