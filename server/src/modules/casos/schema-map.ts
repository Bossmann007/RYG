export const TABELAS_ACERVO = [
  "processos",
  "casos",
  "clientes",
  "peticoes",
  "contratos",
  "documentos",
  "decisoes",
  "modelos",
  "historico",
  "teses",
  "resultados",
  "conversas",
  "jurisprudencias",
  "jurimetria",
  "dissidios",
] as const;

export type NomeTabela = (typeof TABELAS_ACERVO)[number];

export type EsquemaAcervo = {
  tabelas: Set<string>;
};

export const ALIASES = {
  id: ["id", "caso_id", "slug", "codigo"],
  processoId: ["processo_id", "id_processo"],
  casoId: ["caso_id", "id_caso"],
  clienteId: ["cliente_id", "id_cliente"],
  numeroCnj: [
    "numero_cnj",
    "process_number",
    "processNumber",
    "cnj",
    "numero",
    "numero_processo",
  ],
  titulo: ["titulo", "title", "nome"],
  tema: ["tema", "theme", "assunto"],
  subtema: ["subtema", "subtheme", "area"],
  court: ["court", "tribunal"],
  chamber: ["chamber", "camara", "orgao", "court_unit", "courtUnit"],
  status: ["status", "situacao", "andamento"],
  cliente: ["cliente", "cliente_nome", "display_name", "displayName", "nome"],
  resumo: ["resumo", "summary", "descricao"],
  tese: ["tese", "thesis"],
  atualizacao: ["atualizacao", "update", "ultima_atualizacao", "updated_at"],
  chance: ["chance", "probabilidade"],
  chanceRotulo: ["chance_rotulo", "chanceRotulo", "rotulo_chance"],
  chanceTexto: ["chance_texto", "chanceTexto", "texto_chance"],
  votos: ["votos"],
  votosFor: ["votos_for", "votosFor", "votos_a_favor"],
  votosAgainst: ["votos_against", "votosAgainst", "votos_contra"],
  votosDiverge: ["votos_diverge", "votosDiverge", "votos_divergentes"],
  partes: ["partes", "parties"],
  payload: ["payload", "caso_json", "dados", "json"],
  tipo: ["tipo", "kind", "type"],
  data: ["data", "date", "filed_at", "filedAt", "created_at", "createdAt"],
  origem: ["origem", "origin", "fonte"],
  detalhe: ["detalhe", "detail", "descricao", "texto"],
  uso: ["uso", "use"],
  forca: ["forca", "force", "strength"],
  desfecho: ["desfecho", "outcome"],
  aprendizado: ["aprendizado", "lesson"],
  autora: ["autora", "autor", "author", "remetente"],
  papel: ["papel", "role"],
  hora: ["hora", "time", "horario"],
  texto: ["texto", "text", "mensagem", "corpo"],
  ia: ["ia", "ai"],
  propria: ["propria", "own"],
  acordao: ["acordao", "ruling"],
  reporter: ["reporter", "relator"],
  alignment: ["alignment", "alinhamento"],
  ementa: ["ementa", "ementa_snippet", "ementaSnippet"],
  citavel: ["citavel", "citable"],
  pontos: ["pontos", "points"],
  essencial: ["essencial"],
  fortalecer: ["fortalecer"],
  blindar: ["blindar"],
  contrapor: ["contrapor"],
  camara: ["camara", "chamber"],
  orientacao: ["orientacao", "orientation"],
  versus: ["versus", "alinhamento", "alignment"],
  nota: ["nota", "note"],
  amostra: ["amostra", "sample"],
  padrao: ["padrao", "pattern"],
  interno: ["interno", "internal"],
  riscos: ["riscos", "risks"],
  jurimetria: ["jurimetria"],
} as const;

export function nomeSeguro(nome: string): string {
  if (!/^[A-Za-z0-9_]+$/.test(nome)) {
    throw new Error("Identificador de banco inválido.");
  }

  return `\`${nome}\``;
}
