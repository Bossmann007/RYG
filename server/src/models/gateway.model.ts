import { NivelDeclassificacao, Sigilo } from "@models/classificacao.model";
import type { SafeDTO } from "@openlegalai/privacy-gateway";

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

export type ResultadoFerramenta =
  | {
      decisao: "permitido";
      ferramenta: string;
      motivo?: undefined;
      dto: SafeDTO;
      /** Bytes de `serializeSafeDtoForMcp`, exatamente o texto que o cliente recebe. */
      wire: string;
    }
  | { decisao: "negado"; ferramenta: string; motivo?: string };

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
