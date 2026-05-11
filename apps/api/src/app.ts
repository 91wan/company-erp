import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import Fastify from "fastify";
import {
  INVENTORY_MVP_METADATA,
  MVP_DICTIONARIES,
  MVP_PERMISSION_MATRIX,
  MVP_ROLES,
  USER_ROLE_ASSIGNMENT_POLICY,
} from "@company-erp/shared";
import {
  PartyConflictError,
  PartyValidationError,
  normalizePartyFilters,
  normalizePartyInput,
  type PartyRepository,
} from "./parties.js";
import {
  MaterialConflictError,
  MaterialValidationError,
  WarehouseConflictError,
  WarehouseValidationError,
  normalizeMaterialFilters,
  normalizeMaterialInput,
  normalizeWarehouseFilters,
  normalizeWarehouseInput,
  type MaterialRepository,
  type WarehouseRepository,
} from "./materialsWarehouses.js";
import {
  DepartmentConflictError,
  DepartmentValidationError,
  EmployeeProjectSiteAssignmentConflictError,
  EmployeeProjectSiteAssignmentValidationError,
  EmployeeConflictError,
  EmployeeValidationError,
  UserAccountConflictError,
  UserAccountValidationError,
  normalizeDepartmentFilters,
  normalizeDepartmentInput,
  normalizeEmployeeFilters,
  normalizeEmployeeInput,
  normalizeProjectSiteAssignmentFilters,
  normalizeProjectSiteAssignmentInput,
  normalizeUserAccountFilters,
  normalizeUserAccountInput,
  type DepartmentRepository,
  type EmployeeProjectSiteAssignmentRepository,
  type EmployeeRepository,
  type UserAccountRepository,
} from "./peoplePermissions.js";
import {
  PurchaseRecordConflictError,
  PurchaseRecordValidationError,
  PurchaseRequestConflictError,
  PurchaseRequestValidationError,
  normalizePurchaseRecordFilters,
  normalizePurchaseRecordInput,
  normalizePurchaseRequestFilters,
  normalizePurchaseRequestInput,
  type PurchaseRecordRepository,
  type PurchaseRequestRepository,
} from "./purchases.js";
import {
  InventoryMovementConflictError,
  InventoryMovementValidationError,
  normalizeInventoryBalanceFilters,
  normalizeInventoryMovementFilters,
  normalizeInventoryMovementInput,
  type InventoryRepository,
} from "./inventory.js";
import {
  ReplenishmentSuggestionConflictError,
  ReplenishmentSuggestionValidationError,
  normalizeConvertReplenishmentSuggestionInput,
  normalizeReplenishmentSuggestionFilters,
  normalizeUpdateReplenishmentSuggestionInput,
  type ReplenishmentSuggestionRepository,
} from "./replenishment.js";
import {
  ProjectSiteConflictError,
  ProjectSiteValidationError,
  ProjectUsageRequestConflictError,
  ProjectUsageRequestValidationError,
  normalizeIssueProjectUsageRequestInput,
  normalizeProjectSiteFilters,
  normalizeProjectSiteInput,
  normalizeProjectUsageRequestFilters,
  normalizeProjectUsageRequestInput,
  type ProjectSiteRepository,
  type ProjectUsageRequestRepository,
} from "./projectSites.js";
import {
  ContractConflictError,
  ContractValidationError,
  normalizeContractAttachmentInput,
  normalizeContractFilters,
  normalizeContractInput,
  type ContractRepository,
} from "./contracts.js";
import {
  ImportJobValidationError,
  normalizeImportJobFilters,
  normalizeImportTemplateType,
  type ImportJobRepository,
} from "./importJobs.js";
import { registerAuth, type AuthenticatedRequest, type AuthOptions, type AuthRepository } from "./auth.js";

