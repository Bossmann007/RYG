export const PA_ALLOWLIST = [
  "case_read",
  "checklist",
  "whatsapp_propose",
  "export_pack",
] as const;

export type PaToolName = (typeof PA_ALLOWLIST)[number];

export type PaPendingZap = {
  desafio: string;
  para: string;
  texto: string;
  processoId?: string;
  classificationAck: boolean;
  classification: string;
  templateId?: string;
  safeDtoReleaseId?: string;
  expiraEm: string;
};

export type PaSession = {
  id: string;
  officeId: string;
  delegatedBy: string;
  papel: string;
  openedAt: string;
  runtime: "office-hosted" | "linked-provider";
  pendingZap?: PaPendingZap;
};
