export const PETICAO_KINDS = [
  "inicial",
  "contestacao",
  "replica",
  "embargos",
  "recurso",
  "manifestacao",
  "alegacoes_finais",
] as const;
export const PETICAO_STATUSES = ["rascunho", "protocolada", "juntada"] as const;

export type PeticaoKind = (typeof PETICAO_KINDS)[number];
export type PeticaoStatus = (typeof PETICAO_STATUSES)[number];

/**
 * Internal trusted-zone filing. Links to a client and optionally a CNJ number.
 * Body text stays a short summary. No raw CPF or bank data.
 */
export type Peticao = {
  id: string;
  clienteId: string;
  processNumber?: string;
  title: string;
  kind: PeticaoKind;
  status: PeticaoStatus;
  filedAt?: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
};

export type PeticaoListaItem = {
  id: string;
  clienteId: string;
  processNumber?: string;
  title: string;
  kind: PeticaoKind;
  status: PeticaoStatus;
  filedAt?: string;
  updatedAt: string;
};
