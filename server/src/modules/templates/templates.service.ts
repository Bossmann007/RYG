import { Modelo, ModeloArea, ModeloKind, ModeloListaItem, ModeloStatus } from "@models/modelo.model";
import { AcervoQuery, filtroApontaParaBanco } from "@modules/db/acervo.query";
import { MODELOS_INICIAIS } from "../../fixtures/modelos";
import { Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "crypto";
import { CreateModeloDto, UpdateModeloDto } from "./templates.dto";

@Injectable()
export class TemplatesService {
  private readonly porId = new Map<string, Modelo>();

  constructor(private acervo: AcervoQuery) {
    for (const modelo of MODELOS_INICIAIS) {
      this.porId.set(modelo.id, this.copiar(modelo));
    }
  }

  async listar(filtro: {
    kind?: ModeloKind;
    area?: ModeloArea;
    status?: ModeloStatus;
    casoId?: string;
    processNumber?: string;
  }): Promise<ModeloListaItem[]> {
    const doCaso =
      this.acervo.ativo() && filtroApontaParaBanco(filtro)
        ? await this.acervo.listarDocumentos("modelos", filtro, "mod", "Modelo")
        : [];

    if (doCaso.length) {
      return doCaso.map((doc) => ({
        id: doc.id,
        title: doc.titulo,
        kind: this.kindDe(doc.tipo),
        status: "ativo" as const,
        updatedAt: doc.data,
        titulo: doc.titulo,
        tipo: doc.tipo,
        data: doc.data,
        origem: doc.origem || "Acervo do caso",
        resumo: doc.resumo,
        corpo: doc.resumo,
      }));
    }

    if (this.acervo.ativo()) {
      const escritorio = await this.acervo.listarEscritorio("modelos");
      if (escritorio.length) {
        return escritorio
          .map((linha, indice) => {
            const titulo = String(linha.titulo ?? linha.title ?? `Modelo ${indice + 1}`);
            const corpo = String(linha.corpo ?? linha.body ?? linha.resumo ?? "");
            return {
              id: String(linha.id ?? `mod-${indice}`),
              title: titulo,
              kind: this.kindDe(String(linha.kind ?? linha.tipo ?? "")),
              status: "ativo" as const,
              updatedAt: String(linha.updated_at ?? linha.data ?? ""),
              titulo,
              tipo: this.rotuloKind(this.kindDe(String(linha.kind ?? linha.tipo ?? ""))),
              data: String(linha.updated_at ?? linha.data ?? ""),
              origem: "Mafinni Advogados",
              resumo: corpo.slice(0, 280),
              corpo,
            };
          })
          .filter((item) => !filtro.kind || item.kind === filtro.kind);
      }
    }

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

  private kindDe(valor: string): ModeloKind {
    const texto = valor
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    if (texto.includes("petic") || texto === "peticao") return "peticao";
    if (texto.includes("parecer")) return "parecer";
    if (texto.includes("contrat")) return "contrato";
    if (texto.includes("email")) return "email";
    return "outro";
  }

  private rotuloKind(kind: ModeloKind): string {
    if (kind === "peticao") return "Petição";
    if (kind === "parecer") return "Parecer";
    if (kind === "contrato") return "Contrato";
    if (kind === "email") return "E-mail";
    return "Declaração";
  }

  private paraLista(modelo: Modelo): ModeloListaItem {
    const item: ModeloListaItem = {
      id: modelo.id,
      title: modelo.title,
      kind: modelo.kind,
      status: modelo.status,
      updatedAt: modelo.updatedAt,
      titulo: modelo.title,
      tipo: this.rotuloKind(modelo.kind),
      data: modelo.updatedAt.slice(0, 10),
      origem: "Mafinni Advogados",
      resumo: modelo.body.replace(/\s+/g, " ").trim().slice(0, 280),
      corpo: modelo.body,
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
