import { Public } from "@common/decorators/public.decorator";
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import { acessoChatLocalPermitido } from "./chat-access";
import { CriarMensagemChatDto, ListarChatQueryDto } from "./chat.dto";
import { ChatService } from "./chat.service";

@Controller("processos/:processoId/chat")
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Public()
  @Get()
  async listar(
    @Req() req: Request,
    @Param("processoId") processoId: string,
    @Query() query: ListarChatQueryDto
  ) {
    this.exigirAcessoLocal(req);
    return {
      zone: "internal" as const,
      ...(await this.chat.listar(processoId, query.limite, query.cursor)),
    };
  }

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  async criar(
    @Req() req: Request,
    @Param("processoId") processoId: string,
    @Body() dto: CriarMensagemChatDto
  ) {
    this.exigirAcessoLocal(req);
    return {
      zone: "internal" as const,
      ...(await this.chat.criar(processoId, dto)),
    };
  }

  private exigirAcessoLocal(req: Request): void {
    if (
      !acessoChatLocalPermitido(req, {
        enabled: process.env.CHAT_DEMO_ENABLED,
        nodeEnv: process.env.NODE_ENV,
      })
    ) {
      throw new ForbiddenException("Chat local indisponível para esta requisição.");
    }
  }
}
