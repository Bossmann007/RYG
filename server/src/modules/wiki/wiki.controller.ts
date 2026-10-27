import { identidadeDaRequisicao } from "@common/guards/identity.guard";
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import { WikiService } from "./wiki.service";

@Controller("wiki")
export class WikiController {
  constructor(private readonly wiki: WikiService) {}

  @Get("notes")
  async listarNotas(@Req() req: Request) {
    const identidade = identidadeDaRequisicao(req);
    return { zone: "internal" as const, ...(await this.wiki.listarNotas(identidade)) };
  }

  @Post("notes")
  @HttpCode(HttpStatus.OK)
  async criarNota(@Req() req: Request, @Body() body: unknown) {
    const identidade = identidadeDaRequisicao(req);
    const entrada = analisarNota(body);
    return {
      zone: "internal" as const,
      ...(await this.wiki.criarNota(identidade, entrada)),
    };
  }

  @Get("notes/:id")
  async obterNota(@Req() req: Request, @Param("id") id: string) {
    const identidade = identidadeDaRequisicao(req);
    return {
      zone: "internal" as const,
      ...(await this.wiki.obterNota(identidade, id)),
    };
  }

  @Patch("notes/:id")
  async atualizarNota(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const identidade = identidadeDaRequisicao(req);
    const entrada = analisarNotaParcial(body);
    return {
      zone: "internal" as const,
      ...(await this.wiki.atualizarNota(identidade, id, entrada)),
    };
  }

  @Post("notes/:id/publish")
  @HttpCode(HttpStatus.OK)
  async publicar(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const identidade = identidadeDaRequisicao(req);
    const confirm = analisarConfirm(body);
    return {
      zone: "internal" as const,
      ...(await this.wiki.publicarNota(identidade, id, confirm)),
    };
  }

  @Get("hardvault/search")
  async buscar(
    @Req() req: Request,
    @Query("q") q?: string | string[],
  ) {
    const identidade = identidadeDaRequisicao(req);
    const termo = Array.isArray(q) ? q[0] : q;
    return {
      zone: "internal" as const,
      ...(await this.wiki.buscarHardvault(identidade, String(termo || ""))),
    };
  }

  @Get("hardvault/:id")
  async obterDoc(
    @Req() req: Request,
    @Param("id") id: string,
    @Query("full") full?: string | string[],
  ) {
    const identidade = identidadeDaRequisicao(req);
    const bruto = Array.isArray(full) ? full[0] : full;
    return {
      zone: "internal" as const,
      ...(await this.wiki.obterHardvault(identidade, id, bruto === "1" || bruto === "true")),
    };
  }

  @Get("pack")
  async pack(
    @Req() req: Request,
    @Query("casoId") casoId?: string | string[],
  ) {
    const identidade = identidadeDaRequisicao(req);
    const caso = Array.isArray(casoId) ? casoId[0] : casoId;
    return {
      zone: "internal" as const,
      ...(await this.wiki.loadPack(identidade, caso)),
    };
  }
}

function analisarNota(body: unknown): { title: string; bodyMd: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new BadRequestException("title e bodyMd são obrigatórios.");
  }
  const bruto = body as { title?: unknown; bodyMd?: unknown };
  if (typeof bruto.title !== "string" || typeof bruto.bodyMd !== "string") {
    throw new BadRequestException("title e bodyMd são obrigatórios.");
  }
  return { title: bruto.title, bodyMd: bruto.bodyMd };
}

function analisarNotaParcial(body: unknown): { title?: string; bodyMd?: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new BadRequestException("corpo inválido.");
  }
  const bruto = body as { title?: unknown; bodyMd?: unknown };
  const out: { title?: string; bodyMd?: string } = {};
  if (bruto.title !== undefined) {
    if (typeof bruto.title !== "string") {
      throw new BadRequestException("title inválido.");
    }
    out.title = bruto.title;
  }
  if (bruto.bodyMd !== undefined) {
    if (typeof bruto.bodyMd !== "string") {
      throw new BadRequestException("bodyMd inválido.");
    }
    out.bodyMd = bruto.bodyMd;
  }
  if (out.title === undefined && out.bodyMd === undefined) {
    throw new BadRequestException("Informe title e/ou bodyMd.");
  }
  return out;
}

function analisarConfirm(body: unknown): boolean {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return false;
  }
  return (body as { confirm?: unknown }).confirm === true;
}
