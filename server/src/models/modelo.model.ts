export const MODELO_KINDS = [
  "peticao",
  "contrato",
  "parecer",
  "email",
  "outro",
] as const;
export const MODELO_AREAS = [
  "bancario",
  "civel",
  "trabalhista",
  "consumidor",
  "lgpd",
  "outro",
] as const;
export const MODELO_STATUSES = ["ativo", "arquivado"] as const;

export type ModeloKind = (typeof MODELO_KINDS)[number];
export type ModeloArea = (typeof MODELO_AREAS)[number];
export type ModeloStatus = (typeof MODELO_STATUSES)[number];

/**
 * Internal trusted-zone template. Full body stays off the list payload.
 * No raw CPF or bank data. External LLM paths must not receive this object.
 */
export type Modelo = {
  id: string;
  title: string;
  kind: ModeloKind;
  area?: ModeloArea;
  body: string;
  tags?: string[];
  status: ModeloStatus;
  createdAt: string;
  updatedAt: string;
};

export type ModeloListaItem = {
  id: string;
  title: string;
  kind: ModeloKind;
  area?: ModeloArea;
  tags?: string[];
  status: ModeloStatus;
  updatedAt: string;
  titulo?: string;
  tipo?: string;
  data?: string;
  origem?: string;
  resumo?: string;
  corpo?: string;
};
