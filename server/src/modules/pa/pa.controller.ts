import { identidadeDaRequisicao } from "@common/guards/identity.guard";
import { Body, Controller, Get, HttpCode, Post, Req } from "@nestjs/common";
import { Request } from "express";
import { PaService } from "./pa.service";

@Controller("pa")
export class PaController {
  constructor(private readonly pa: PaService) {}

  @Get("status")
  status(@Req() req: Request) {
    const identidade = identidadeDaRequisicao(req);
    return { zone: "internal" as const, ...this.pa.status(identidade) };
  }

  @Post("session/start")
  @HttpCode(200)
  async start(
    @Req() req: Request,
    @Body() body: { runtime?: "office-hosted" | "linked-provider" },
  ) {
    const identidade = identidadeDaRequisicao(req);
    const sessao = await this.pa.abrirSessao(identidade, body?.runtime);
    return { zone: "internal" as const, sessao };
  }

  @Post("session/stop")
  @HttpCode(200)
  async stop(@Req() req: Request) {
    const identidade = identidadeDaRequisicao(req);
    await this.pa.fecharSessao(identidade);
    return { zone: "internal" as const, ok: true };
  }

  @Post("tools/case_read")
  @HttpCode(200)
  async caseRead(@Req() req: Request, @Body() body: { casoId?: string }) {
    const identidade = identidadeDaRequisicao(req);
    const result = await this.pa.caseRead(identidade, String(body?.casoId || ""));
    return { zone: "internal" as const, ...result };
  }

  @Post("tools/checklist")
  @HttpCode(200)
  async checklist(@Req() req: Request) {
    const identidade = identidadeDaRequisicao(req);
    return { zone: "internal" as const, ...(await this.pa.checklist(identidade)) };
  }

  @Post("tools/whatsapp_propose")
  @HttpCode(200)
  async zapPropose(@Req() req: Request, @Body() body: Record<string, unknown>) {
    const identidade = identidadeDaRequisicao(req);
    const result = await this.pa.whatsappPropose(identidade, {
      para: String(body.para || ""),
      texto: String(body.texto || ""),
      classificationAck: Boolean(body.classificationAck),
      classification: body.classification ? String(body.classification) : undefined,
      templateId: body.templateId ? String(body.templateId) : undefined,
      safeDtoReleaseId: body.safeDtoReleaseId
        ? String(body.safeDtoReleaseId)
        : undefined,
      processoId: body.processoId ? String(body.processoId) : undefined,
    });
    return { zone: "internal" as const, ...result };
  }

  @Post("tools/export_pack")
  @HttpCode(200)
  async exportPack(@Req() req: Request, @Body() body: { casoId?: string }) {
    const identidade = identidadeDaRequisicao(req);
    const result = await this.pa.exportPack(
      identidade,
      body?.casoId ? String(body.casoId) : undefined,
    );
    return { zone: "internal" as const, ...result };
  }

  @Get("hitl/whatsapp_challenge")
  hitlChallenge(@Req() req: Request) {
    const identidade = identidadeDaRequisicao(req);
    return { zone: "internal" as const, ...this.pa.hitlWhatsappChallenge(identidade) };
  }

  @Post("hitl/whatsapp_confirm")
  @HttpCode(200)
  async hitlConfirm(@Req() req: Request, @Body() body: { desafio?: string }) {
    const identidade = identidadeDaRequisicao(req);
    const result = await this.pa.hitlWhatsappConfirm(identidade, {
      desafio: body?.desafio ? String(body.desafio) : undefined,
    });
    return { zone: "internal" as const, ...result };
  }
}
