import {
  CHANCE_INDISPONIVEL,
  CampoFatoCaso,
  Caso,
  FonteFato,
  ProvenienciaCaso,
} from "./tipos";

const CAMPOS_ACERVO: CampoFatoCaso[] = [
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
];

export function aplicarPoliticaAntiAlucinacao(caso: Caso): Caso {
  const fontes = fontesAcervo(caso);

  return {
    ...caso,
    chance: 0,
    chanceRotulo: CHANCE_INDISPONIVEL,
    chanceTexto: CHANCE_INDISPONIVEL,
    prazos: caso.prazos || [],
    teses: caso.teses.map((tese) => ({ ...tese, fonte: "acervo_interno" as const })),
    jurisprudencias: caso.jurisprudencias.map((item) => ({
      ...item,
      citavel: false,
      fonte: "acervo_interno" as const,
      ementa: "",
    })),
    fontes,
  };
}

function fontesAcervo(caso: Caso): ProvenienciaCaso {
  const fontes = {
    chance: "indisponivel",
  } as ProvenienciaCaso;

  for (const campo of CAMPOS_ACERVO) {
    fontes[campo] = campoPreenchido(caso, campo) ? "acervo_interno" : "indisponivel";
  }

  return fontes;
}

function campoPreenchido(caso: Caso, campo: CampoFatoCaso): boolean {
  const valor = caso[campo];

  if (typeof valor === "string") {
    return valor.trim().length > 0;
  }

  if (Array.isArray(valor)) {
    return valor.length > 0;
  }

  if (campo === "votos") {
    return caso.votos.for + caso.votos.against + caso.votos.diverge > 0;
  }

  if (campo === "jurimetria") {
    return Boolean(
      caso.jurimetria.amostra || caso.jurimetria.padrao || caso.jurimetria.interno
    );
  }

  return valor != null;
}

export function fonteDoCampo(caso: Caso, campo: CampoFatoCaso): FonteFato {
  return caso.fontes?.[campo] || (campo === "chance" ? "indisponivel" : "acervo_interno");
}
