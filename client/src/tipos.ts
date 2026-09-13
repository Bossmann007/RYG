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

export type Alinhamento = "for" | "against" | "diverge" | "unknown";

export const FONTES_FATO = [
  "tjpr",
  "datajud",
  "acervo_interno",
  "inferencia",
  "indisponivel",
] as const;

export type FonteFato = (typeof FONTES_FATO)[number];

export const CHANCE_INDISPONIVEL = "indisponível sem modelo oficial";

export type CampoFatoCaso =
  | "titulo"
  | "tema"
  | "subtema"
  | "processNumber"
  | "court"
  | "chamber"
  | "status"
  | "cliente"
  | "partes"
  | "resumo"
  | "tese"
  | "atualizacao"
  | "chance"
  | "votos"
  | "peticoes"
  | "contratos"
  | "documentos"
  | "decisoes"
  | "modelos"
  | "historico"
  | "prazos"
  | "teses"
  | "resultados"
  | "conversas"
  | "jurisprudencias"
  | "dissidios"
  | "jurimetria";

export type ProvenienciaCaso = Record<CampoFatoCaso, FonteFato>;

export type AbaCaso =
  | "visao"
  | "peticoes"
  | "contratos"
  | "documentos"
  | "decisoes"
  | "modelos"
  | "historico"
  | "prazos"
  | "teses"
  | "resultados"
  | "conversas"
  | "jurisprudencia"
  | "jurimetria"
  | "relatorios";

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
  corpo?: string;
};

export type Andamento = {
  data: string;
  titulo: string;
  detalhe: string;
};

export const PRAZO_KINDS = [
  "manifestacao",
  "recurso",
  "prova",
  "audiencia",
  "interno",
  "outro",
] as const;
export const PRAZO_STATUSES = [
  "aberto",
  "a_vencer",
  "vencido",
  "cumprido",
  "suspenso",
] as const;
export const PRAZO_CALENDARIOS = ["uteis", "corridos"] as const;

export type PrazoKind = (typeof PRAZO_KINDS)[number];
export type PrazoStatus = (typeof PRAZO_STATUSES)[number];
export type PrazoCalendario = (typeof PRAZO_CALENDARIOS)[number];

/**
 * Office calendar. The clock may start from a public movement,
 * but the due date, owner and status live in the internal bank.
 */
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

export const ROTULO_PRAZO_KIND: Record<PrazoKind, string> = {
  manifestacao: "Manifestação",
  recurso: "Recurso",
  prova: "Prova",
  audiencia: "Audiência",
  interno: "Interno",
  outro: "Outro",
};

export const ROTULO_PRAZO_STATUS: Record<PrazoStatus, string> = {
  aberto: "Aberto",
  a_vencer: "A vencer",
  vencido: "Vencido",
  cumprido: "Cumprido",
  suspenso: "Suspenso",
};

export const ROTULO_CALENDARIO: Record<PrazoCalendario, string> = {
  uteis: "dias úteis",
  corridos: "dias corridos",
};

export type Tese = {
  id: string;
  titulo: string;
  uso: string;
  forca: "alta" | "media" | "baixa";
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
  hora?: string;
  texto: string;
  createdAt?: string;
  simulada?: boolean;
  ia?: boolean;
  propria?: boolean;
};

/** Leitura curta de um recorte do acórdão: um parágrafo e os pontos de apoio. */
export type BlocoAnalise = {
  resumo: string;
  itens: string[];
};

export type RelacaoJuris = "mesmo_caso" | "precedente_tema" | "relacionado";

export const ROTULO_RELACAO: Record<RelacaoJuris, string> = {
  mesmo_caso: "Mesmo caso",
  precedente_tema: "Precedente por tema",
  relacionado: "Relacionado",
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
  citavel?: boolean;
  fonte?: FonteFato;
  relacao?: RelacaoJuris;
};

export type Dissidio = {
  camara: string;
  orientacao: string;
  versus: Alinhamento;
  nota: string;
  fonte?: FonteFato;
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
  jurimetria: {
    amostra: number;
    padrao: string;
    interno: string;
    riscos: string[];
  };
  fontes?: ProvenienciaCaso;
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
  unknown: "Não avaliado",
};

export const ROTULO_FONTE: Record<FonteFato, string> = {
  tjpr: "TJPR",
  datajud: "DataJud",
  acervo_interno: "Acervo interno",
  inferencia: "Inferência",
  indisponivel: "Indisponível",
};

export function rotuloFonte(fonte: FonteFato): string {
  switch (fonte) {
    case "tjpr":
    case "datajud":
    case "acervo_interno":
    case "inferencia":
    case "indisponivel":
      return ROTULO_FONTE[fonte];
    default: {
      const neverFonte: never = fonte;
      return neverFonte;
    }
  }
}

export function ehCitavel(item: { citavel?: boolean; ementa?: string }): boolean {
  return item.citavel === true && Boolean(item.ementa?.trim());
}

export function chanceIndisponivel(caso: Caso): boolean {
  return (
    caso.fontes?.chance === "indisponivel" ||
    caso.chanceRotulo === CHANCE_INDISPONIVEL ||
    !caso.chance
  );
}
