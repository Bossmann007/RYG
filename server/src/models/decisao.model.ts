export const DECISAO_KINDS = [
  "sentenca",
  "acordao",
  "despacho",
  "decisao_interlocutoria",
  "liminar",
] as const;
export const DECISAO_OUTCOMES = [
  "procedente",
  "improcedente",
  "parcial",
  "extinto",
  "indeferido",
  "deferido",
  "outro",
] as const;
export const DECISAO_STATUSES = ["rascunho", "publicada", "transitada"] as const;

export type DecisaoKind = (typeof DECISAO_KINDS)[number];
export type DecisaoOutcome = (typeof DECISAO_OUTCOMES)[number];
export type DecisaoStatus = (typeof DECISAO_STATUSES)[number];

/**
 * Internal trusted-zone ruling linked to a case. Body text stays a short summary.
 * No raw CPF or bank data. External LLM paths must not receive this object.
 */
export type Decisao = {
  id: string;
  processNumber?: string;
  clienteId?: string;
  title: string;
  kind: DecisaoKind;
  court?: string;
  chamber?: string;
  decidedAt?: string;
  outcome?: DecisaoOutcome;
  summary: string;
  status: DecisaoStatus;
  createdAt: string;
  updatedAt: string;
};

export type DecisaoListaItem = {
  id: string;
  processNumber?: string;
  clienteId?: string;
  title: string;
  kind: DecisaoKind;
  court?: string;
  chamber?: string;
  decidedAt?: string;
  outcome?: DecisaoOutcome;
  status: DecisaoStatus;
  updatedAt: string;
};
