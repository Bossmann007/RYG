import { identidadeDaRequisicao } from "@common/guards/identity.guard";
import { Body, Controller, Get, Param, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { AbrirDmDto, EnviarMensagemDmDto } from "./workspace.dto";
import { WorkspaceService } from "./workspace.service";

@Controller("workspace")
export class WorkspaceController {
  constructor(private readonly workspace: WorkspaceService) {}

  @Post("dms")
  async abrirDm(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: AbrirDmDto,
  ) {
    const { officeId, id } = identidadeDaRequisicao(req);
    const resultado = await this.workspace.abrirDm(officeId, id, dto.peerUserId);
    res.status(resultado.criado ? 201 : 200);
    return { threadId: resultado.threadId };
  }

  @Get("dms")
  async listarDms(@Req() req: Request) {
    const { officeId, id } = identidadeDaRequisicao(req);
    return {
      zone: "internal" as const,
      threads: await this.workspace.listarDms(officeId, id),
    };
  }

  @Get("dms/:id")
  async listarMensagens(@Req() req: Request, @Param("id") threadId: string) {
    const { officeId, id } = identidadeDaRequisicao(req);
    return {
      zone: "internal" as const,
      messages: await this.workspace.listarMensagens(officeId, id, threadId),
    };
  }

  @Post("dms/:id/messages")
  async enviarMensagem(
    @Req() req: Request,
    @Param("id") threadId: string,
    @Body() dto: EnviarMensagemDmDto,
  ) {
    const { officeId, id } = identidadeDaRequisicao(req);
    const resultado = await this.workspace.enviarMensagem(officeId, id, threadId, dto.body);
    return {
      zone: "internal" as const,
      messageId: resultado.messageId,
      mentions: resultado.mentions,
    };
  }
}
