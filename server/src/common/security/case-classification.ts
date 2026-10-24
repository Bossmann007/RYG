export const CASE_CLASSIFICATIONS = [
  "publico",
  "interno",
  "sigiloso",
  "segredo_justica",
] as const;

export type CaseClassification = (typeof CASE_CLASSIFICATIONS)[number];

export const CLASSIFICATION_DEFAULT: CaseClassification = "sigiloso";

/** Labels that stay office-membership-only once the user is on the case. */
const MEMBERSHIP_ONLY: ReadonlySet<CaseClassification> = new Set([
  "publico",
  "interno",
]);

export function isCaseClassification(value: unknown): value is CaseClassification {
  return (
    typeof value === "string" &&
    (CASE_CLASSIFICATIONS as readonly string[]).includes(value)
  );
}

/** Deny capa read unless the membership role clears the label. */
export function clearanceOk(
  classification: CaseClassification,
  papel: string,
): boolean {
  if (MEMBERSHIP_ONLY.has(classification)) {
    return true;
  }
  return papel === "socio";
}
