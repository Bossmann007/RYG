import { Contrato } from "@models/contrato.model";
import { documentoDaLinha } from "@modules/casos/caso.assembler";
import { AcervoQuery, filtroApontaParaBanco } from "@modules/db/acervo.query";
import { Injectable, NotFoundException } from "@nestjs/common";
import { CreateContratoDto, UpdateContratoDto } from "./contracts.dto";
import { ContratosRepository, FiltroContratos } from "./contracts.repository";

const TIPO_PADRAO = "Contrato";

@Injectable()
export class ContractsService {
  constructor(
    private readonly repositorio: ContratosRepository,
    private readonly acervo: AcervoQuery
  ) {}

  async listar(officeId: string, filtro: FiltroContratos): Promise<Contrato[]> {
    if (!officeId.trim()) {
      return [];
    }

    if (this.acervo.ativo()) {
      const docs = filtroApontaParaBanco(filtro)
        ? await this.acervo.listarDocumentos("contratos", officeId, filtro, "ctr", TIPO_PADRAO)
        : (await this.acervo.listarEscritorio("contratos", officeId)).map((linha, indice) =>
            documentoDaLinha(linha, "ctr", TIPO_PADRAO, indice)
          );
      const casoId = (filtro.casoId || "").trim();
      return docs.map((doc) => ({
        ...doc,
        casoId,
      }));
    }

    return this.repositorio.listar(filtro);
  }

  async obter(_officeId: string, id: string): Promise<Contrato> {
    const contrato = await this.repositorio.buscarPorId(id);

    if (!contrato) {
      throw new NotFoundException("Contrato não encontrado.");
    }

    return contrato;
  }

  criar(_officeId: string, dto: CreateContratoDto): Promise<Contrato> {
    return this.repositorio.criar({
      casoId: dto.casoId.trim(),
      titulo: dto.titulo.trim(),
      tipo: dto.tipo?.trim() || TIPO_PADRAO,
      data: dto.data.trim(),
      origem: dto.origem.trim(),
      resumo: dto.resumo.trim(),
    });
  }

  async atualizar(_officeId: string, id: string, dto: UpdateContratoDto): Promise<Contrato> {
    const atualizado = await this.repositorio.atualizar(id, dto);

    if (!atualizado) {
      throw new NotFoundException("Contrato não encontrado.");
    }

    return atualizado;
  }

  async remover(_officeId: string, id: string): Promise<void> {
    const removido = await this.repositorio.remover(id);

    if (!removido) {
      throw new NotFoundException("Contrato não encontrado.");
    }
  }
}
