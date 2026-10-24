import { NivelDeclassificacao, Sigilo } from "@models/classificacao.model";
import { EnvelopeSafe } from "@models/safe-dto.model";

export type Papel = "socio" | "advogado" | "estagiario" | "gestor";

export type Identidade = {
  id: string;
  nome: string;
  papel: Papel;
  escritorio: string;
};

/** De onde a chamada entrou. `whatsapp` cobre só o envio com confirmação humana. */
export type Origem = "mcp" | "whatsapp" | "hub";

export type Decisao = "permitido" | "negado";

export type ResultadoFerramenta = {
  decisao: Decisao;
  ferramenta: string;
  motivo?: string;
  /**
   * After ADR 0002, MCP egress carries privacy-gateway SafeDTO here.
   * EnvelopeSafe stays Nest-internal until SafeDtoEgressService maps it.
   */
  conteudo?: EnvelopeSafe<string, unknown> | Record<string, unknown>;
  /** Canonical SafeDTO JSON bytes for MCP text content. */
  wire?: string;
  /** O que a declassificacao destruiu no caminho. */
  omitido: string[];
};

export type RegistroAuditoria = {
  at: string;
  identidade: string;
  nome: string;
  papel: Papel | "desconhecido";
  origem: Origem;
  ferramenta: string;
  argumentos: Record<string, unknown>;
  decisao: Decisao;
  motivo?: string;
  /** Rotulo da fonte consultada e quanto dela sobreviveu a saida. */
  sigiloOrigem?: Sigilo;
  nivel?: NivelDeclassificacao;
  omitido: string[];
  duracaoMs: number;
};
