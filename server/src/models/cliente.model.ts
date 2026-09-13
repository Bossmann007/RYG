export const CLIENTE_KINDS = ["pessoa_fisica", "pessoa_juridica"] as const;
export const CLIENTE_STATUSES = ["ativo", "encerrado"] as const;

export type ClienteKind = (typeof CLIENTE_KINDS)[number];
export type ClienteStatus = (typeof CLIENTE_STATUSES)[number];

/**
 * Internal trusted-zone record. Never carry CPF, bank, address, or contact.
 * External LLM paths must not receive this object; use SafeDTO via MCP.
 */
export type Cliente = {
  id: string;
  displayName: string;
  kind: ClienteKind;
  status: ClienteStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type ClienteListaItem = {
  id: string;
  displayName: string;
  kind: ClienteKind;
  status: ClienteStatus;
  updatedAt: string;
};
