import { identidadeDaRequisicao } from "@common/guards/identity.guard";
import { BadRequestException, Body, Controller, Get, HttpCode, Post, Query, Req } from "@nestjs/common";
import { Request } from "express";
import { SecretValue, VaultName } from "./vault.crypto";
import { VaultService } from "./vault.service";

@Controller("vault")
export class VaultController {
  constructor(private readonly vault: VaultService) {}

  @Post("secret")
  @HttpCode(200)
  async guardar(@Req() req: Request, @Body() body: unknown) {
    const identidade = identidadeDaRequisicao(req);
    const pedido = analisarSegredo(body);
    await this.vault.guardar(identidade, pedido.name, pedido.value);
    return { stored: true, name: pedido.name };
  }

  @Get("secret")
  async ler(@Req() req: Request, @Query("name") name?: string | string[]) {
    const identidade = identidadeDaRequisicao(req);
    const pedido = analisarNome(name);
    const value = await this.vault.ler(identidade, pedido);
    return { name: pedido, value };
  }
}

function analisarSegredo(body: unknown): { name: VaultName; value: SecretValue } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new BadRequestException("name e value são obrigatórios.");
  }
  const bruto = body as { name?: unknown; value?: unknown };
  return {
    name: analisarNome(bruto.name),
    value: analisarValor(bruto.value),
  };
}

function analisarNome(raw: unknown): VaultName {
  const nome = Array.isArray(raw) ? raw[0] : raw;
  if (typeof nome !== "string" || nome.trim() === "") {
    throw new BadRequestException("name é obrigatório.");
  }
  return nome.trim() as VaultName;
}

function analisarValor(raw: unknown): SecretValue {
  if (typeof raw !== "string" || raw.length === 0) {
    throw new BadRequestException("value é obrigatório.");
  }
  return raw as SecretValue;
}
