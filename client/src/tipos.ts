export type Alinhamento = "for" | "against" | "diverge" | "unknown";
export type CiteStatus = "ok" | "unavailable";

export type ParteProcesso = {
  papel: string;
  nome: string;
};

export type AndamentoProcesso = {
  data: string;
  descricao: string;
};

export type Processo = {
  processNumber: string;
  court: string;
  courtUnit: string;
  caseClass: string;
  subjects: string[];
  chamber: string;
  organ: string;
  degree: string;
  distributionDate: string;
  parties: ParteProcesso[];
  movements: AndamentoProcesso[];
  thesis: string;
  summary: string;
  importedFile?: { name: string };
};

export type Jurisprudencia = {
  id: string;
  processNumber: string;
  acordaoNumber: string | null;
  court: string;
  chamber: string;
  organ: string;
  reporter: string | null;
  district: string | null;
  caseClass: string;
  subjects: string[];
  judgmentDate: string | null;
  publicationDate: string | null;
  decisionType: string;
  ementaSnippet: string | null;
  voteSummary: string | null;
  alignment: Alinhamento;
  citeStatus: CiteStatus;
};

export type ConflitoCamara = {
  chamber: string;
  court: string;
  orientationLabel: string;
  vsProcessChamber: Alinhamento;
  note: string;
};

export type ResultadoPesquisa = {
  demo: true;
  process: Processo;
  jurisprudences: Jurisprudencia[];
  dissidioReport: {
    narrative: string;
    conflicts: ConflitoCamara[];
  };
  chanceReport: {
    score: number;
    label: string;
    rationale: string;
    blindagem: string[];
  };
};

export const NUMERO_PROCESSO_DEMO = "9000064-42.2023.8.26.0100";

export const ROTULO_ALINHAMENTO: Record<Alinhamento, string> = {
  for: "A favor",
  against: "Contra",
  diverge: "Diverge",
  unknown: "Desconhecido",
};
