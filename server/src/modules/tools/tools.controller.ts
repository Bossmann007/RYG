import { identidadeDaRequisicao } from "@common/guards/identity.guard";
import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import { CalendarioPrazo, calcularPrazoCpc } from "./prazo-cpc";

@Controller("tools")
export class ToolsController {
  @Post("prazo-cpc")
  @HttpCode(HttpStatus.OK)
  prazoCpc(@Req() req: Request, @Body() body: unknown) {
    identidadeDaRequisicao(req);
    const entrada = analisar(body);
    try {
      return {
        zone: "internal" as const,
        tool: "prazo_cpc" as const,
        ...calcularPrazoCpc(entrada),
      };
    } catch (erro) {
      throw new BadRequestException(
        erro instanceof Error ? erro.message : "entrada de prazo inválida.",
      );
    }
  }
}

function analisar(body: unknown): {
  startedAt: string;
  days: number;
  calendar: CalendarioPrazo;
} {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new BadRequestException("corpo inválido.");
  }
  const bruto = body as {
    startedAt?: unknown;
    days?: unknown;
    calendar?: unknown;
  };
  if (typeof bruto.startedAt !== "string") {
    throw new BadRequestException("startedAt é obrigatório (YYYY-MM-DD).");
  }
  const days = Number(bruto.days);
  if (!Number.isSafeInteger(days)) {
    throw new BadRequestException("days deve ser inteiro.");
  }
  if (bruto.calendar !== "uteis" && bruto.calendar !== "corridos") {
    throw new BadRequestException('calendar deve ser "uteis" ou "corridos".');
  }
  return {
    startedAt: bruto.startedAt,
    days,
    calendar: bruto.calendar,
  };
}
