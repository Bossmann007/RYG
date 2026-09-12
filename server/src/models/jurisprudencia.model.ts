import { OrientacaoCamara } from "@models/processo.model";

export type Alinhamento = "for" | "against" | "diverge" | "unknown";
export type CiteStatus = "ok" | "unavailable";

export type JurisprudenciaFixture = {
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
  orientation: OrientacaoCamara | null;
  relatedSubjects: string[];
};

export type Jurisprudencia = JurisprudenciaFixture & {
  alignment: Alinhamento;
  citeStatus: CiteStatus;
};
