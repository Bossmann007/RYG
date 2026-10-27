import { Injectable } from "@nestjs/common";
import {
  CATALOGO_BACKSTAGE,
  CatalogItem,
  CatalogItemKind,
} from "./backstage-catalog";

@Injectable()
export class CatalogService {
  listar(kind?: CatalogItemKind): CatalogItem[] {
    if (!kind) {
      return CATALOGO_BACKSTAGE;
    }
    return CATALOGO_BACKSTAGE.filter((item) => item.kind === kind);
  }

  exportPrompt(id: string): { id: string; corpo: string; requerSafeDto: boolean } | null {
    const item = CATALOGO_BACKSTAGE.find(
      (entrada) => entrada.id === id && entrada.kind === "prompt",
    );
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
