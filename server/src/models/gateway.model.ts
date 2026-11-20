import { NivelDeclassificacao, Sigilo } from "@models/classificacao.model";
import { EnvelopeSafe } from "@models/safe-dto.model";

export type Papel = "socio" | "advogado" | "estagiario" | "gestor";

export type Identidade = {
  id: string;
  nome: string;
  papel: Papel;
  escritorio: string;
  /** Fixture or JML leaver. Runtime disables live in HubSessionService. */
  disabled?: boolean;
};

/** De onde a chamada entrou. `whatsapp` cobre só o envio com confirmação humana. */
export type Origem = "mcp" | "whatsapp" | "hub" | "pa";

export type Decisao = "permitido" | "negado";

export type ResultadoFerramenta = {
  decisao: Decisao;
  ferramenta: string;
  motivo?: string;
  conteudo?: EnvelopeSafe<string, unknown>;
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
  /** ADR 0005: a PA call is the human's delegated session, not a second user. */
  actor?: "pa_session";
  delegated_by?: string;
  caseId?: string;
};
