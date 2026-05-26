import type { FastifyInstance } from "fastify";
import {
  MVP_PERMISSION_MATRIX,
  type AccessReviewExportDto,
  type MvpRoleCode,
  type PermissionAreaCode,
  type UserAccountDto,
} from "@company-erp/shared";
import type { AuthenticatedRequest } from "./auth.js";
import { runWithAuditTransaction, writeAuditLog, type BuildAppOptions } from "./appRouteContext.js";
import { DepartmentConflictError, DepartmentValidationError, EmployeeConflictError, EmployeeProjectSiteAssignmentConflictError, EmployeeProjectSiteAssignmentValidationError, EmployeeValidationError, ExternalProjectSiteAccountConflictError, ExternalProjectSiteAccountValidationError, UserAccountConflictError, UserAccountValidationError, normalizeDepartmentFilters, normalizeDepartmentInput, normalizeEmployeeFilters, normalizeEmployeeInput, normalizeExternalProjectSiteAccountFilters, normalizeExternalProjectSiteAccountInput, normalizeProjectSiteAssignmentFilters, normalizeProjectSiteAssignmentInput, normalizeUserAccountFilters, normalizeUserAccountInput } from "./peoplePermissions.js";

function readableAreas(roles: readonly MvpRoleCode[]): PermissionAreaCode[] {
  return (Object.entries(MVP_PERMISSION_MATRIX) as Array<[PermissionAreaCode, { read: readonly MvpRoleCode[] }]>)
    .filter(([, rule]) => roles.some((role) => rule.read.includes(role)))
    .map(([area]) => area);
}

function manageableAreas(roles: readonly MvpRoleCode[]): PermissionAreaCode[] {
  return (Object.entries(MVP_PERMISSION_MATRIX) as Array<[PermissionAreaCode, { manage: readonly MvpRoleCode[] }]>)
    .filter(([, rule]) => roles.some((role) => rule.manage.includes(role)))
    .map(([area]) => area);
}

function projectSiteIdsForAccessReview(account: UserAccountDto): string[] {
  return account.externalProjectSiteId ? [account.externalProjectSiteId] : [];
}

function buildAccessReviewExport(
  userAccounts: readonly UserAccountDto[],
  exportedBy: string,
  activeSessionCounts: ReadonlyMap<string, number>,
  exportedAt = new Date().toISOString(),
): AccessReviewExportDto {
  return {
    exportedAt,
    exportedBy,
    users: userAccounts.map((account) => ({
      id: account.id,
      username: account.username,
      status: account.status,
      roles: account.roles,
      projectSiteIds: projectSiteIdsForAccessReview(account),
      activeSessionCount: activeSessionCounts.get(account.id) ?? 0,
      permissions: {
        read: readableAreas(account.roles),
        manage: manageableAreas(account.roles),
      },
    })),
  };
}

