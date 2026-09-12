import { NivelDeclassificacao, Sigilo } from "@models/classificacao.model";

/**
 * O contrato de saída do escritório.
 *
 * A inversão que importa: o DTO não é o registro filtrado, é uma estrutura
 * construída do zero a partir de uma allowlist. O registro bruto nunca é
 * serializado — não existe caminho em que "esqueci de remover um campo"
 * produza vazamento, porque nenhum campo entra sem ter sido escrito aqui.
 */
export type EnvelopeSafe<T extends string, C> = {
  tipo: T;
  conteudo: C;
  declassificacao: {
    sigiloOrigem: Sigilo;
    nivel: NivelDeclassificacao;
    /** Fontes que alimentaram o DTO, sem identificar o conteúdo delas. */
    fontes: string[];
    /** O que foi destruído no caminho, para o modelo externo saber o que não tem. */
    omitido: string[];
  };
};

/**
 * Campos de texto livre gerados pelo declassificador. São os únicos submetidos
 * à checagem de n-gramas contra a fonte: o resto do DTO é vocabulário
 * controlado, contagem ou faixa, e não pode carregar informação da fonte.
 */
export const CAMPOS_GERADOS = ["sintese", "situacao", "recomendacao"] as const;

export type FaseProcessual =
  | "conhecimento"
  | "sentenciado"
  | "recursal"
  | "transitado"
  | "indeterminada";

export type SafeCaseSummary = EnvelopeSafe<
  "case_summary",
  {
    referencia: string;
    tribunal: string;
    grau: string;
    orgaoJulgador: string;
    fase: FaseProcessual;
    assuntos: string[];
    quantidadeAndamentos: number;
    quantidadePartes: number;
    orientacaoDoOrgao: "restritiva" | "favoravel" | "indefinida";
    /** Texto gerado. Nunca contém trecho da capa nem nome de parte. */
    situacao: string;
  }
>;

export type ItemConhecimento = {
  referencia: string;
  tribunal: string;
  orgaoJulgador: string;
  relator: string | null;
  data: string | null;
  sentido: "restritivo" | "favoravel" | "indefinido";
  citavel: boolean;
  /** Só preenchido quando a fonte é pública; caso contrário, null. */
  ementa: string | null;
};

export type SafeKnowledgeResult = EnvelopeSafe<
  "knowledge_result",
  {
    consulta: string[];
    quantidade: number;
    itens: ItemConhecimento[];
  }
>;

export type SafeStrategicUpdate = EnvelopeSafe<
  "strategic_update",
  {
    referencia: string;
    faixaDeRisco: "baixa" | "moderada" | "razoavel";
    divergenciaEntreOrgaos: {
      alinhados: number;
      divergentes: number;
      contrarios: number;
      semEmentaCitavel: number;
    };
    /** Texto gerado sobre o conjunto. */
    sintese: string;
    /** Pontos de atenção, gerados — não copiados de peça nem de voto. */
    recomendacao: string[];
  }
>;

export type SafeOfficeManifest = EnvelopeSafe<
  "office_manifest",
  {
    escritorio: string;
    papel: string;
    ferramentas: string[];
    politica: string;
    tetoDeDeclassificacao: Record<string, string>;
  }
>;

export type QualquerSafeDTO =
  | SafeCaseSummary
  | SafeKnowledgeResult
  | SafeStrategicUpdate
  | SafeOfficeManifest;
