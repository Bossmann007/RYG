import { Processo } from "@models/processo.model";

export const PROCESS_SOURCE_KINDS = [
  "fixture",
  "datajud",
  "eproc",
  "manual",
  "upload",
] as const;

export type ProcessSourceKind = (typeof PROCESS_SOURCE_KINDS)[number];

/**
 * Capas de processo atrás de um adaptador trocável.
 * DataJud migra para eproc — não acoplar o produto a um único fornecedor.
 * `officeId` is required for tenant-scoped sources (manual); fixture ignores it.
 */
export interface ProcessSource {
  readonly kind: ProcessSourceKind;
  buscarCapa(numeroNormalizado: string, officeId?: string): Processo | null;
}
