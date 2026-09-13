import { FonteFato, ProvenienciaCaso } from "@common/security/fonte-fato";

export type PrazoKind =
  | "manifestacao"
  | "recurso"
  | "prova"
  | "audiencia"
  | "interno"
  | "outro";

export type PrazoStatus =
  | "aberto"
  | "a_vencer"
  | "vencido"
  | "cumprido"
  | "suspenso";

export type PrazoCalendario = "uteis" | "corridos";

export type Prazo = {
  id: string;
  title: string;
  kind: PrazoKind;
  dueAt: string;
  startedAt?: string;
  days: number;
  calendar: PrazoCalendario;
  status: PrazoStatus;
  owner: string;
  trigger: string;
  gatilhoFonte: FonteFato;
  notes?: string;
};

export type { FonteFato, ProvenienciaCaso };

export const STATUS_PROCESSO = [
  "DISTRIBUIDO",
  "ATIVO",
  "CONCLUSO",
  "AGUARDANDO_MANIFESTACAO",
  "SUSPENSO",
  "EM_RECURSO",
  "SENTENCIADO",
  "TRANSITADO_EM_JULGADO",
  "EM_EXECUCAO",
  "ARQUIVADO_PROVISORIAMENTE",
  "ARQUIVADO_DEFINITIVAMENTE",
  "BAIXADO",
  "EXTINTO",
  "INATIVO",
  "CANCELADO",
] as const;

export type StatusProcesso = (typeof STATUS_PROCESSO)[number];
export type Alinhamento = "for" | "against" | "diverge" | "unknown";
export type ForcaTese = "alta" | "media" | "baixa";

export type ParteProcesso = {
  papel: string;
  nome: string;
};

export type Documento = {
  id: string;
  titulo: string;
  tipo: string;
  data: string;
  origem: string;
  resumo: string;
};

export type Andamento = {
  data: string;
  titulo: string;
  detalhe: string;
};

export type Tese = {
  id: string;
  titulo: string;
  uso: string;
  forca: ForcaTese;
  fonte?: FonteFato;
};

export type ResultadoInterno = {
  id: string;
  titulo: string;
  desfecho: string;
  aprendizado: string;
};

export type Mensagem = {
  id: string;
  autora: string;
  papel: string;
  hora: string;
  texto: string;
  ia?: boolean;
  propria?: boolean;
};

export type BlocoAnalise = {
  resumo: string;
  itens: string[];
};

export type RelacaoJuris = "mesmo_caso" | "precedente_tema" | "relacionado";

export type Jurisprudencia = {
  id: string;
  processNumber: string;
  acordao: string;
  court: string;
  chamber: string;
  reporter: string;
  date: string;
  status: StatusProcesso;
  alignment: Alinhamento;
  ementa: string;
  pontos: string[];
  essencial: BlocoAnalise;
  fortalecer: BlocoAnalise;
  blindar: BlocoAnalise;
  contrapor: BlocoAnalise;
  citavel: boolean;
  fonte: FonteFato;
  relacao?: RelacaoJuris;
};

export type Dissidio = {
  camara: string;
  orientacao: string;
  versus: Alinhamento;
  nota: string;
  fonte?: FonteFato;
};

export type Jurimetria = {
  amostra: number;
  padrao: string;
  interno: string;
  riscos: string[];
};

export type Caso = {
  id: string;
  processoId?: string;
  titulo: string;
  tema: string;
  subtema: string;
  processNumber: string;
  court: string;
  chamber: string;
  status: StatusProcesso;
  cliente: string;
  partes: ParteProcesso[];
  resumo: string;
  tese: string;
  atualizacao: string;
  chance: number;
  chanceRotulo: string;
  chanceTexto: string;
  votos: { for: number; against: number; diverge: number };
  peticoes: Documento[];
  contratos: Documento[];
  documentos: Documento[];
  decisoes: Documento[];
  modelos: Documento[];
  historico: Andamento[];
  prazos: Prazo[];
  teses: Tese[];
  resultados: ResultadoInterno[];
  conversas: Mensagem[];
  jurisprudencias: Jurisprudencia[];
  dissidios: Dissidio[];
  jurimetria: Jurimetria;
  fontes: ProvenienciaCaso;
};

export const CAMPOS_CASO = [
  "id",
  "processoId",
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
  "chanceRotulo",
  "chanceTexto",
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
  "fontes",
] as const;
