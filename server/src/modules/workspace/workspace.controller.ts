import { identidadeDaRequisicao } from "@common/guards/identity.guard";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import {
  AbrirDmDto,
  CriarMensagemWorkspaceDto,
  ListarWorkspaceQueryDto,
} from "./workspace.dto";
import { WorkspaceService } from "./workspace.service";

@Controller("workspace")
export class WorkspaceController {
  constructor(private readonly workspace: WorkspaceService) {}

  @Get("dms")
  async listarDms(@Req() req: Request) {
    const identidade = identidadeDaRequisicao(req);
    return {
      zone: "internal" as const,
      ...(await this.workspace.listarDms(identidade)),
    };
  }

  @Post("dms")
  @HttpCode(HttpStatus.OK)
  async abrirDm(@Req() req: Request, @Body() dto: AbrirDmDto) {
    const identidade = identidadeDaRequisicao(req);
    return {
      zone: "internal" as const,
      ...(await this.workspace.abrirOuObterDm(identidade, dto.peerUserId)),
    };
  }

  @Get("dms/:channelId/messages")
  async listarMensagens(
    @Req() req: Request,
    @Param("channelId") channelId: string,
    @Query() query: ListarWorkspaceQueryDto,
  ) {
    const identidade = identidadeDaRequisicao(req);
    return {
      zone: "internal" as const,
      ...(await this.workspace.listarMensagens(
        identidade,
        channelId,
        query.limite,
        query.cursor,
      )),
    };
  }

  @Post("dms/:channelId/messages")
  @HttpCode(HttpStatus.OK)
  async criarMensagem(
    @Req() req: Request,
    @Param("channelId") channelId: string,
    @Body() dto: CriarMensagemWorkspaceDto,
  ) {
    const identidade = identidadeDaRequisicao(req);
    return {
      zone: "internal" as const,
      ...(await this.workspace.criarMensagem(identidade, channelId, dto)),
    };
  }
}
