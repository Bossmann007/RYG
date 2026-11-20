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
  revisao?: unknown;
  templateId?: unknown;
};

export const TEMPLATE_AVISO_PRAZO_ID = "tpl-aviso-prazo";
/** Fixed notice: no placeholders, no phone, no email, no CPF. */
const TEMPLATE_AVISO_PRAZO_TEXTO =
  "Aviso do escritório: há um prazo processual em andamento no seu caso. Entre em contato com o escritório para mais informações.";

const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const CPF = /(?<!\d)\d{3}\.?\d{3}\.?\d{3}-?\d{2}(?!\d)/;
/** A run of digits with common separators; 10–13 digits in total counts as a phone. */
const SEQUENCIA_NUMERICA = /\+?\d(?:[\d\s().-]*\d)?/g;

export function contemPii(texto: string): boolean {
  if (EMAIL.test(texto) || CPF.test(texto)) return true;
  for (const trecho of texto.match(SEQUENCIA_NUMERICA) ?? []) {
    const digitos = trecho.replace(/\D/g, "").length;
    if (digitos >= 10 && digitos <= 13) return true;
  }
  return false;
}

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
    const processoId = (body.processoId || "").trim();
    const usaTemplate = body.templateId !== undefined && body.templateId !== null;
    if (usaTemplate && body.templateId !== TEMPLATE_AVISO_PRAZO_ID) {
      await this.registar(
        identidade,
        { texto: "", processoId: processoId || undefined },
        "negado",
        "template desconhecido",
      );
      throw new BadRequestException("templateId desconhecido.");
    }
    const texto = usaTemplate
      ? TEMPLATE_AVISO_PRAZO_TEXTO
      : (typeof body.texto === "string" ? body.texto : "").trim();
    if (!para || !texto) {
      throw new BadRequestException("para e texto são obrigatórios.");
    }
    const pedido = { para, texto, processoId: processoId || undefined };
    if (body.revisao !== true) {
      await this.registar(identidade, pedido, "negado", "revisao ausente");
      throw new BadRequestException("Confirme a revisão da classificação e do texto antes de enviar.");
    }
    if (contemPii(texto)) {
      await this.registar(identidade, pedido, "negado", "pii bloqueado");
      throw new BadRequestException(
        "O texto parece conter e-mail, CPF ou telefone. Remova o dado pessoal ou use o modelo aprovado.",
      );
    }
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
    await this.registar(identidade, pedido, "permitido", "transfer", "whatsapp");
    const resultado = this.whatsappService.enviar(pedido);
    return {
      zone: "internal" as const,
      tool: "enviar_whatsapp",
      ...resultado,
    };
  }

  private registar(
    identidade: ReturnType<typeof identidadeDaRequisicao>,
    pedido: { processoId?: string; texto: string },
    decisao: "permitido" | "negado",
    motivo: string,
    destino?: string,
  ) {
    // Never the phone (para) nor the message text.
    const base = { processoId: pedido.processoId || "", textoChars: pedido.texto.length };
    const argumentos = destino ? { destination: destino, ...base } : base;
    return this.audit.registrar({
      at: new Date().toISOString(),
      identidade: identidade.id,
      nome: identidade.nome,
      papel: identidade.papel,
      origem: "whatsapp",
      ferramenta: "enviar_whatsapp",
      argumentos,
      decisao,
      motivo,
      omitido: [],
      duracaoMs: 0,
    });
  }
}
