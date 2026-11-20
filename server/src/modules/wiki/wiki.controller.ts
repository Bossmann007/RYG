import { identidadeDaRequisicao } from "@common/guards/identity.guard";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import { WikiService } from "./wiki.service";

/**
 * Hub-internal wiki / hardvault surface (Phase 3 Tasks 3.2–3.3).
 * Not an MCP egress path — no SafeDTO. Personal notes never join hardvault search.
 */
@Controller("wiki")
export class WikiController {
  constructor(private readonly wiki: WikiService) {}

  @Get("hardvault")
  async searchHardvault(@Req() req: Request, @Query("q") q?: string) {
    const identidade = identidadeDaRequisicao(req);
    return {
      zone: "internal" as const,
      hits: await this.wiki.searchHardvault(identidade.officeId, identidade.id, q),
    };
  }

  @Get("load")
  async loadPack(@Req() req: Request, @Query("q") q?: string) {
    const identidade = identidadeDaRequisicao(req);
    const pack = await this.wiki.loadPack(identidade.officeId, identidade.id, q);
    return {
      zone: "internal" as const,
      notes: pack.notes,
      hardvault: pack.hardvault,
    };
  }

  @Post("notes")
  @HttpCode(201)
  async createNote(
    @Req() req: Request,
    @Body() body: { title?: string; body?: string },
  ) {
    const identidade = identidadeDaRequisicao(req);
    const note = await this.wiki.createNote(
      identidade.officeId,
      identidade.id,
      body?.title,
      body?.body,
    );
    return {
      zone: "internal" as const,
      note,
    };
  }

  @Post("notes/:id/publish")
  @HttpCode(200)
  async publishNote(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: { confirm?: boolean },
  ) {
    const identidade = identidadeDaRequisicao(req);
    const doc = await this.wiki.publishNote(
      identidade.officeId,
      identidade.id,
      id,
      body?.confirm,
    );
    return {
      zone: "internal" as const,
      doc,
    };
  }

  @Get("notes/:id")
  async getNote(@Req() req: Request, @Param("id") id: string) {
    const identidade = identidadeDaRequisicao(req);
    const note = await this.wiki.getOwnNote(identidade.officeId, identidade.id, id);
    return {
      zone: "internal" as const,
      note,
    };
  }
}
