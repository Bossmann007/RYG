import { Injectable } from "@nestjs/common";
import { CATALOGO_BANCARIO, CatalogItem, CatalogItemKind } from "./banking-catalog";

@Injectable()
export class CatalogService {
  listar(kind?: CatalogItemKind): CatalogItem[] {
    if (!kind) {
      return CATALOGO_BANCARIO;
    }
    return CATALOGO_BANCARIO.filter((item) => item.kind === kind);
  }

  exportPrompt(id: string): { id: string; corpo: string; requerSafeDto: boolean } | null {
    const item = CATALOGO_BANCARIO.find((entrada) => entrada.id === id && entrada.kind === "prompt");
    if (!item?.corpo) {
      return null;
    }
    return {
      id: item.id,
      corpo: item.corpo,
      requerSafeDto: item.requerSafeDto,
    };
  }
}
