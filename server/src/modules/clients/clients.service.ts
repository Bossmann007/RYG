import { Cliente, ClienteListaItem } from "@models/cliente.model";
import { CLIENTES_INICIAIS } from "../../fixtures/clientes";
import { Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "crypto";
import { CreateClienteDto, UpdateClienteDto } from "./clients.dto";
import { AcervoQuery, filtroApontaParaBanco } from "@modules/db/acervo.query";
import { textoCampo } from "@modules/casos/caso.assembler";
import { ALIASES } from "@modules/casos/schema-map";

@Injectable()
export class ClientsService {
  private readonly porId = new Map<string, Cliente>();

  constructor(private readonly acervo: AcervoQuery) {
    for (const cliente of CLIENTES_INICIAIS) {
      this.porId.set(cliente.id, { ...cliente });
    }
  }

  async listar(filtro: { casoId?: string; processNumber?: string } = {}): Promise<ClienteListaItem[]> {
    if (this.acervo.ativo() && filtroApontaParaBanco(filtro)) {
      const linhas = await this.acervo.listar("clientes", filtro);
      return linhas.map((linha) => {
        const nome = textoCampo(linha, ALIASES.cliente);
        const papel = textoCampo(linha, ALIASES.papel);
        const tipo = textoCampo(linha, ALIASES.tipo);
        return {
          id: textoCampo(linha, ALIASES.id),
          displayName: nome,
          kind: tipo === "pessoa_juridica" ? "pessoa_juridica" : "pessoa_fisica",
          status: "ativo" as const,
          updatedAt: textoCampo(linha, ALIASES.atualizacao),
          titulo: nome,
          tipo: papel || tipo || "Cliente",
          data: "",
          origem: textoCampo(linha, ALIASES.origem) || "DataJud",
          resumo: papel || tipo,
        } as ClienteListaItem;
      });
    }

    return [...this.porId.values()]
      .sort((a, b) => a.displayName.localeCompare(b.displayName, "pt-BR"))
      .map((cliente) => this.paraLista(cliente));
  }

  obter(id: string): Cliente {
    const cliente = this.porId.get(id);

    if (!cliente) {
      throw new NotFoundException("Cliente não encontrado.");
    }

    return this.copiar(cliente);
  }

  existe(id: string): boolean {
    return this.porId.has(id);
  }

  criar(dto: CreateClienteDto): Cliente {
    const agora = new Date().toISOString();
    const cliente: Cliente = {
      id: `cli_${randomBytes(6).toString("hex")}`,
      displayName: dto.displayName.trim(),
      kind: dto.kind,
      status: dto.status ?? "ativo",
      createdAt: agora,
      updatedAt: agora,
    };

    if (dto.notes?.trim()) {
      cliente.notes = dto.notes.trim();
    }

    this.porId.set(cliente.id, cliente);
    return this.copiar(cliente);
  }

  atualizar(id: string, dto: UpdateClienteDto): Cliente {
    const atual = this.obter(id);
    const proximo: Cliente = {
      id: atual.id,
      displayName: dto.displayName?.trim() || atual.displayName,
      kind: dto.kind ?? atual.kind,
      status: dto.status ?? atual.status,
      createdAt: atual.createdAt,
      updatedAt: new Date().toISOString(),
    };

    const notes = dto.notes !== undefined ? dto.notes.trim() : atual.notes;

    if (notes) {
      proximo.notes = notes;
    }

    this.porId.set(id, proximo);
    return this.copiar(proximo);
  }

  remover(id: string): void {
    this.obter(id);
    this.porId.delete(id);
  }

  private paraLista(cliente: Cliente): ClienteListaItem {
    return {
      id: cliente.id,
      displayName: cliente.displayName,
      kind: cliente.kind,
      status: cliente.status,
      updatedAt: cliente.updatedAt,
    };
  }

  private copiar(cliente: Cliente): Cliente {
    return { ...cliente };
  }
}
