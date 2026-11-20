import { identidadeDaRequisicao } from "@common/guards/identity.guard";
import { RegistroAuditoria } from "@models/gateway.model";
import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from "@nestjs/common";
import { Request } from "express";
import { AuditService } from "./audit.service";
import { HubSessionService } from "./hub-session.service";

/**
 * Minimal leaver. Socio must present a one-shot factor before a user is disabled.
 */
@Controller("jml")
export class JmlController {
  constructor(
    private readonly sessoes: HubSessionService,
    private readonly audit: AuditService,
  ) {}

  @Post("disable")
  @HttpCode(HttpStatus.OK)
  async desabilitar(
    @Req() req: Request,
    @Body() body: { userId?: string; confirmacao?: string },
  ) {
    const identidade = identidadeDaRequisicao(req);
    const userId = String(body?.userId ?? "").trim();
    if (!userId) {
      throw new BadRequestException("userId obrigatório.");
    }
    if (!this.sessoes.exigeMfa(identidade.papel)) {
      await this.auditar(identidade, "negado", "papel sem JML", { userId });
      throw new ForbiddenException("JML de desligamento é do sócio.");
    }

    const confirmacao = String(body?.confirmacao ?? "").trim();
    if (!confirmacao) {
      await this.auditar(identidade, "negado", "mfa ausente", { userId });
      const aberto = this.sessoes.abrirMfa(identidade.id);
      throw new ConflictException({
        message: "Segundo fator necessário.",
        confirmacaoNecessaria: true,
        desafio: aberto.desafio,
        expiraEm: aberto.expiraEm,
      });
    }

    if (!this.sessoes.consumirMfa(identidade.id, confirmacao)) {
      await this.auditar(identidade, "negado", "mfa replay", { userId });
      throw new ConflictException("Fator inválido ou já usado.");
    }

    this.sessoes.desabilitar(userId);
    return { zone: "internal" as const, ok: true, userId };
  }

  private auditar(
    identidade: ReturnType<typeof identidadeDaRequisicao>,
    decisao: RegistroAuditoria["decisao"],
    motivo: string,
    argumentos: Record<string, unknown>,
  ): Promise<void> {
    return this.audit.registrar({
      at: new Date().toISOString(),
      identidade: identidade.id,
      nome: identidade.nome,
      papel: identidade.papel,
      origem: "hub",
      ferramenta: "jml_disable",
      argumentos,
      decisao,
      motivo,
      omitido: [],
      duracaoMs: 0,
    });
  }
}
