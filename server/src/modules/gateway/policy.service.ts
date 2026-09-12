import { Decisao, Identidade, Papel } from "@models/gateway.model";
import { Injectable } from "@nestjs/common";

type RegraPapel = {
  ferramentas: string[];
  descricao: string;
};

/**
 * Matriz RBAC. O que não está listado aqui não é acessível — a política é
 * default deny, então adicionar uma ferramenta nova não a libera para ninguém
 * até que ela apareça nesta matriz.
 *
 * Note o que o papel controla agora: **quais perguntas podem ser feitas**, não
 * quanto dado bruto volta. Como toda saída é um SafeDTO construído do zero,
 * ninguém — nem o sócio — recebe registro do acervo no cliente externo. A
 * diferença entre papéis deixou de ser "quanto eu vejo" e virou "o que eu posso
 * perguntar".
 */
const MATRIZ: Record<Papel, RegraPapel> = {
  socio: {
    ferramentas: [
      "enter_office",
      "get_safe_summary",
      "search_safe_knowledge",
      "get_safe_update",
    ],
    descricao: "Pode perguntar sobre qualquer caso do escritório.",
  },
  advogado: {
    ferramentas: [
      "enter_office",
      "get_safe_summary",
      "search_safe_knowledge",
      "get_safe_update",
    ],
    descricao: "Pode perguntar sobre qualquer caso do escritório.",
  },
  estagiario: {
    ferramentas: ["enter_office", "search_safe_knowledge", "get_safe_update"],
    descricao:
      "Pesquisa de tese e leitura estratégica. Não pergunta a situação de um caso específico.",
  },
  gestor: {
    ferramentas: ["enter_office", "get_safe_update"],
    descricao:
      "Leitura estratégica e jurimetria. Não consulta caso nem acervo de conhecimento.",
  },
};

export type Avaliacao = {
  decisao: Decisao;
  motivo?: string;
};

@Injectable()
export class PolicyService {
  avaliar(identidade: Identidade | null, ferramenta: string): Avaliacao {
    if (!identidade) {
      return {
        decisao: "negado",
        motivo:
          "Sem identidade reconhecida no gateway. Nenhum dado do acervo sai sem credencial.",
      };
    }

    const regra = MATRIZ[identidade.papel];

    if (!regra) {
      return {
        decisao: "negado",
        motivo: `Papel '${identidade.papel}' não consta na política de acesso.`,
      };
    }

    if (!regra.ferramentas.includes(ferramenta)) {
      return {
        decisao: "negado",
        motivo: `O papel '${identidade.papel}' não tem acesso a '${ferramenta}'. ${regra.descricao}`,
      };
    }

    return { decisao: "permitido" };
  }

  /** Ferramentas que este papel enxerga. Um cliente MCP nem lista o resto. */
  ferramentasPermitidas(identidade: Identidade | null): string[] {
    if (!identidade) {
      return [];
    }

    return MATRIZ[identidade.papel]?.ferramentas || [];
  }

  matriz(): Record<Papel, RegraPapel> {
    return MATRIZ;
  }
}
