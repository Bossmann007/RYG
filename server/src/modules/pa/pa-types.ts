export const PA_ALLOWLIST = [
  "case_read",
  "checklist",
  "whatsapp_propose",
  "whatsapp_confirm",
  "export_pack",
] as const;

export type PaToolName = (typeof PA_ALLOWLIST)[number];

export type PaSession = {
  id: string;
  officeId: string;
  delegatedBy: string;
  papel: string;
  openedAt: string;
  runtime: "office-hosted" | "linked-provider";
};
