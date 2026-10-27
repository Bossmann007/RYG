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
import { CriarMensagemChatDto, ListarChatQueryDto } from "./chat.dto";
import { ChatService } from "./chat.service";

/**
 * Per-case chat. Requires IdentityGuard (no @Public).
 * CHAT_DEMO_ENABLED no longer authorizes unauthenticated access — use Bearer demos.
 */
@Controller("processos/:processoId/chat")
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get()
  async listar(
    @Req() req: Request,
    @Param("processoId") processoId: string,
    @Query() query: ListarChatQueryDto,
  ) {
    const identidade = identidadeDaRequisicao(req);
    return {
      zone: "internal" as const,
      ...(await this.chat.listar(identidade, processoId, query.limite, query.cursor)),
    };
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async criar(
    @Req() req: Request,
    @Param("processoId") processoId: string,
    @Body() dto: CriarMensagemChatDto,
  ) {
    const identidade = identidadeDaRequisicao(req);
    return {
      zone: "internal" as const,
      ...(await this.chat.criar(identidade, processoId, dto)),
    };
  }
}