type BuildAppOptions = {
  auth?: AuthOptions;
  authRepository?: AuthRepository;
  partyRepository?: PartyRepository;
  materialRepository?: MaterialRepository;
  warehouseRepository?: WarehouseRepository;
  departmentRepository?: DepartmentRepository;
  employeeRepository?: EmployeeRepository;
  userAccountRepository?: UserAccountRepository;
  projectSiteAssignmentRepository?: EmployeeProjectSiteAssignmentRepository;
  purchaseRequestRepository?: PurchaseRequestRepository;
  purchaseRecordRepository?: PurchaseRecordRepository;
  inventoryRepository?: InventoryRepository;
  replenishmentSuggestionRepository?: ReplenishmentSuggestionRepository;
  projectSiteRepository?: ProjectSiteRepository;
  projectUsageRequestRepository?: ProjectUsageRequestRepository;
  contractRepository?: ContractRepository;
  importJobRepository?: ImportJobRepository;
};

function scopedProjectSiteIds(request: unknown): readonly string[] | null {
  const user = (request as AuthenticatedRequest).currentUser;
  if (!user) return null;
  return user.roles.length === 1 && user.roles[0] === "project_site"
    ? [...(user.assignedProjectSiteIds ?? [])]
    : null;
}

function isOutsideProjectSiteScope(scope: readonly string[] | null, projectSiteId?: string | null): boolean {
  return scope !== null && (!projectSiteId || !scope.includes(projectSiteId));
}

