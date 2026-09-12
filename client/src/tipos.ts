export type StatusProcesso =
  | "DISTRIBUIDO"
  | "ATIVO"
  | "CONCLUSO"
  | "AGUARDANDO_MANIFESTACAO"
  | "SUSPENSO"
  | "EM_RECURSO"
  | "SENTENCIADO"
  | "TRANSITADO_EM_JULGADO"
  | "EM_EXECUCAO"
  | "ARQUIVADO_PROVISORIAMENTE"
  | "ARQUIVADO_DEFINITIVAMENTE"
  | "BAIXADO"
  | "EXTINTO"
  | "INATIVO"
  | "CANCELADO";

export type Alinhamento = "for" | "against" | "diverge";

export type AbaCaso =
  | "visao"
  | "peticoes"
  | "contratos"
  | "documentos"
  | "decisoes"
  | "modelos"
  | "historico"
  | "teses"
  | "resultados"
  | "conversas"
  | "jurisprudencia"
  | "jurimetria";

export type TelaApp =
  | { tipo: "casos" }
  | { tipo: "caso"; id: string };

export type MembroEquipe = {
  id: string;
  nome: string;
  papel: string;
  iniciais: string;
};

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
  forca: "alta" | "media" | "baixa";
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

/** Leitura curta de um recorte do acórdão: um parágrafo e os pontos de apoio. */
export type BlocoAnalise = {
  resumo: string;
  itens: string[];
};

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
};

export type Dissidio = {
  camara: string;
  orientacao: string;
  versus: Alinhamento;
  nota: string;
};

export type Caso = {
  id: string;
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
  teses: Tese[];
  resultados: ResultadoInterno[];
  conversas: Mensagem[];
  jurisprudencias: Jurisprudencia[];
  dissidios: Dissidio[];
  jurimetria: {
    amostra: number;
    padrao: string;
    interno: string;
    riscos: string[];
  };
};

export const STATUS_PROCESSO: StatusProcesso[] = [
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
];

export const ROTULO_STATUS: Record<StatusProcesso, string> = {
  DISTRIBUIDO: "Distribuído",
  ATIVO: "Ativo",
  CONCLUSO: "Concluso",
  AGUARDANDO_MANIFESTACAO: "Aguardando manifestação",
  SUSPENSO: "Suspenso",
  EM_RECURSO: "Em recurso",
  SENTENCIADO: "Sentenciado",
  TRANSITADO_EM_JULGADO: "Trânsito em julgado",
  EM_EXECUCAO: "Em execução",
  ARQUIVADO_PROVISORIAMENTE: "Arquivo provisório",
  ARQUIVADO_DEFINITIVAMENTE: "Arquivo definitivo",
  BAIXADO: "Baixado",
  EXTINTO: "Extinto",
  INATIVO: "Inativo",
  CANCELADO: "Cancelado",
};

export const ROTULO_ALINHAMENTO: Record<Alinhamento, string> = {
  for: "A favor",
  against: "Contra",
  diverge: "Divergente",
};
