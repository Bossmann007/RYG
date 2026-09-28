import { identidadeDaRequisicao } from "@common/guards/identity.guard";
import { Controller, Get, Param, Req } from "@nestjs/common";
import { Request } from "express";
import { CasosService } from "./casos.service";

/**
 * Internal trusted-zone office API. Not an MCP egress surface.
 * Assembles Caso from TiDB joins. Do not mount these routes on the LLM path.
 * casos and processos are filtered by office_id; child tables are reached
 * only through an office-scoped capa.
 */
@Controller("casos")
export class CasosController {
  constructor(private casosService: CasosService) {}

  @Get()
  async listar(@Req() req: Request) {
    const { officeId } = identidadeDaRequisicao(req);
    return {
      zone: "internal" as const,
      casos: await this.casosService.listar(officeId),
    };
  }

  @Get(":idOrCnj")
  async obter(@Req() req: Request, @Param("idOrCnj") idOrCnj: string) {
    const { officeId } = identidadeDaRequisicao(req);
    return {
      zone: "internal" as const,
      caso: await this.casosService.obter(officeId, idOrCnj),
    };
  }
}
