import { Public } from "@common/decorators/public.decorator";
import { identidadeDaRequisicao } from "@common/guards/identity.guard";
import { AuditService } from "@modules/gateway/audit.service";
import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { Request } from "express";
import { WhatsappService } from "./whatsapp.service";

type EnviarDto = {
  para?: string;
  texto?: string;
  processoId?: string;
  confirmacao?: string;
};

@Controller("whatsapp")
export class WhatsappController {
  constructor(
    private whatsappService: WhatsappService,
    private audit: AuditService,
  ) {}

  @Public()
  @Get("status")
  status() {
    return {
      zone: "internal" as const,
      tool: "enviar_whatsapp",
      ...this.whatsappService.status(),
    };
  }

  @Public()
  @Post("oauth/start")
  @HttpCode(200)
  oauthStart() {
    return {
      zone: "internal" as const,
      ...this.whatsappService.iniciarOauth(),
    };
  }

  @Public()
  @Get("oauth/callback")
  oauthCallback(@Query("code") code?: string) {
    return {
      zone: "internal" as const,
      ...this.whatsappService.concluirOauth(code),
    };
  }

  @Public()
  @Post("conectar-stub")
  @HttpCode(200)
  conectarStub() {
    return {
      zone: "internal" as const,
      ...this.whatsappService.conectarStub(),
    };
  }

  @Public()
  @Post("desconectar")
  @HttpCode(200)
  desconectar() {
    return {
      zone: "internal" as const,
      ...this.whatsappService.desconectar(),
    };
  }

  /** Office send tool — not an inbox. Human confirm is required before the stub. */
  @Post("enviar")
  @HttpCode(200)
  async enviar(@Req() req: Request, @Body() body: EnviarDto) {
    const identidade = identidadeDaRequisicao(req);
    const para = (body.para || "").trim();
    const texto = (body.texto || "").trim();
    const processoId = (body.processoId || "").trim();
    if (!para || !texto) {
      throw new BadRequestException("para e texto são obrigatórios.");
    }
    const pedido = { para, texto, processoId: processoId || undefined };
    const confirmacao = (body.confirmacao || "").trim();
    if (!confirmacao) {
      await this.registar(identidade, pedido, "negado", "confirmacao ausente");
      const aberto = this.whatsappService.abrirDesafio(identidade.officeId, pedido);
      throw new ConflictException({
        message: "Confirmacao humana necessaria antes do envio.",
        confirmacaoNecessaria: true,
        desafio: aberto.desafio,
        expiraEm: aberto.expiraEm,
      });
    }
    const valido = this.whatsappService.consumirDesafio(confirmacao, identidade.officeId, pedido);
    if (!valido) {
      await this.registar(identidade, pedido, "negado", "confirmacao invalida");
      throw new ConflictException("Confirmacao invalida ou expirada.");
    }
    await this.registar(identidade, pedido, "permitido", "confirmacao humana");
    const resultado = this.whatsappService.enviar(pedido);
    return {
      zone: "internal" as const,
      tool: "enviar_whatsapp",
      ...resultado,
    };
  }

  private registar(
    identidade: ReturnType<typeof identidadeDaRequisicao>,
    pedido: { para: string; processoId?: string; texto: string },
    decisao: "permitido" | "negado",
    motivo: string,
  ) {
    return this.audit.registrar({
      at: new Date().toISOString(),
      identidade: identidade.id,
      nome: identidade.nome,
      papel: identidade.papel,
      origem: "whatsapp",
      ferramenta: "enviar_whatsapp",
      argumentos: {
        para: pedido.para,
        processoId: pedido.processoId || "",
        textoChars: pedido.texto.length,
      },
      decisao,
      motivo,
      omitido: [],
      duracaoMs: 0,
    });
  }
}
