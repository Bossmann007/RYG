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
import { PrazoKindPersist, PrazosService } from "./prazos.service";

const KINDS: PrazoKindPersist[] = [
  "manifestacao",
  "recurso",
  "prova",
  "audiencia",
  "interno",
  "outro",
];

@Controller("tools")
export class ToolsController {
  constructor(private readonly prazos: PrazosService) {}

  @Post("prazo-cpc")
  @HttpCode(HttpStatus.OK)
  async prazoCpc(@Req() req: Request, @Body() body: unknown) {
    const identidade = identidadeDaRequisicao(req);
    const entrada = analisar(body);
    let calculo;
    try {
      calculo = calcularPrazoCpc({
        startedAt: entrada.startedAt,
        days: entrada.days,
        calendar: entrada.calendar,
      });
    } catch (erro) {
      throw new BadRequestException(
        erro instanceof Error ? erro.message : "entrada de prazo inválida.",
      );
    }

    if (!entrada.casoId) {
      return {
        zone: "internal" as const,
        tool: "prazo_cpc" as const,
        persistido: false as const,
        ...calculo,
      };
    }

    const anexado = await this.prazos.anexarAoCaso(identidade, entrada.casoId, calculo, {
      title: entrada.title || "Prazo CPC",
      kind: entrada.kind,
      notes: entrada.notes,
    });

    return {
      zone: "internal" as const,
      tool: "prazo_cpc" as const,
      persistido: true as const,
      casoId: entrada.casoId,
      prazoId: String(anexado.prazoId),
      processoId: anexado.processoId,
      ...calculo,
    };
  }
}

function analisar(body: unknown): {
  startedAt: string;
  days: number;
  calendar: CalendarioPrazo;
  casoId?: string;
  title?: string;
  kind: PrazoKindPersist;
  notes?: string;
} {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new BadRequestException("corpo inválido.");
  }
  const bruto = body as {
    startedAt?: unknown;
    days?: unknown;
    calendar?: unknown;
    casoId?: unknown;
    title?: unknown;
    kind?: unknown;
    notes?: unknown;
  };
  if (typeof bruto.startedAt !== "string") {
    throw new BadRequestException("startedAt é obrigatório (YYYY-MM-DD).");
  }
  if (typeof bruto.days !== "number" || !Number.isSafeInteger(bruto.days)) {
    throw new BadRequestException("days deve ser inteiro.");
  }
  if (bruto.calendar !== "uteis" && bruto.calendar !== "corridos") {
    throw new BadRequestException('calendar deve ser "uteis" ou "corridos".');
  }

  let casoId: string | undefined;
  if (bruto.casoId !== undefined && bruto.casoId !== null && bruto.casoId !== "") {
    if (typeof bruto.casoId !== "string" && typeof bruto.casoId !== "number") {
      throw new BadRequestException("casoId inválido.");
    }
    casoId = String(bruto.casoId).trim();
    if (!casoId) {
      throw new BadRequestException("casoId inválido.");
    }
  }

  let title: string | undefined;
  if (bruto.title !== undefined && bruto.title !== null && bruto.title !== "") {
    if (typeof bruto.title !== "string" || !bruto.title.trim()) {
      throw new BadRequestException("title inválido.");
    }
    title = bruto.title.trim().slice(0, 255);
  }

  let kind: PrazoKindPersist = "manifestacao";
  if (bruto.kind !== undefined && bruto.kind !== null && bruto.kind !== "") {
    if (typeof bruto.kind !== "string" || !KINDS.includes(bruto.kind as PrazoKindPersist)) {
      throw new BadRequestException("kind inválido.");
    }
    kind = bruto.kind as PrazoKindPersist;
  }

  let notes: string | undefined;
  if (bruto.notes !== undefined && bruto.notes !== null && bruto.notes !== "") {
    if (typeof bruto.notes !== "string") {
      throw new BadRequestException("notes inválido.");
    }
    notes = bruto.notes.trim().slice(0, 4000);
  }

  return {
    startedAt: bruto.startedAt,
    days: bruto.days,
    calendar: bruto.calendar,
    casoId,
    title,
    kind,
    notes,
  };
}
