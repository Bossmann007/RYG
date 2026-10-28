import {
  CASE_CLASSIFICATIONS,
  isCaseClassification,
} from "@common/security/case-classification";

export type WhatsappSendClass = (typeof CASE_CLASSIFICATIONS)[number];

export const WHATSAPP_APPROVED_TEMPLATES = [
  "prazo_simples",
  "audiencia_lembrete",
  "documento_pronto_retirada",
] as const;

export type WhatsappApprovedTemplate = (typeof WHATSAPP_APPROVED_TEMPLATES)[number];

const CPF = /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/;
const CNPJ = /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/;
const CNJ = /\b\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\b/;
const EMAIL = /\b[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/;

/** Detectors aligned with hub DLP / firewall shapes for send-time checks. */
export function detectarPiiEnvio(texto: string): string[] {
  const hits: string[] = [];
  if (CPF.test(texto)) hits.push("cpf");
  if (CNPJ.test(texto)) hits.push("cnpj");
  if (CNJ.test(texto)) hits.push("cnj");
  if (EMAIL.test(texto)) hits.push("email");
  return hits;
}

export function templateAprovado(id: unknown): id is WhatsappApprovedTemplate {
  return (
    typeof id === "string" &&
    (WHATSAPP_APPROVED_TEMPLATES as readonly string[]).includes(id)
  );
}

/**
 * Block free-text PII unless an approved template or SafeDTO release id is supplied.
 * Classification checklist must be acknowledged by the human.
 */
export function avaliarEnvioWhatsapp(input: {
  texto: string;
  classificationAck: boolean;
  classification?: string;
  templateId?: string;
  safeDtoReleaseId?: string;
}): { ok: true } | { ok: false; motivo: string; pii?: string[] } {
  if (!input.classificationAck) {
    return { ok: false, motivo: "classificationAck obrigatório antes do envio." };
  }
  const classe = String(input.classification || "").trim();
  if (!isCaseClassification(classe)) {
    return { ok: false, motivo: "classification do checklist é obrigatória." };
  }

  const pii = detectarPiiEnvio(input.texto);
  if (!pii.length) {
    return { ok: true };
  }

  const templateOk = templateAprovado(input.templateId);
  const releaseOk =
    typeof input.safeDtoReleaseId === "string" &&
    /^rel_[0-9a-f]+$/i.test(input.safeDtoReleaseId.trim());

  if (templateOk || releaseOk) {
    return { ok: true };
  }

  return {
    ok: false,
    motivo:
      "PII detectado. Use template aprovado ou safeDtoReleaseId (rel_…) antes do envio.",
    pii,
  };
}
