import { identidadeDaRequisicao } from "@common/guards/identity.guard";
import { RegistroAuditoria } from "@models/gateway.model";
import { AuditService } from "@modules/gateway/audit.service";
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  Query,
  Req,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Request } from "express";
import { VaultService } from "./vault.service";

const NOME = /^[a-z0-9_.:-]{1,64}$/i;

@Controller("vault")
export class VaultController {
  constructor(
    private readonly vault: VaultService,
    private readonly audit: AuditService,
  ) {}

  @Post("secret")
  @HttpCode(HttpStatus.OK)
  async gravar(@Req() req: Request, @Body() body: { name?: string; value?: string }) {
    const identidade = identidadeDaRequisicao(req);
    const name = nomeDe(body?.name);
    const value = String(body?.value ?? "");
    if (!value || value.length > 4000) {
      throw new BadRequestException("value obrigatório.");
    }
    if (!this.vault.chavePronta()) {
      throw new ServiceUnavailableException("Cofre indisponível.");
    }

    await this.audit.registrar(
      linha(identidade, "vault_put", "permitido", "vault_put", { name, officeId: identidade.officeId }, value),
    );
    this.vault.gravar(identidade.officeId, identidade.id, name, value);
    return { zone: "internal" as const, ok: true, name };
  }

  @Get("secret")
  async ler(@Req() req: Request, @Query("name") nameQuery?: string) {
    const identidade = identidadeDaRequisicao(req);
    const name = nomeDe(nameQuery);
    if (!this.vault.chavePronta()) {
      throw new ServiceUnavailableException("Cofre indisponível.");
    }
    const value = this.vault.ler(identidade.officeId, identidade.id, name);
    if (value === null) {
      throw new NotFoundException("Segredo não encontrado.");
    }
    return { zone: "internal" as const, name, value };
  }
}

@Controller("transfer")
export class TransferController {
  constructor(private readonly audit: AuditService) {}

  @Post("note")
  @HttpCode(HttpStatus.OK)
  async notar(@Req() req: Request, @Body() body: { destination?: string }) {
    const identidade = identidadeDaRequisicao(req);
    const destination = String(body?.destination ?? "").trim();
    if (!destination || destination.length > 120) {
      throw new BadRequestException("destination obrigatório.");
    }
    await this.audit.registrar(
      linha(identidade, "transfer_note", "permitido", "transfer", { destination }, ""),
    );
    return { zone: "internal" as const, ok: true, destination };
  }
}

function nomeDe(valor: unknown): string {
  const name = String(valor ?? "").trim();
  if (!NOME.test(name)) {
    throw new BadRequestException("name inválido.");
  }
  return name;
}

function linha(
  identidade: ReturnType<typeof identidadeDaRequisicao>,
  ferramenta: string,
  decisao: RegistroAuditoria["decisao"],
  motivo: string,
  argumentos: Record<string, unknown>,
  segredo: string,
): RegistroAuditoria {
  return {
    at: new Date().toISOString(),
    identidade: identidade.id,
    nome: identidade.nome,
    papel: identidade.papel,
    origem: "hub",
    ferramenta,
    argumentos: redact(argumentos, segredo),
    decisao,
    motivo,
    omitido: [],
    duracaoMs: 0,
  };
}

function redact(argumentos: Record<string, unknown>, segredo: string): Record<string, unknown> {
  const limpo: Record<string, unknown> = {};
  for (const [chave, valor] of Object.entries(argumentos)) {
    if (chave === "value" || chave === "secret" || chave === "token") {
      continue;
    }
    if (typeof valor === "string" && segredo && valor.includes(segredo)) {
      continue;
    }
    limpo[chave] = valor;
  }
  return limpo;
}