export function registerPeoplePermissionsRoutes(app: FastifyInstance, options: BuildAppOptions) {
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
      await writeAuditLog(request, options, {
        action: "department.create",
        entityType: "department",
        entityId: department.id,
        afterJson: department,
      });
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
      const before = await options.departmentRepository.getById(id);
      const department = await options.departmentRepository.update(id, input);
      if (!department) return reply.status(404).send({ error: "DEPARTMENT_NOT_FOUND" });
      await writeAuditLog(request, options, {
        action: "department.update",
        entityType: "department",
        entityId: department.id,
        beforeJson: before,
        afterJson: department,
      });
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
      await writeAuditLog(request, options, {
        action: "employee.create",
        entityType: "employee",
        entityId: employee.id,
        afterJson: employee,
      });
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
      const before = await options.employeeRepository.getById(id);
      const employee = await options.employeeRepository.update(id, input);
      if (!employee) return reply.status(404).send({ error: "EMPLOYEE_NOT_FOUND" });
      await writeAuditLog(request, options, {
        action: "employee.update",
        entityType: "employee",
        entityId: employee.id,
        beforeJson: before,
        afterJson: employee,
      });
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

  app.get("/api/user-accounts/export-access-review", async (request, reply) => {
    if (!options.userAccountRepository) {
      return reply.status(503).send({ error: "USER_ACCOUNT_REPOSITORY_NOT_CONFIGURED" });
    }
    if (!options.authRepository?.countActiveSessionsByUserAccountIds) {
      return reply.status(503).send({ error: "ACCESS_REVIEW_SESSION_REPOSITORY_NOT_CONFIGURED" });
    }

    const userAccounts = await options.userAccountRepository.list({});
    const activeSessionCounts = await options.authRepository.countActiveSessionsByUserAccountIds(
      userAccounts.map((account) => account.id),
      new Date(),
    );
    const exportedBy = (request as AuthenticatedRequest).currentUser?.username ?? "unknown";
    const exportedAt = new Date().toISOString();
    const accessReviewExport = buildAccessReviewExport(userAccounts, exportedBy, activeSessionCounts, exportedAt);
    await writeAuditLog(request, options, {
      action: "access_review.export",
      entityType: "user_account",
      afterJson: {
        exportedUserCount: userAccounts.length,
        exportedAt,
      },
    });
    return reply
      .header("Content-Type", "application/json; charset=utf-8")
      .header("Content-Disposition", 'attachment; filename="access-review-export.json"')
      .header("X-Content-Type-Options", "nosniff")
      .send(accessReviewExport);
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
      await writeAuditLog(request, options, {
        action: "project_site_assignment.create",
        entityType: "project_site_assignment",
        entityId: projectSiteAssignment.id,
        afterJson: projectSiteAssignment,
      });
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
      const before = await options.projectSiteAssignmentRepository.getById(id);
      const projectSiteAssignment = await options.projectSiteAssignmentRepository.update(id, input);
      if (!projectSiteAssignment) return reply.status(404).send({ error: "PROJECT_SITE_ASSIGNMENT_NOT_FOUND" });
      await writeAuditLog(request, options, {
        action: "project_site_assignment.update",
        entityType: "project_site_assignment",
        entityId: projectSiteAssignment.id,
        beforeJson: before,
        afterJson: projectSiteAssignment,
      });
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
      const userAccount = await runWithAuditTransaction(options, async (txOptions) => {
        const created = await txOptions.userAccountRepository!.create(input);
        await writeAuditLog(request, options, {
          action: "user_account.create",
          entityType: "user_account",
          entityId: created.id,
          afterJson: created,
        }, { tx: txOptions });
        return created;
      });
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
      const userAccount = await runWithAuditTransaction(options, async (txOptions) => {
        const current = await txOptions.userAccountRepository!.getById(id);
        const updated = await txOptions.userAccountRepository!.update(id, input);
        if (!updated) return null;
        await writeAuditLog(request, options, {
          action: "user_account.update",
          entityType: "user_account",
          entityId: updated.id,
          beforeJson: current,
          afterJson: updated,
        }, { tx: txOptions });
        return updated;
      });
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

  app.get("/api/external-project-site-accounts", async (request, reply) => {
    if (!options.externalProjectSiteAccountRepository) {
      return reply.status(503).send({ error: "EXTERNAL_PROJECT_SITE_ACCOUNT_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const filters = normalizeExternalProjectSiteAccountFilters(request.query as Record<string, unknown>);
      const externalProjectSiteAccounts = await options.externalProjectSiteAccountRepository.list(filters);
      return { externalProjectSiteAccounts };
    } catch (error) {
      if (error instanceof ExternalProjectSiteAccountValidationError) {
        return reply.status(400).send({ error: "EXTERNAL_PROJECT_SITE_ACCOUNT_VALIDATION_FAILED", issues: error.issues });
      }
      throw error;
    }
  });

  app.post("/api/external-project-site-accounts", async (request, reply) => {
    if (!options.externalProjectSiteAccountRepository) {
      return reply.status(503).send({ error: "EXTERNAL_PROJECT_SITE_ACCOUNT_REPOSITORY_NOT_CONFIGURED" });
    }

    try {
      const input = normalizeExternalProjectSiteAccountInput(request.body, "create");
      const externalProjectSiteAccount = await runWithAuditTransaction(options, async (txOptions) => {
        const created = await txOptions.externalProjectSiteAccountRepository!.create(input);
        await writeAuditLog(request, options, {
          action: "external_project_site_account.create",
          entityType: "external_project_site_account",
          entityId: created.id,
          afterJson: created,
        }, { tx: txOptions });
        return created;
      });
      return reply.status(201).send({ externalProjectSiteAccount });
    } catch (error) {
      if (error instanceof ExternalProjectSiteAccountValidationError) {
        return reply.status(400).send({ error: "EXTERNAL_PROJECT_SITE_ACCOUNT_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof ExternalProjectSiteAccountConflictError) {
        return reply.status(409).send({ error: "EXTERNAL_PROJECT_SITE_CONFLICT", field: error.field });
      }
      throw error;
    }
  });

  app.patch("/api/external-project-site-accounts/:id", async (request, reply) => {
    if (!options.externalProjectSiteAccountRepository) {
      return reply.status(503).send({ error: "EXTERNAL_PROJECT_SITE_ACCOUNT_REPOSITORY_NOT_CONFIGURED" });
    }

    const { id } = request.params as { id: string };
    try {
      const input = normalizeExternalProjectSiteAccountInput(request.body, "update");
      const externalProjectSiteAccount = await runWithAuditTransaction(options, async (txOptions) => {
        const current = await txOptions.externalProjectSiteAccountRepository!.getById(id);
        const updated = await txOptions.externalProjectSiteAccountRepository!.update(id, input);
        if (!updated) return null;
        await writeAuditLog(request, options, {
          action: "external_project_site_account.update",
          entityType: "external_project_site_account",
          entityId: updated.id,
          beforeJson: current,
          afterJson: updated,
        }, { tx: txOptions });
        return updated;
      });
      if (!externalProjectSiteAccount) return reply.status(404).send({ error: "EXTERNAL_PROJECT_SITE_ACCOUNT_NOT_FOUND" });
      return { externalProjectSiteAccount };
    } catch (error) {
      if (error instanceof ExternalProjectSiteAccountValidationError) {
        return reply.status(400).send({ error: "EXTERNAL_PROJECT_SITE_ACCOUNT_VALIDATION_FAILED", issues: error.issues });
      }
      if (error instanceof ExternalProjectSiteAccountConflictError) {
        return reply.status(409).send({ error: "EXTERNAL_PROJECT_SITE_CONFLICT", field: error.field });
      }
      throw error;
    }
  });

}
