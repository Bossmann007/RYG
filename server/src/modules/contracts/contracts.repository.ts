import {
  Contrato,
  EdicaoContrato,
  NovoContrato,
} from "@models/contrato.model";

export type FiltroContratos = {
  casoId?: string;
};

/**
 * A costura entre os endpoints e a origem dos dados.
 *
 * Hoje quem implementa isto guarda os contratos em memoria, a partir de
 * fixture. Quando o banco existir, entra uma classe nova que implementa esta
 * mesma interface e o modulo troca o provider: controller, DTO e service ficam
 * como estao.
 *
 * Os modulos vizinhos (clients, petitions) guardam os dados no proprio service.
 * Aqui a fronteira e separada de proposito, porque o pedido foi "banco depois":
 * quando o driver entrar, este modulo ja tem onde encaixa-lo e serve de molde
 * para converter os outros dois.
 *
 * Os metodos ja sao assincronos pelo mesmo motivo. Nenhum precisa disso hoje,
 * mas assinatura sincrona agora obrigaria a mexer em service e controller
 * justamente no dia da troca.
 */
export abstract class ContratosRepository {
  abstract listar(filtro: FiltroContratos): Promise<Contrato[]>;

  abstract buscarPorId(id: string): Promise<Contrato | null>;

  abstract criar(novo: NovoContrato): Promise<Contrato>;

  abstract atualizar(
    id: string,
    edicao: EdicaoContrato
  ): Promise<Contrato | null>;

  /** `false` quando nao havia nada para remover. */
  abstract remover(id: string): Promise<boolean>;
}
