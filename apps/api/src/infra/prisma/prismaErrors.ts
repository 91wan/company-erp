/**
 * Shared Prisma known-error predicates.
 *
 * Centralizes the `error instanceof Prisma.PrismaClientKnownRequestError &&
 * error.code === "Pxxxx"` plumbing and the unique-violation target extraction
 * that were previously duplicated across repository files. Each repository
 * keeps its own domain-error mapping; only the structural checks are shared.
 */
import { Prisma } from "@prisma/client";

/** True when `error` is a Prisma known-request error with the given code. */
export function isPrismaError(error: unknown, code: string): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

/** P2002 — unique constraint violation. */
export function isUniqueViolation(error: unknown): boolean {
  return isPrismaError(error, "P2002");
}

/** P2003 — foreign key constraint violation. */
export function isForeignKeyViolation(error: unknown): boolean {
  return isPrismaError(error, "P2003");
}

/** P2025 — required record not found. */
export function isRecordNotFound(error: unknown): boolean {
  return isPrismaError(error, "P2025");
}

/** The column targets reported by a P2002 unique violation, or `[]` if unavailable. */
export function uniqueViolationTargets(error: unknown): string[] {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return [];
  return Array.isArray(error.meta?.target) ? (error.meta.target as string[]) : [];
}
