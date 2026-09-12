import { OrientacaoCamara } from "@models/processo.model";

export type Alinhamento = "for" | "against" | "diverge" | "unknown";
export type CiteStatus = "ok" | "unavailable";

export type JurisprudenciaFixture = {
  id: string;
  court: string;
  chamber: string;
  organ: string;
  ementaSnippet: string | null;
  voteSummary: string | null;
  orientation: OrientacaoCamara | null;
  relatedSubjects: string[];
};

export type Jurisprudencia = JurisprudenciaFixture & {
  alignment: Alinhamento;
  citeStatus: CiteStatus;
};
