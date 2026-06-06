/**
 * Shared Prisma scalar helpers.
 *
 * Centralizes the `decimalToNumber` conversion that was previously duplicated
 * verbatim across repository files. Prisma returns numeric columns as
 * `Prisma.Decimal` instances (objects exposing `toNumber()`); these helpers
 * normalize them to plain numbers for DTOs.
 */

/** Convert a Prisma Decimal (or numeric-ish value) to a number, preserving null. */
export function decimalToNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  if (typeof value === "object" && "toNumber" in value && typeof value.toNumber === "function") {
    return value.toNumber();
  }
  return Number(value);
}

/** Same as {@link decimalToNumber}, but returns 0 instead of null for missing values. */
export function decimalToNumberOrZero(value: unknown): number {
  return decimalToNumber(value) ?? 0;
}
