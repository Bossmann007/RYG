import { Caso } from "@models/caso.model";
import { Injectable, NotFoundException } from "@nestjs/common";
import { mesmoCaso } from "./caso.assembler";
import { CasosRepository } from "./casos.repository";

@Injectable()
export class CasosService {
  constructor(private readonly repositorio: CasosRepository) {}

  listar(): Promise<Caso[]> {
    return this.repositorio.listar();
  }

  async obter(idOrCnj: string): Promise<Caso> {
    const casos = await this.repositorio.listar();
    const achado = casos.find((caso) => mesmoCaso(caso, idOrCnj));

    if (!achado) {
      throw new NotFoundException("Caso não encontrado.");
    }

    return achado;
  }
}
