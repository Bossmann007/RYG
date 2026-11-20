export const CLASSIFICACOES_CASO = ["publico", "interno", "sigiloso", "segredo_justica"] as const;

export type ClassificacaoCaso = (typeof CLASSIFICACOES_CASO)[number];

/** Unlabeled cases stay readable only by socio. */
export const CLASSIFICACAO_PADRAO: ClassificacaoCaso = "sigiloso";

export function normalizarClassificacao(valor: unknown): ClassificacaoCaso {
  const texto = String(valor ?? "").trim();
  if ((CLASSIFICACOES_CASO as readonly string[]).includes(texto)) {
    return texto as ClassificacaoCaso;
  }
  return CLASSIFICACAO_PADRAO;
}

export function lerClassificacaoOpcional(valor: unknown): ClassificacaoCaso | "absent" | "invalid" {
  if (valor === undefined || valor === null || String(valor).trim() === "") {
    return "absent";
  }
  const texto = String(valor).trim();
  if ((CLASSIFICACOES_CASO as readonly string[]).includes(texto)) {
    return texto as ClassificacaoCaso;
  }
  return "invalid";
}

export function podeLerCaso(papel: string, classification: ClassificacaoCaso): boolean {
  switch (classification) {
    case "publico":
    case "interno":
      return true;
    case "sigiloso":
    case "segredo_justica":
      return papel === "socio";
    default: {
      const nunca: never = classification;
      return nunca;
    }
  }
}