export function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    logger: false,
  });

  void app.register(cors, {
    origin: true,
    credentials: true,
  });
  void app.register(multipart, {
    limits: {
      files: 1,
      fileSize: 10 * 1024 * 1024,
    },
  });

  registerAuth(app, options.authRepository, options.auth);

  app.get("/health", async () => ({
    status: "ok",
    service: "company-erp-api",
    database: {
      configured: Boolean(process.env.DATABASE_URL),
    },
  }));

  app.get("/api/meta/roles", async () => ({
    roles: MVP_ROLES,
  }));

  app.get("/api/meta/dictionaries", async () => ({
    dictionaries: MVP_DICTIONARIES,
  }));

  app.get("/api/meta/permissions", async () => ({
    roles: MVP_ROLES,
    permissionMatrix: MVP_PERMISSION_MATRIX,
    assignmentPolicy: USER_ROLE_ASSIGNMENT_POLICY,
  }));

  app.get("/api/meta/inventory", async () => INVENTORY_MVP_METADATA);

  app.get("/api/import-jobs", async (request, reply) => {
    if (!options.importJobRepository) {
      return reply.status(503).send({ error: "IMPORT_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const filters = normalizeImportJobFilters(request.query as Record<string, unknown>);
      const importJobs = await options.importJobRepository.list(filters);
      return { importJobs };
    } catch (error) {
      if (error instanceof ImportJobValidationError) {
        return reply.status(400).send({ error: "IMPORT_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });

  app.get("/api/import-jobs/:id", async (request, reply) => {
    if (!options.importJobRepository) {
      return reply.status(503).send({ error: "IMPORT_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    const importJob = await options.importJobRepository.getById(id);
    if (!importJob) return reply.status(404).send({ error: "IMPORT_JOB_NOT_FOUND" });
    return { importJob };
  });

  app.post("/api/import-jobs/preview", async (request, reply) => {
    if (!options.importJobRepository) {
      return reply.status(503).send({ error: "IMPORT_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const parts = request.parts();
      let templateType: unknown;
      let originalFileName = "";
      let fileBuffer: Buffer | null = null;

      for await (const part of parts) {
        if (part.type === "field" && part.fieldname === "templateType") {
          templateType = part.value;
        }
        if (part.type === "file" && part.fieldname === "file") {
          originalFileName = part.filename;
          fileBuffer = await part.toBuffer();
        }
      }

      if (!fileBuffer) throw new ImportJobValidationError(["file is required"]);
      if (!originalFileName.toLowerCase().endsWith(".xlsx")) {
        throw new ImportJobValidationError(["Only .xlsx files are supported"]);
      }

      const importJob = await options.importJobRepository.preview({
        templateType: normalizeImportTemplateType(templateType),
        originalFileName,
        fileBuffer,
      });
      return reply.status(201).send({ importJob });
    } catch (error) {
      if (error instanceof ImportJobValidationError) {
        return reply.status(400).send({ error: "IMPORT_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof Error && /template|header|confirm|error row|headers|invalid/i.test(error.message)) {
        return reply.status(400).send({ error: "IMPORT_VALIDATION_FAILED", issues: [error.message] });
      }
      throw error;
    }
  });

  app.post("/api/import-jobs/:id/confirm", async (request, reply) => {
    if (!options.importJobRepository) {
      return reply.status(503).send({ error: "IMPORT_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    try {
      const importJob = await options.importJobRepository.confirm(id);
      if (!importJob) return reply.status(404).send({ error: "IMPORT_JOB_NOT_FOUND" });
      return { importJob };
    } catch (error) {
      if (error instanceof ImportJobValidationError) {
        return reply.status(400).send({ error: "IMPORT_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof Error) {
        return reply.status(400).send({ error: "IMPORT_VALIDATION_FAILED", issues: [error.message] });
      }
      throw error;
    }
  });

  app.get("/api/parties", async (request, reply) => {
    if (!options.partyRepository) {
      return reply.status(503).send({ error: "PARTY_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const filters = normalizePartyFilters(request.query as Record<string, unknown>);
      const parties = await options.partyRepository.list(filters);
      return { parties };
    } catch (error) {
      if (error instanceof PartyValidationError) {
        return reply.status(400).send({
          error: "PARTY_VALIDATION_FAILED",
          issues: error.issues,
        });
      }
      throw error;
    }
  });

  app.get("/api/parties/:id", async (request, reply) => {
    if (!options.partyRepository) {
      return reply.status(503).send({ error: "PARTY_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    const party = await options.partyRepository.getById(id);

    if (!party) {
      return reply.status(404).send({ error: "PARTY_NOT_FOUND" });
    }

    return { party };
  });

  app.post("/api/parties", async (request, reply) => {
    if (!options.partyRepository) {
      return reply.status(503).send({ error: "PARTY_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const input = normalizePartyInput(request.body, "create");
      const party = await options.partyRepository.create(input);
      return reply.status(201).send({ party });
    } catch (error) {
      if (error instanceof PartyValidationError) {
        return reply.status(400).send({
          error: "PARTY_VALIDATION_FAILED",
          issues: error.issues,
        });
      }

      if (error instanceof PartyConflictError) {
        return reply.status(409).send({
          error: "PARTY_CONFLICT",
          field: error.field,
        });
      }

      throw error;
    }
  });

  app.patch("/api/parties/:id", async (request, reply) => {
    if (!options.partyRepository) {
      return reply.status(503).send({ error: "PARTY_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };

    try {
      const input = normalizePartyInput(request.body, "update");
      const party = await options.partyRepository.update(id, input);

      if (!party) {
        return reply.status(404).send({ error: "PARTY_NOT_FOUND" });
      }

      return { party };
    } catch (error) {
      if (error instanceof PartyValidationError) {
        return reply.status(400).send({
          error: "PARTY_VALIDATION_FAILED",
          issues: error.issues,
        });
      }

      if (error instanceof PartyConflictError) {
        return reply.status(409).send({
          error: "PARTY_CONFLICT",
          field: error.field,
        });
      }

      throw error;
    }
  });

  app.get("/api/materials", async (request, reply) => {
    if (!options.materialRepository) {
      return reply.status(503).send({ error: "MATERIAL_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const filters = normalizeMaterialFilters(request.query as Record<string, unknown>);
      const materials = await options.materialRepository.list(filters);
      return { materials };
    } catch (error) {
      if (error instanceof MaterialValidationError) {
        return reply.status(400).send({ error: "MATERIAL_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });

  app.get("/api/materials/:id", async (request, reply) => {
    if (!options.materialRepository) {
      return reply.status(503).send({ error: "MATERIAL_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    const material = await options.materialRepository.getById(id);

    if (!material) {
      return reply.status(404).send({ error: "MATERIAL_NOT_FOUND" });
    }

    return { material };
  });

  app.post("/api/materials", async (request, reply) => {
    if (!options.materialRepository) {
      return reply.status(503).send({ error: "MATERIAL_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const input = normalizeMaterialInput(request.body, "create");
      const material = await options.materialRepository.create(input);
      return reply.status(201).send({ material });
    } catch (error) {
      if (error instanceof MaterialValidationError) {
        return reply.status(400).send({ error: "MATERIAL_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof MaterialConflictError) {
        return reply.status(409).send({ error: "MATERIAL_CONFLICT", field: error.field });
      }
      throw error;
    }
  });

  app.patch("/api/materials/:id", async (request, reply) => {
    if (!options.materialRepository) {
      return reply.status(503).send({ error: "MATERIAL_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };

    try {
      const input = normalizeMaterialInput(request.body, "update");
      const material = await options.materialRepository.update(id, input);

      if (!material) {
        return reply.status(404).send({ error: "MATERIAL_NOT_FOUND" });
      }

      return { material };
    } catch (error) {
      if (error instanceof MaterialValidationError) {
        return reply.status(400).send({ error: "MATERIAL_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof MaterialConflictError) {
        return reply.status(409).send({ error: "MATERIAL_CONFLICT", field: error.field });
      }
      throw error;
    }
  });

  app.get("/api/warehouses", async (request, reply) => {
    if (!options.warehouseRepository) {
      return reply.status(503).send({ error: "WAREHOUSE_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const filters = normalizeWarehouseFilters(request.query as Record<string, unknown>);
      const warehouses = await options.warehouseRepository.list(filters);
      return { warehouses };
    } catch (error) {
      if (error instanceof WarehouseValidationError) {
        return reply.status(400).send({ error: "WAREHOUSE_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });

  app.get("/api/warehouses/:id", async (request, reply) => {
    if (!options.warehouseRepository) {
      return reply.status(503).send({ error: "WAREHOUSE_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    const warehouse = await options.warehouseRepository.getById(id);

    if (!warehouse) {
      return reply.status(404).send({ error: "WAREHOUSE_NOT_FOUND" });
    }

    return { warehouse };
  });

  app.post("/api/warehouses", async (request, reply) => {
    if (!options.warehouseRepository) {
      return reply.status(503).send({ error: "WAREHOUSE_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const input = normalizeWarehouseInput(request.body, "create");
      const warehouse = await options.warehouseRepository.create(input);
      return reply.status(201).send({ warehouse });
    } catch (error) {
      if (error instanceof WarehouseValidationError) {
        return reply.status(400).send({ error: "WAREHOUSE_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof WarehouseConflictError) {
        return reply.status(409).send({ error: "WAREHOUSE_CONFLICT", field: error.field });
      }
      throw error;
    }
  });

  app.patch("/api/warehouses/:id", async (request, reply) => {
    if (!options.warehouseRepository) {
      return reply.status(503).send({ error: "WAREHOUSE_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };

    try {
      const input = normalizeWarehouseInput(request.body, "update");
      const warehouse = await options.warehouseRepository.update(id, input);

      if (!warehouse) {
        return reply.status(404).send({ error: "WAREHOUSE_NOT_FOUND" });
      }

      return { warehouse };
    } catch (error) {
      if (error instanceof WarehouseValidationError) {
        return reply.status(400).send({ error: "WAREHOUSE_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof WarehouseConflictError) {
        return reply.status(409).send({ error: "WAREHOUSE_CONFLICT", field: error.field });
      }
      throw error;
    }
  });

  app.get("/api/departments", async (request, reply) => {
    if (!options.departmentRepository) {
      return reply.status(503).send({ error: "DEPARTMENT_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const filters = normalizeDepartmentFilters(request.query as Record<string, unknown>);
      const departments = await options.departmentRepository.list(filters);
      return { departments };
    } catch (error) {
      if (error instanceof DepartmentValidationError) {
        return reply.status(400).send({ error: "DEPARTMENT_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });

  app.get("/api/departments/:id", async (request, reply) => {
    if (!options.departmentRepository) {
      return reply.status(503).send({ error: "DEPARTMENT_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    const department = await options.departmentRepository.getById(id);
    if (!department) return reply.status(404).send({ error: "DEPARTMENT_NOT_FOUND" });
    return { department };
  });

  app.post("/api/departments", async (request, reply) => {
    if (!options.departmentRepository) {
      return reply.status(503).send({ error: "DEPARTMENT_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const input = normalizeDepartmentInput(request.body, "create");
      const department = await options.departmentRepository.create(input);
      return reply.status(201).send({ department });
    } catch (error) {
      if (error instanceof DepartmentValidationError) {
        return reply.status(400).send({ error: "DEPARTMENT_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof DepartmentConflictError) {
        return reply.status(409).send({ error: "DEPARTMENT_CONFLICT", field: error.field });
      }
      throw error;
    }
  });

  app.patch("/api/departments/:id", async (request, reply) => {
    if (!options.departmentRepository) {
      return reply.status(503).send({ error: "DEPARTMENT_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    try {
      const input = normalizeDepartmentInput(request.body, "update");
      const department = await options.departmentRepository.update(id, input);
      if (!department) return reply.status(404).send({ error: "DEPARTMENT_NOT_FOUND" });
      return { department };
    } catch (error) {
      if (error instanceof DepartmentValidationError) {
        return reply.status(400).send({ error: "DEPARTMENT_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof DepartmentConflictError) {
        return reply.status(409).send({ error: "DEPARTMENT_CONFLICT", field: error.field });
      }
      throw error;
    }
  });

  app.get("/api/employees", async (request, reply) => {
    if (!options.employeeRepository) {
      return reply.status(503).send({ error: "EMPLOYEE_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const filters = normalizeEmployeeFilters(request.query as Record<string, unknown>);
      const employees = await options.employeeRepository.list(filters);
      return { employees };
    } catch (error) {
      if (error instanceof EmployeeValidationError) {
        return reply.status(400).send({ error: "EMPLOYEE_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });

  app.get("/api/employees/:id", async (request, reply) => {
    if (!options.employeeRepository) {
      return reply.status(503).send({ error: "EMPLOYEE_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    const employee = await options.employeeRepository.getById(id);
    if (!employee) return reply.status(404).send({ error: "EMPLOYEE_NOT_FOUND" });
    return { employee };
  });

  app.post("/api/employees", async (request, reply) => {
    if (!options.employeeRepository) {
      return reply.status(503).send({ error: "EMPLOYEE_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const input = normalizeEmployeeInput(request.body, "create");
      const employee = await options.employeeRepository.create(input);
      return reply.status(201).send({ employee });
    } catch (error) {
      if (error instanceof EmployeeValidationError) {
        return reply.status(400).send({ error: "EMPLOYEE_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof EmployeeConflictError) {
        return reply.status(409).send({ error: "EMPLOYEE_CONFLICT", field: error.field });
      }
      throw error;
    }
  });

  app.patch("/api/employees/:id", async (request, reply) => {
    if (!options.employeeRepository) {
      return reply.status(503).send({ error: "EMPLOYEE_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    try {
      const input = normalizeEmployeeInput(request.body, "update");
      const employee = await options.employeeRepository.update(id, input);
      if (!employee) return reply.status(404).send({ error: "EMPLOYEE_NOT_FOUND" });
      return { employee };
    } catch (error) {
      if (error instanceof EmployeeValidationError) {
        return reply.status(400).send({ error: "EMPLOYEE_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof EmployeeConflictError) {
        return reply.status(409).send({ error: "EMPLOYEE_CONFLICT", field: error.field });
      }
      throw error;
    }
  });

  app.get("/api/user-accounts", async (request, reply) => {
    if (!options.userAccountRepository) {
      return reply.status(503).send({ error: "USER_ACCOUNT_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const filters = normalizeUserAccountFilters(request.query as Record<string, unknown>);
      const userAccounts = await options.userAccountRepository.list(filters);
      return { userAccounts };
    } catch (error) {
      if (error instanceof UserAccountValidationError) {
        return reply.status(400).send({ error: "USER_ACCOUNT_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });

  app.get("/api/user-accounts/:id", async (request, reply) => {
    if (!options.userAccountRepository) {
      return reply.status(503).send({ error: "USER_ACCOUNT_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    const userAccount = await options.userAccountRepository.getById(id);
    if (!userAccount) return reply.status(404).send({ error: "USER_ACCOUNT_NOT_FOUND" });
    return { userAccount };
  });

  app.get("/api/project-site-assignments", async (request, reply) => {
    if (!options.projectSiteAssignmentRepository) {
      return reply.status(503).send({ error: "PROJECT_SITE_ASSIGNMENT_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const filters = normalizeProjectSiteAssignmentFilters(request.query as Record<string, unknown>);
      const projectSiteAssignments = await options.projectSiteAssignmentRepository.list(filters);
      return { projectSiteAssignments };
    } catch (error) {
      if (error instanceof EmployeeProjectSiteAssignmentValidationError) {
        return reply.status(400).send({ error: "PROJECT_SITE_ASSIGNMENT_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });

  app.get("/api/project-site-assignments/:id", async (request, reply) => {
    if (!options.projectSiteAssignmentRepository) {
      return reply.status(503).send({ error: "PROJECT_SITE_ASSIGNMENT_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    const projectSiteAssignment = await options.projectSiteAssignmentRepository.getById(id);
    if (!projectSiteAssignment) return reply.status(404).send({ error: "PROJECT_SITE_ASSIGNMENT_NOT_FOUND" });
    return { projectSiteAssignment };
  });

  app.post("/api/project-site-assignments", async (request, reply) => {
    if (!options.projectSiteAssignmentRepository) {
      return reply.status(503).send({ error: "PROJECT_SITE_ASSIGNMENT_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const input = normalizeProjectSiteAssignmentInput(request.body, "create");
      const projectSiteAssignment = await options.projectSiteAssignmentRepository.create(input);
      return reply.status(201).send({ projectSiteAssignment });
    } catch (error) {
      if (error instanceof EmployeeProjectSiteAssignmentValidationError) {
        return reply.status(400).send({ error: "PROJECT_SITE_ASSIGNMENT_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof EmployeeProjectSiteAssignmentConflictError) {
        return reply.status(409).send({ error: "PROJECT_SITE_ASSIGNMENT_CONFLICT", field: error.field });
      }
      throw error;
    }
  });

  app.patch("/api/project-site-assignments/:id", async (request, reply) => {
    if (!options.projectSiteAssignmentRepository) {
      return reply.status(503).send({ error: "PROJECT_SITE_ASSIGNMENT_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    try {
      const input = normalizeProjectSiteAssignmentInput(request.body, "update");
      const projectSiteAssignment = await options.projectSiteAssignmentRepository.update(id, input);
      if (!projectSiteAssignment) return reply.status(404).send({ error: "PROJECT_SITE_ASSIGNMENT_NOT_FOUND" });
      return { projectSiteAssignment };
    } catch (error) {
      if (error instanceof EmployeeProjectSiteAssignmentValidationError) {
        return reply.status(400).send({ error: "PROJECT_SITE_ASSIGNMENT_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof EmployeeProjectSiteAssignmentConflictError) {
        return reply.status(409).send({ error: "PROJECT_SITE_ASSIGNMENT_CONFLICT", field: error.field });
      }
      throw error;
    }
  });

  app.post("/api/user-accounts", async (request, reply) => {
    if (!options.userAccountRepository) {
      return reply.status(503).send({ error: "USER_ACCOUNT_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const input = normalizeUserAccountInput(request.body, "create");
      const userAccount = await options.userAccountRepository.create(input);
      return reply.status(201).send({ userAccount });
    } catch (error) {
      if (error instanceof UserAccountValidationError) {
        return reply.status(400).send({ error: "USER_ACCOUNT_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof UserAccountConflictError) {
        return reply.status(409).send({ error: "USER_ACCOUNT_CONFLICT", field: error.field });
      }
      throw error;
    }
  });

  app.patch("/api/user-accounts/:id", async (request, reply) => {
    if (!options.userAccountRepository) {
      return reply.status(503).send({ error: "USER_ACCOUNT_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    try {
      const input = normalizeUserAccountInput(request.body, "update");
      const userAccount = await options.userAccountRepository.update(id, input);
      if (!userAccount) return reply.status(404).send({ error: "USER_ACCOUNT_NOT_FOUND" });
      return { userAccount };
    } catch (error) {
      if (error instanceof UserAccountValidationError) {
        return reply.status(400).send({ error: "USER_ACCOUNT_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof UserAccountConflictError) {
        return reply.status(409).send({ error: "USER_ACCOUNT_CONFLICT", field: error.field });
      }
      throw error;
    }
  });

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

  app.get("/api/inventory-movements", async (request, reply) => {
    if (!options.inventoryRepository) {
      return reply.status(503).send({ error: "INVENTORY_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const scope = scopedProjectSiteIds(request);
      if (scope?.length === 0) return { inventoryMovements: [] };
      const filters = {
        ...normalizeInventoryMovementFilters(request.query as Record<string, unknown>),
        ...(scope ? { projectSiteIds: scope, sourceType: "project_usage" as const } : {}),
      };
      const inventoryMovements = await options.inventoryRepository.listMovements(filters);
      return { inventoryMovements };
    } catch (error) {
      if (error instanceof InventoryMovementValidationError) {
        return reply.status(400).send({ error: "INVENTORY_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });

  app.get("/api/inventory-movements/:id", async (request, reply) => {
    if (!options.inventoryRepository) {
      return reply.status(503).send({ error: "INVENTORY_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    const inventoryMovement = await options.inventoryRepository.getMovementById(id);
    const scope = scopedProjectSiteIds(request);
    if (
      scope !== null &&
      (!inventoryMovement ||
        inventoryMovement.sourceType !== "project_usage" ||
        isOutsideProjectSiteScope(scope, inventoryMovement.projectSiteId))
    ) {
      return reply.status(404).send({ error: "INVENTORY_MOVEMENT_NOT_FOUND" });
    }
    if (!inventoryMovement) return reply.status(404).send({ error: "INVENTORY_MOVEMENT_NOT_FOUND" });
    return { inventoryMovement };
  });

  app.post("/api/inventory-movements", async (request, reply) => {
    if (!options.inventoryRepository) {
      return reply.status(503).send({ error: "INVENTORY_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const input = normalizeInventoryMovementInput(request.body);
      const inventoryMovement = await options.inventoryRepository.createMovement(input);
      return reply.status(201).send({ inventoryMovement });
    } catch (error) {
      if (error instanceof InventoryMovementValidationError) {
        return reply.status(400).send({ error: "INVENTORY_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof InventoryMovementConflictError) {
        return reply.status(409).send({ error: "INVENTORY_MOVEMENT_CONFLICT", field: error.field });
      }
      throw error;
    }
  });

  app.get("/api/inventory-balances", async (request, reply) => {
    if (!options.inventoryRepository) {
      return reply.status(503).send({ error: "INVENTORY_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      if (scopedProjectSiteIds(request) !== null) {
        return reply.status(403).send({ error: "FORBIDDEN", permissionArea: "inventory", requiredLevel: "read" });
      }
      const filters = normalizeInventoryBalanceFilters(request.query as Record<string, unknown>);
      const inventoryBalances = await options.inventoryRepository.listBalances(filters);
      return { inventoryBalances };
    } catch (error) {
      if (error instanceof InventoryMovementValidationError) {
        return reply.status(400).send({ error: "INVENTORY_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });

  app.get("/api/replenishment-suggestions", async (request, reply) => {
    if (!options.replenishmentSuggestionRepository) {
      return reply.status(503).send({ error: "REPLENISHMENT_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      if (scopedProjectSiteIds(request) !== null) {
        return reply.status(403).send({ error: "FORBIDDEN", permissionArea: "inventory", requiredLevel: "read" });
      }
      const filters = normalizeReplenishmentSuggestionFilters(request.query as Record<string, unknown>);
      const replenishmentSuggestions = await options.replenishmentSuggestionRepository.list(filters);
      return { replenishmentSuggestions };
    } catch (error) {
      if (error instanceof ReplenishmentSuggestionValidationError) {
        return reply.status(400).send({ error: "REPLENISHMENT_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });

  app.post("/api/replenishment-suggestions/generate", async (_request, reply) => {
    if (!options.replenishmentSuggestionRepository) {
      return reply.status(503).send({ error: "REPLENISHMENT_REPOSITORY_NOT_CONFIGURED" });
    }

    const result = await options.replenishmentSuggestionRepository.generate();
    return reply.status(result.created.length > 0 ? 201 : 200).send({ result });
  });

  app.patch("/api/replenishment-suggestions/:id", async (request, reply) => {
    if (!options.replenishmentSuggestionRepository) {
      return reply.status(503).send({ error: "REPLENISHMENT_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    try {
      const input = normalizeUpdateReplenishmentSuggestionInput(request.body);
      const replenishmentSuggestion = await options.replenishmentSuggestionRepository.update(id, input);
      if (!replenishmentSuggestion) return reply.status(404).send({ error: "REPLENISHMENT_SUGGESTION_NOT_FOUND" });
      return { replenishmentSuggestion };
    } catch (error) {
      if (error instanceof ReplenishmentSuggestionValidationError) {
        return reply.status(400).send({ error: "REPLENISHMENT_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });

  app.post("/api/replenishment-suggestions/:id/convert-to-purchase-request", async (request, reply) => {
    if (!options.replenishmentSuggestionRepository) {
      return reply.status(503).send({ error: "REPLENISHMENT_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    try {
      const input = normalizeConvertReplenishmentSuggestionInput(request.body);
      const result = await options.replenishmentSuggestionRepository.convertToPurchaseRequest(id, input);
      if (!result) return reply.status(404).send({ error: "REPLENISHMENT_SUGGESTION_NOT_FOUND" });
      return reply.status(201).send({
        replenishmentSuggestion: result.suggestion,
        purchaseRequest: result.purchaseRequest,
      });
    } catch (error) {
      if (error instanceof ReplenishmentSuggestionValidationError) {
        return reply.status(400).send({ error: "REPLENISHMENT_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof ReplenishmentSuggestionConflictError) {
        return reply.status(409).send({ error: "REPLENISHMENT_CONFLICT", reason: error.reason });
      }
      throw error;
    }
  });

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
      return { projectUsageRequests };
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
    return { projectUsageRequest };
  });

  app.post("/api/project-usage-requests", async (request, reply) => {
    if (!options.projectUsageRequestRepository) {
      return reply.status(503).send({ error: "PROJECT_USAGE_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const input = normalizeProjectUsageRequestInput(request.body, "create");
      const scope = scopedProjectSiteIds(request);
      if (isOutsideProjectSiteScope(scope, input.projectSiteId)) {
        return reply.status(404).send({ error: "PROJECT_USAGE_REQUEST_NOT_FOUND" });
      }
      if (scope !== null && input.status && input.status !== "pending") {
        return reply.status(400).send({ error: "PROJECT_USAGE_VALIDATION_FAILED", issues: ["project-site users can only create pending usage requests"] });
      }
      const projectUsageRequest = await options.projectUsageRequestRepository.create(input);
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

  app.patch("/api/project-usage-requests/:id", async (request, reply) => {
    if (!options.projectUsageRequestRepository) {
      return reply.status(503).send({ error: "PROJECT_USAGE_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    try {
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
      return { projectUsageRequest };
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

  return app;
}
