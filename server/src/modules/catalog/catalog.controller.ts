import { identidadeDaRequisicao } from "@common/guards/identity.guard";
import { RegistroAuditoria } from "@models/gateway.model";
import { AuditService } from "@modules/gateway/audit.service";
import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  Req,
} from "@nestjs/common";
import { Request } from "express";
import { CatalogItemKind } from "./backstage-catalog";
import { CatalogService } from "./catalog.service";

@Controller("catalogo")
export class CatalogController {
  constructor(
    private catalogService: CatalogService,
    private audit: AuditService,
  ) {}

  @Get()
  listar(@Req() req: Request, @Query("kind") kind?: string) {
    identidadeDaRequisicao(req);
    const filtro = kind as CatalogItemKind | undefined;
    return {
      zone: "internal" as const,
      surface: "backstage" as const,
      area: "multi",
      itens: this.catalogService.listar(filtro),
    };
  }

  @Get("export/:id")
  async exportar(
    @Req() req: Request,
    @Param("id") id: string,
    @Query("safeDtoReleaseId") safeDtoReleaseId?: string,
  ) {
    const identidade = identidadeDaRequisicao(req);
    const prompt = this.catalogService.exportPrompt(id);
    if (!prompt) {
      throw new NotFoundException(`Prompt ${id} não encontrado no catálogo.`);
    }
    if (prompt.requerSafeDto && !String(safeDtoReleaseId || "").trim()) {
      await this.auditar(identidade, "catalog_export", "negado", "safedto", {
        catalogId: id,
        officeId: identidade.officeId,
      });
      throw new BadRequestException(
        "Export requerSafeDto=true exige safeDtoReleaseId (HITL/SafeDTO release).",
      );
    }
    await this.auditar(identidade, "catalog_export", "permitido", "export", {
      catalogId: id,
      officeId: identidade.officeId,
      requerSafeDto: prompt.requerSafeDto,
      safeDtoReleaseId: String(safeDtoReleaseId || "").trim() || undefined,
    });
    return {
      zone: "internal" as const,
      ...prompt,
      aviso: prompt.requerSafeDto
        ? "Dado privado do cliente exige SafeDTO antes de egress para LLM externa."
        : "Export limpo para linked-provider; sem PII obrigatório neste prompt.",
    };
  }

  private auditar(
    identidade: ReturnType<typeof identidadeDaRequisicao>,
    ferramenta: string,
    decisao: RegistroAuditoria["decisao"],
    motivo: string,
    argumentos: Record<string, unknown>,
  ) {
    return this.audit.registrar({
      at: new Date().toISOString(),
      identidade: identidade.id,
      nome: identidade.nome,
      papel: identidade.papel,
      origem: "hub",
      ferramenta,
      argumentos,
      decisao,
      motivo,
      omitido: [],
      duracaoMs: 0,
    });
  }
}
