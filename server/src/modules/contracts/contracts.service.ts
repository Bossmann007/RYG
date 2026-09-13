import { Contrato } from "@models/contrato.model";
import {
  CriarContratoDto,
  EditarContratoDto,
} from "@modules/contracts/contracts.dto";
import { ContratosRepository } from "@modules/contracts/contracts.repository";
import { Injectable, NotFoundException } from "@nestjs/common";

const TIPO_PADRAO = "Contrato";

@Injectable()
export class ContractsService {
  constructor(private readonly repositorio: ContratosRepository) {}

  listarPorCaso(casoId: string): Promise<Contrato[]> {
    return this.repositorio.listarPorCaso(casoId);
  }

  async buscarPorId(id: string): Promise<Contrato> {
    const contrato = await this.repositorio.buscarPorId(id);
    if (!contrato) {
      throw new NotFoundException("Contrato nao encontrado");
    }
    return contrato;
  }

  criar(dto: CriarContratoDto): Promise<Contrato> {
    return this.repositorio.criar({
      casoId: dto.casoId,
      titulo: dto.titulo,
      tipo: dto.tipo ?? TIPO_PADRAO,
      data: dto.data,
      origem: dto.origem,
      resumo: dto.resumo,
    });
  }

  async atualizar(id: string, dto: EditarContratoDto): Promise<Contrato> {
    const atualizado = await this.repositorio.atualizar(id, dto);
    if (!atualizado) {
      throw new NotFoundException("Contrato nao encontrado");
    }
    return atualizado;
  }

  async remover(id: string): Promise<void> {
    const removido = await this.repositorio.remover(id);
    if (!removido) {
      throw new NotFoundException("Contrato nao encontrado");
    }
  }
}
