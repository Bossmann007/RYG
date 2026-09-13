import { Public } from "@common/decorators/public.decorator";
import { Controller, Get, Param } from "@nestjs/common";
import { CasosService } from "./casos.service";

/**
 * Internal trusted-zone office API. Not an MCP egress surface.
 * Assembles Caso from TiDB joins. Do not mount these routes on the LLM path.
 */
@Controller("casos")
export class CasosController {
  constructor(private casosService: CasosService) {}

  @Public()
  @Get()
  async listar() {
    return {
      zone: "internal" as const,
      casos: await this.casosService.listar(),
    };
  }

  @Public()
  @Get(":idOrCnj")
  async obter(@Param("idOrCnj") idOrCnj: string) {
    return {
      zone: "internal" as const,
      caso: await this.casosService.obter(idOrCnj),
    };
  }
}
