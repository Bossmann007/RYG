import { Public } from "@common/decorators/public.decorator";
import { Controller, Get, NotFoundException, Param, Query } from "@nestjs/common";
import { CatalogItemKind } from "./backstage-catalog";
import { CatalogService } from "./catalog.service";

@Controller("catalogo")
export class CatalogController {
  constructor(private catalogService: CatalogService) {}

  @Public()
  @Get()
  listar(@Query("kind") kind?: string) {
    const filtro = kind as CatalogItemKind | undefined;
    return {
      zone: "internal" as const,
      surface: "backstage" as const,
      area: "multi",
      itens: this.catalogService.listar(filtro),
    };
  }

  @Public()
  @Get("export/:id")
  exportar(@Param("id") id: string) {
    const prompt = this.catalogService.exportPrompt(id);
    if (!prompt) {
      throw new NotFoundException(`Prompt ${id} não encontrado no catálogo.`);
    }
    return {
      zone: "internal" as const,
      ...prompt,
      aviso: prompt.requerSafeDto
        ? "Dado privado do cliente exige SafeDTO antes de egress para LLM externa."
        : "Export limpo para linked-provider; sem PII obrigatório neste prompt.",
    };
  }
}
