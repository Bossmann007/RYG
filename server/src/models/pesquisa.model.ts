import { FonteFato } from "@common/security/fonte-fato";
import { Alinhamento, Jurisprudencia } from "@models/jurisprudencia.model";
import { Processo } from "@models/processo.model";

export type ConflitoCamara = {
  chamber: string;
  court: string;
  orientationLabel: string;
  vsProcessChamber: Alinhamento;
  note: string;
};

export type RelatorioDissidio = {
  narrative: string;
  conflicts: ConflitoCamara[];
};

export type RelatorioChance = {
  score: number;
  label: string;
  rationale: string;
  blindagem: string[];
  fonte: FonteFato;
};

export type ResultadoPesquisa = {
  demo: true;
  process: Processo;
  jurisprudences: Jurisprudencia[];
  dissidioReport: RelatorioDissidio;
  chanceReport: RelatorioChance;
};
