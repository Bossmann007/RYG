import { Modelo, ModeloArea, ModeloKind, ModeloListaItem, ModeloStatus } from "@models/modelo.model";
import { MODELOS_INICIAIS } from "../../fixtures/modelos";
import { Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "crypto";
import { CreateModeloDto, UpdateModeloDto } from "./templates.dto";

@Injectable()
export class TemplatesService {
  private readonly porId = new Map<string, Modelo>();

  constructor() {
    for (const modelo of MODELOS_INICIAIS) {
      this.porId.set(modelo.id, this.copiar(modelo));
    }
  }

  listar(filtro: {
    kind?: ModeloKind;
    area?: ModeloArea;
    status?: ModeloStatus;
  }): ModeloListaItem[] {
    return [...this.porId.values()]
      .filter((modelo) => !filtro.kind || modelo.kind === filtro.kind)
      .filter((modelo) => !filtro.area || modelo.area === filtro.area)
      .filter((modelo) => !filtro.status || modelo.status === filtro.status)
      .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"))
      .map((modelo) => this.paraLista(modelo));
  }

  obter(id: string): Modelo {
    const modelo = this.porId.get(id);

    if (!modelo) {
      throw new NotFoundException("Modelo não encontrado.");
    }

    return this.copiar(modelo);
  }

  criar(dto: CreateModeloDto): Modelo {
    const agora = new Date().toISOString();
    const modelo: Modelo = {
      id: `mod_${randomBytes(6).toString("hex")}`,
      title: dto.title.trim(),
      kind: dto.kind,
      body: dto.body.trim(),
      status: dto.status ?? "ativo",
      createdAt: agora,
      updatedAt: agora,
    };

    if (dto.area) {
      modelo.area = dto.area;
    }

    const tags = this.normalizarTags(dto.tags);

    if (tags) {
      modelo.tags = tags;
    }

    this.porId.set(modelo.id, modelo);
    return this.copiar(modelo);
  }

  atualizar(id: string, dto: UpdateModeloDto): Modelo {
    const atual = this.obter(id);
    const proximo: Modelo = {
      id: atual.id,
      title: dto.title?.trim() || atual.title,
      kind: dto.kind ?? atual.kind,
      body: dto.body?.trim() || atual.body,
      status: dto.status ?? atual.status,
      createdAt: atual.createdAt,
      updatedAt: new Date().toISOString(),
    };
    const area = dto.area !== undefined ? dto.area : atual.area;
    const tags =
      dto.tags !== undefined ? this.normalizarTags(dto.tags) : atual.tags;

    if (area) {
      proximo.area = area;
    }

    if (tags?.length) {
      proximo.tags = tags;
    }

    this.porId.set(id, proximo);
    return this.copiar(proximo);
  }

  remover(id: string): void {
    this.obter(id);
    this.porId.delete(id);
  }

  private normalizarTags(tags?: string[]): string[] | undefined {
    if (!tags) {
      return undefined;
    }

    const limpas = tags.map((tag) => tag.trim()).filter(Boolean);
    return limpas.length ? limpas : undefined;
  }

  private paraLista(modelo: Modelo): ModeloListaItem {
    const item: ModeloListaItem = {
      id: modelo.id,
      title: modelo.title,
      kind: modelo.kind,
      status: modelo.status,
      updatedAt: modelo.updatedAt,
    };

    if (modelo.area) {
      item.area = modelo.area;
    }

    if (modelo.tags?.length) {
      item.tags = [...modelo.tags];
    }

    return item;
  }

  private copiar(modelo: Modelo): Modelo {
    return {
      ...modelo,
      tags: modelo.tags ? [...modelo.tags] : undefined,
    };
  }
}
