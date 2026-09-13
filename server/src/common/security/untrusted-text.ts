export const UNTRUSTED_TEXT_MAX = 4000;

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;

const INJECTION_MARKERS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|rules?|prompts?)/gi,
  /ignore\s+as\s+regras/gi,
  /disregard\s+(all\s+)?(previous|prior)/gi,
  /forget\s+(all\s+)?(previous|prior)\s+instructions?/gi,
  /<\/?(?:system|assistant|user|s(?:ys)?)(?:\s[^>]*)?>/gi,
  /<<\s*\/?SYS\s*>>/gi,
  /<\|(?:im_start|im_end|system|assistant|user)\|>/gi,
  /\[\[\s*system(?:\s[^\]]*)?\]\]/gi,
  /\[\/?INST\]/gi,
  /(?:^|[\n\r])\s*(?:system|assistant|developer|user)\s*:/gi,
  /\bsystem\s*:/gi,
];

export function sanitizeUntrustedText(
  input: unknown,
  maxLen = UNTRUSTED_TEXT_MAX
): string {
  if (input == null) {
    return "";
  }

  let texto = typeof input === "string" ? input : String(input);
  texto = texto.replace(CONTROL_CHARS, "");

  for (const marcador of INJECTION_MARKERS) {
    texto = texto.replace(marcador, " ");
  }

  texto = texto.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();

  if (texto.length > maxLen) {
    return texto.slice(0, maxLen);
  }

  return texto;
}

export function sanitizeUntrustedList(
  valores: unknown[],
  maxLen = UNTRUSTED_TEXT_MAX
): string[] {
  return valores
    .map((valor) => sanitizeUntrustedText(valor, maxLen))
    .filter(Boolean);
}
