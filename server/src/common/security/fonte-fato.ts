export const FONTES_FATO = [
  "datajud",
  "acervo_interno",
  "inferencia",
  "indisponivel",
] as const;

export type FonteFato = (typeof FONTES_FATO)[number];

export const CHANCE_INDISPONIVEL = "indisponível sem modelo oficial";

export const CAMPOS_FATO_CASO = [
  "titulo",
  "tema",
  "subtema",
  "processNumber",
  "court",
  "chamber",
  "status",
  "cliente",
  "partes",
  "resumo",
  "tese",
  "atualizacao",
  "chance",
  "votos",
  "peticoes",
  "contratos",
  "documentos",
  "decisoes",
  "modelos",
  "historico",
  "prazos",
  "teses",
  "resultados",
  "conversas",
  "jurisprudencias",
  "dissidios",
  "jurimetria",
] as const;

export type CampoFatoCaso = (typeof CAMPOS_FATO_CASO)[number];

export type ProvenienciaCaso = Record<CampoFatoCaso, FonteFato>;

export function fonteDeTexto(valor: string, origem: FonteFato): FonteFato {
  return valor.trim() ? origem : "indisponivel";
}

export function rotuloFonte(fonte: FonteFato): string {
  switch (fonte) {
    case "datajud":
      return "DataJud";
    case "acervo_interno":
      return "Acervo interno";
    case "inferencia":
      return "Inferência";
    case "indisponivel":
      return "Indisponível";
    default: {
      const neverFonte: never = fonte;
      return neverFonte;
    }
  }
}
