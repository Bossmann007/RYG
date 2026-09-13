import {
  Contrato,
  EdicaoContrato,
  NovoContrato,
} from "@models/contrato.model";

/**
 * A costura entre os endpoints e a origem dos dados.
 *
 * Hoje quem implementa isto guarda os contratos em memoria, a partir de
 * fixture. Quando o banco existir, entra uma classe nova que implementa esta
 * mesma interface e o modulo troca o provider: controller, DTO e service ficam
 * como estao. Sem esta fronteira, "ligar o banco" viraria reescrever o modulo
 * inteiro.
 *
 * Os metodos ja sao assincronos de proposito. Nenhum deles precisa disso hoje,
 * mas uma assinatura sincrona agora obrigaria a mudar service e controller no
 * dia em que o driver do banco entrar — que e exatamente o dia em que ninguem
 * quer estar mexendo em controller.
 */
export abstract class ContratosRepository {
  abstract listarPorCaso(casoId: string): Promise<Contrato[]>;

  abstract buscarPorId(id: string): Promise<Contrato | null>;

  abstract criar(novo: NovoContrato): Promise<Contrato>;

  abstract atualizar(
    id: string,
    edicao: EdicaoContrato
  ): Promise<Contrato | null>;

  /** `false` quando nao havia nada para remover. */
  abstract remover(id: string): Promise<boolean>;
}
