import { Caso } from "@models/caso.model";
import { Injectable, NotFoundException } from "@nestjs/common";
import { CasosRepository } from "./casos.repository";

@Injectable()
export class CasosService {
  constructor(private readonly repositorio: CasosRepository) {}

  listar(officeId: string): Promise<Caso[]> {
    return this.repositorio.listar(officeId);
  }

  async obter(officeId: string, idOrCnj: string): Promise<Caso> {
    const achado = await this.repositorio.obter(officeId, idOrCnj);

    if (!achado) {
      throw new NotFoundException("Caso não encontrado.");
    }

    return achado;
  }
}
