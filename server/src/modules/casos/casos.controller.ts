import { identidadeDaRequisicao } from "@common/guards/identity.guard";
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Req } from "@nestjs/common";
import { Request } from "express";
import { CasosService } from "./casos.service";
import { LancamentosService } from "./lancamentos.service";

/**
 * Internal trusted-zone office API. Not an MCP egress surface.
 * Assembles Caso from TiDB joins. Do not mount these routes on the LLM path.
 * Capa reads require case membership after the office filter.
 * sigiloso and segredo_justica also require socio clearance.
 * Missing in this office is 404. Present without membership or clearance is 403.
 */
@Controller("casos")
export class CasosController {
  constructor(
    private casosService: CasosService,
    private lancamentosService: LancamentosService,
  ) {}

  @Get()
  async listar(@Req() req: Request) {
    const identidade = identidadeDaRequisicao(req);
    return {
      zone: "internal" as const,
      casos: await this.casosService.listar(identidade),
    };
  }

  @Post("intake")
  @HttpCode(HttpStatus.CREATED)
  async abrir(
    @Req() req: Request,
    @Body() body: { client?: string; adverse?: string; classification?: string },
  ) {
    const identidade = identidadeDaRequisicao(req);
    const casoId = await this.casosService.abrir(
      identidade,
      String(body?.client ?? ""),
      String(body?.adverse ?? ""),
      body?.classification,
    );
    return { zone: "internal" as const, casoId };
  }

  @Get(":id/hold")
  async hold(@Req() req: Request, @Param("id") id: string) {
    const identidade = identidadeDaRequisicao(req);
    return { zone: "internal" as const, hold: await this.casosService.lerHold(identidade, id) };
  }

  @Patch(":id/hold")
  async atualizarHold(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: { legalHold?: unknown; retainUntil?: unknown },
  ) {
    const identidade = identidadeDaRequisicao(req);
    return {
      zone: "internal" as const,
      hold: await this.casosService.atualizarHold(identidade, id, body?.legalHold, body?.retainUntil),
    };
  }

  @Get(":id/checklist")
  async checklist(@Req() req: Request, @Param("id") id: string) {
    const identidade = identidadeDaRequisicao(req);
    return {
      zone: "internal" as const,
      itens: await this.casosService.checklist(identidade, id),
    };
  }

  @Post(":id/checklist")
  @HttpCode(HttpStatus.OK)
  async marcarChecklist(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: { item?: string; done?: boolean },
  ) {
    const identidade = identidadeDaRequisicao(req);
    return {
      zone: "internal" as const,
      itens: await this.casosService.marcarChecklist(
        identidade,
        id,
        String(body?.item ?? ""),
        body?.done as boolean,
      ),
    };
  }

  @Get(":id/lancamentos")
  async lancamentos(@Req() req: Request, @Param("id") id: string) {
    const identidade = identidadeDaRequisicao(req);
    return { zone: "internal" as const, ...(await this.lancamentosService.listar(identidade, id)) };
  }

  @Post(":id/lancamentos")
  @HttpCode(HttpStatus.CREATED)
  async lancar(@Req() req: Request, @Param("id") id: string, @Body() body: unknown) {
    const identidade = identidadeDaRequisicao(req);
    return {
      zone: "internal" as const,
      lancamento: await this.lancamentosService.criar(identidade, id, body),
    };
  }

  @Patch(":id/lancamentos/:lanId")
  async substituirLancamento(
    @Req() req: Request,
    @Param("id") id: string,
    @Param("lanId") lanId: string,
    @Body() body: unknown,
  ) {
    const identidade = identidadeDaRequisicao(req);
    return {
      zone: "internal" as const,
      lancamento: await this.lancamentosService.substituir(identidade, id, lanId, body),
    };
  }

  @Post(":id/fatura")
  @HttpCode(HttpStatus.CREATED)
  async faturar(@Req() req: Request, @Param("id") id: string) {
    const identidade = identidadeDaRequisicao(req);
    return { zone: "internal" as const, fatura: await this.lancamentosService.faturar(identidade, id) };
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
