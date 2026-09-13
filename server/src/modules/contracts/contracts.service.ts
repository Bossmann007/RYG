import { Contrato } from "@models/contrato.model";
import { Injectable, NotFoundException } from "@nestjs/common";
import { CreateContratoDto, UpdateContratoDto } from "./contracts.dto";
import { ContratosRepository, FiltroContratos } from "./contracts.repository";

const TIPO_PADRAO = "Contrato";

@Injectable()
export class ContractsService {
  constructor(private readonly repositorio: ContratosRepository) {}

  listar(filtro: FiltroContratos): Promise<Contrato[]> {
    return this.repositorio.listar(filtro);
  }

  async obter(id: string): Promise<Contrato> {
    const contrato = await this.repositorio.buscarPorId(id);

    if (!contrato) {
      throw new NotFoundException("Contrato não encontrado.");
    }

    return contrato;
  }

  criar(dto: CreateContratoDto): Promise<Contrato> {
    return this.repositorio.criar({
      casoId: dto.casoId.trim(),
      titulo: dto.titulo.trim(),
      tipo: dto.tipo?.trim() || TIPO_PADRAO,
      data: dto.data.trim(),
      origem: dto.origem.trim(),
      resumo: dto.resumo.trim(),
    });
  }

  async atualizar(id: string, dto: UpdateContratoDto): Promise<Contrato> {
    const atualizado = await this.repositorio.atualizar(id, dto);

    if (!atualizado) {
      throw new NotFoundException("Contrato não encontrado.");
    }

    return atualizado;
  }

  async remover(id: string): Promise<void> {
    const removido = await this.repositorio.remover(id);

    if (!removido) {
      throw new NotFoundException("Contrato não encontrado.");
    }
  }
}
