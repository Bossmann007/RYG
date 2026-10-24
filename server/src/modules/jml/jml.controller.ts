import { identidadeDaRequisicao } from "@common/guards/identity.guard";
import { AuditService } from "@modules/gateway/audit.service";
import { HubSessionService } from "@modules/gateway/hub-session.service";
import {
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  HttpCode,
  NotFoundException,
  Post,
  Req,
} from "@nestjs/common";
import { Request } from "express";

type DisableDto = {
  userId?: string;
  confirmacao?: string;
};

@Controller("jml")
export class JmlController {
  constructor(
    private sessions: HubSessionService,
    private audit: AuditService,
  ) {}

  @Post("disable")
  @HttpCode(200)
  async disable(@Req() req: Request, @Body() body: DisableDto) {
    const identidade = identidadeDaRequisicao(req);
    if (identidade.papel !== "socio") {
      await this.auditar(identidade, "negado", "papel sem jml", {
        userId: body.userId || "",
      });
      throw new ForbiddenException("Sócio obrigatório para JML disable.");
    }

    const targetUserId = (body.userId || "").trim();
    if (!targetUserId) {
      throw new NotFoundException("userId obrigatório.");
    }

    const confirmacao = (body.confirmacao || "").trim();
    if (!confirmacao) {
      await this.auditar(identidade, "negado", "mfa ausente", { userId: targetUserId });
      const aberto = this.sessions.abrirDesafioJml(
        identidade.officeId,
        identidade.id,
        targetUserId,
      );
      throw new ConflictException({
        message: "Fator MFA one-shot necessário antes do disable.",
        confirmacaoNecessaria: true,
        desafio: aberto.desafio,
        expiraEm: aberto.expiraEm,
      });
    }

    const valido = this.sessions.consumirDesafioJml(
      confirmacao,
      identidade.officeId,
      identidade.id,
      targetUserId,
    );
    if (!valido) {
      await this.auditar(identidade, "negado", "mfa invalida", { userId: targetUserId });
      throw new ConflictException("Fator MFA inválido ou expirado.");
    }

    await this.auditar(identidade, "permitido", "jml disable", { userId: targetUserId });
    this.sessions.desabilitar(targetUserId);
    return { zone: "internal" as const, ok: true, userId: targetUserId };
  }

  private auditar(
    identidade: ReturnType<typeof identidadeDaRequisicao>,
    decisao: "permitido" | "negado",
    motivo: string,
    argumentos: Record<string, unknown>,
  ) {
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
