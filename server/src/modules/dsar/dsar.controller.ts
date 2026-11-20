import { identidadeDaRequisicao } from "@common/guards/identity.guard";
import { AuditService } from "@modules/gateway/audit.service";
import { BadRequestException, Body, Controller, HttpCode, HttpStatus, Post, Req } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { Request } from "express";

const PEDIDO_MAX = 5000;

/**
 * Process stub. Issues an opaque protocol and forwards nothing.
 * The request text is read only to check it is not empty, then dropped:
 * not stored, not audited, not logged, not echoed. There is no list route.
 */
@Controller("dsar")
export class DsarController {
  constructor(private readonly audit: AuditService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async receber(@Req() req: Request, @Body() body: { pedido?: unknown }) {
    const identidade = identidadeDaRequisicao(req);
    const pedido = body?.pedido;
    if (typeof pedido !== "string" || !pedido.trim() || pedido.length > PEDIDO_MAX) {
      throw new BadRequestException(`pedido é obrigatório (até ${PEDIDO_MAX} caracteres).`);
    }

    const protocol = `dsar_${randomBytes(8).toString("hex")}`;
    // The trail records that a protocol was issued, never what was asked.
    await this.audit.registrar({
      at: new Date().toISOString(),
      identidade: identidade.id,
      nome: identidade.nome,
      papel: identidade.papel,
      origem: "hub",
      ferramenta: "dsar_recebido",
      argumentos: { protocol },
      decisao: "permitido",
      motivo: "protocolo emitido",
      omitido: [],
      duracaoMs: 0,
    });
    return { zone: "internal" as const, protocol };
  }
}
