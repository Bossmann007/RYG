import { identidadeDaRequisicao } from "@common/guards/identity.guard";
import { Controller, Get, Param, Req } from "@nestjs/common";
import { Request } from "express";
import { XirpService } from "./xirp.service";

/** Internal trusted-zone panel feed. Metadata only, gated like the capa. */
@Controller("casos/:id/xirp")
export class XirpController {
  constructor(private readonly xirp: XirpService) {}

  @Get()
  async listar(@Req() req: Request, @Param("id") id: string) {
    const identidade = identidadeDaRequisicao(req);
    return { zone: "internal" as const, runs: await this.xirp.listarDoCaso(identidade, id) };
  }
}
