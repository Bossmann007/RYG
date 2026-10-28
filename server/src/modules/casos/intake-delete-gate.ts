/**
 * After DELETE casos … AND status='intake', decide whether child rows may be scrubbed.
 * statusRestante is null when no casos row remains (rollback / already gone).
 */
export function decidirPurgeIntake(input: {
  capaRemovida: boolean;
  statusRestante: string | null;
}): "purge" | "conflict" {
  if (input.capaRemovida) {
    return "purge";
  }
  if (input.statusRestante !== null) {
    return "conflict";
  }
  return "purge";
}
