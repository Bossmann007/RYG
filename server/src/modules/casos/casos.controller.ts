import { identidadeDaRequisicao } from "@common/guards/identity.guard";
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Req } from "@nestjs/common";
import { Request } from "express";
import { CasosService } from "./casos.service";

/**
 * Internal trusted-zone office API. Not an MCP egress surface.
 * Assembles Caso from TiDB joins. Do not mount these routes on the LLM path.
 * Capa reads require case membership after the office filter.
 * Missing in this office is 404. Present without membership is 403.
 */
@Controller("casos")
export class CasosController {
  constructor(private casosService: CasosService) {}

  @Get()
  async listar(@Req() req: Request) {
    const identidade = identidadeDaRequisicao(req);
    return {
      zone: "internal" as const,
      casos: await this.casosService.listar(identidade.officeId, identidade.id),
    };
  }

  @Post("intake")
  @HttpCode(HttpStatus.CREATED)
  async abrir(@Req() req: Request, @Body() body: { client?: string; adverse?: string }) {
    const identidade = identidadeDaRequisicao(req);
    const casoId = await this.casosService.abrir(
      identidade,
      String(body?.client ?? ""),
      String(body?.adverse ?? ""),
    );
    return { zone: "internal" as const, casoId };
  }

  @Get(":idOrCnj")
  async obter(@Req() req: Request, @Param("idOrCnj") idOrCnj: string) {
    const identidade = identidadeDaRequisicao(req);
    return {
      zone: "internal" as const,
      caso: await this.casosService.obter(identidade, idOrCnj),
    };
  }
}
