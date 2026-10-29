import { identidadeDaRequisicao } from "@common/guards/identity.guard";
import { Body, Controller, Get, HttpCode, Param, Post, Req } from "@nestjs/common";
import { Request } from "express";
import { FinanceiroService } from "./financeiro.service";

@Controller("casos/:casoId/honorarios")
export class FinanceiroController {
  constructor(private readonly financeiro: FinanceiroService) {}

  @Get()
  async listar(@Req() req: Request, @Param("casoId") casoId: string) {
    const identidade = identidadeDaRequisicao(req);
    const lancamentos = await this.financeiro.listar(identidade, String(casoId || ""));
    return { zone: "internal" as const, lancamentos };
  }

  @Post()
  @HttpCode(201)
  async registrar(
    @Req() req: Request,
    @Param("casoId") casoId: string,
    @Body() body: { amountCentavos?: unknown; kind?: unknown },
  ) {
    const identidade = identidadeDaRequisicao(req);
    const lancamento = await this.financeiro.registrar(identidade, String(casoId || ""), body || {});
    return { zone: "internal" as const, lancamento };
  }
}
