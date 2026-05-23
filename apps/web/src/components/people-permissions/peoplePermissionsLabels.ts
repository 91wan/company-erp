import {
  DEPARTMENT_STATUSES,
  EMPLOYEE_PROJECT_SITE_RELATION_TYPES,
  EMPLOYEE_STATUSES,
  MVP_ROLES,
  USER_ACCOUNT_STATUSES,
  type MvpRoleCode,
} from "@company-erp/shared";

export const departmentStatusLabel = new Map(DEPARTMENT_STATUSES.map((status) => [status.code, status.label]));
export const employeeStatusLabel = new Map(EMPLOYEE_STATUSES.map((status) => [status.code, status.label]));
export const accountStatusLabel = new Map(USER_ACCOUNT_STATUSES.map((status) => [status.code, status.label]));
export const roleLabel = new Map(MVP_ROLES.map((role) => [role.code, role.label]));
export const relationTypeLabel = new Map(EMPLOYEE_PROJECT_SITE_RELATION_TYPES.map((relation) => [relation.code, relation.label]));

export function formatRoles(roles: readonly MvpRoleCode[]): string {
  return roles.map((role) => roleLabel.get(role) ?? role).join(" / ");
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
