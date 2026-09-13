import { Contrato, EdicaoContrato, NovoContrato } from "@models/contrato.model";
import { Injectable } from "@nestjs/common";
import { randomBytes } from "crypto";
import { CONTRATOS_INICIAIS } from "../../fixtures/contratos";
import { ContratosRepository, FiltroContratos } from "./contracts.repository";

/**
 * Implementacao de memoria, valida ate o banco existir.
 *
 * Copia a fixture na construcao em vez de apontar para ela: escrever direto no
 * array exportado deixaria um POST de um teste visivel no proximo, e esse
 * estado sujo so apareceria como um teste que passa sozinho e falha na suite.
 *
 * O que ela nao finge ser: nao ha persistencia entre reinicios. Um POST some no
 * proximo start. Isso e esperado e desaparece junto com esta classe.
 */
@Injectable()
export class ContratosMemoryRepository extends ContratosRepository {
  private readonly contratos: Contrato[];

  constructor() {
    super();
    this.contratos = CONTRATOS_INICIAIS.map((contrato) => ({ ...contrato }));
  }

  async listar(filtro: FiltroContratos): Promise<Contrato[]> {
    const casoId = filtro.casoId?.trim();
    // A ordem da fixture e a ordem natural dos documentos do caso (original,
    // aditivo, termo). Ordenar por titulo deixaria a aba fora de sequencia.
    return this.contratos
      .filter((contrato) => !casoId || contrato.casoId === casoId)
      .map((contrato) => ({ ...contrato }));
  }

  async buscarPorId(id: string): Promise<Contrato | null> {
    const achado = this.contratos.find((contrato) => contrato.id === id);
    return achado ? { ...achado } : null;
  }

  async criar(novo: NovoContrato): Promise<Contrato> {
    const contrato: Contrato = {
      ...novo,
      id: `ctr_${randomBytes(6).toString("hex")}`,
    };
    this.contratos.push(contrato);
    return { ...contrato };
  }

  async atualizar(
    id: string,
    edicao: EdicaoContrato
  ): Promise<Contrato | null> {
    const indice = this.contratos.findIndex((contrato) => contrato.id === id);
    if (indice < 0) {
      return null;
    }
    const atual = this.contratos[indice];
    const atualizado: Contrato = {
      ...atual,
      ...edicao,
      id: atual.id,
      casoId: atual.casoId,
    };
    this.contratos[indice] = atualizado;
    return { ...atualizado };
  }

  async remover(id: string): Promise<boolean> {
    const indice = this.contratos.findIndex((contrato) => contrato.id === id);
    if (indice < 0) {
      return false;
    }
    this.contratos.splice(indice, 1);
    return true;
  }
}
