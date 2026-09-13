import { randomUUID } from "node:crypto";
import {
  Contrato,
  EdicaoContrato,
  NovoContrato,
} from "@models/contrato.model";
import { Injectable } from "@nestjs/common";
import { CONTRATOS } from "../../fixtures/contratos";
import { ContratosRepository } from "@modules/contracts/contracts.repository";

/**
 * Implementacao de memoria, valida ate o banco existir.
 *
 * Copia a fixture na construcao em vez de apontar para ela: escrever direto no
 * array exportado deixaria um POST de um teste visivel no proximo, e o estado
 * "sujo" so apareceria como um teste que passa sozinho e falha na suite.
 *
 * O que ela nao finge ser: nao ha persistencia entre reinicios. Um POST some no
 * proximo `npm run start:dev`. Isso e esperado e desaparece junto com esta
 * classe quando o banco entrar.
 */
@Injectable()
export class ContratosMemoryRepository extends ContratosRepository {
  private readonly contratos: Contrato[];

  constructor() {
    super();
    this.contratos = CONTRATOS.map((c) => ({ ...c }));
  }

  async listarPorCaso(casoId: string): Promise<Contrato[]> {
    return this.contratos
      .filter((c) => c.casoId === casoId)
      .map((c) => ({ ...c }));
  }

  async buscarPorId(id: string): Promise<Contrato | null> {
    const achado = this.contratos.find((c) => c.id === id);
    return achado ? { ...achado } : null;
  }

  async criar(novo: NovoContrato): Promise<Contrato> {
    const contrato: Contrato = { ...novo, id: randomUUID() };
    this.contratos.push(contrato);
    return { ...contrato };
  }

  async atualizar(
    id: string,
    edicao: EdicaoContrato
  ): Promise<Contrato | null> {
    const indice = this.contratos.findIndex((c) => c.id === id);
    if (indice < 0) {
      return null;
    }
    const atual = this.contratos[indice];
    const atualizado: Contrato = { ...atual, ...edicao, id: atual.id, casoId: atual.casoId };
    this.contratos[indice] = atualizado;
    return { ...atualizado };
  }

  async remover(id: string): Promise<boolean> {
    const indice = this.contratos.findIndex((c) => c.id === id);
    if (indice < 0) {
      return false;
    }
    this.contratos.splice(indice, 1);
    return true;
  }
}
