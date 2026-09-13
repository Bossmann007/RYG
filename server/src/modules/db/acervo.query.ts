import { Documento } from "@models/caso.model";
import { cnjDigitos, documentoDaLinha, type Linha } from "@modules/casos/caso.assembler";
import { nomeSeguro } from "@modules/casos/schema-map";
import { Injectable } from "@nestjs/common";
import type { RowDataPacket } from "mysql2/promise";
import { DbService, tabelaAusente } from "./db.service";

export type FiltroAcervo = {
  casoId?: string;
  processNumber?: string;
  processoId?: string;
  clienteId?: string;
};

export function filtroApontaParaBanco(filtro: FiltroAcervo): boolean {
  const clienteId = (filtro.clienteId || "").trim();
  if (clienteId && !/^\d+$/.test(clienteId)) {
    return false;
  }

  const casoId = (filtro.casoId || "").trim();
  const processoId = (filtro.processoId || "").trim();
  return (
    /^\d+$/.test(casoId) ||
    /^\d+$/.test(processoId) ||
    cnjDigitos(filtro.processNumber).length === 20
  );
}

@Injectable()
export class AcervoQuery {
  constructor(private readonly db: DbService) {}

  ativo(): boolean {
    return this.db.configurado();
  }

  async listarDocumentos(
    tabela: string,
    filtro: FiltroAcervo,
    prefixo: string,
    tipo: string
  ): Promise<Documento[]> {
    const linhas = await this.listar(tabela, filtro);
    return linhas.map((linha, indice) => documentoDaLinha(linha, prefixo, tipo, indice));
  }

  async listarEscritorio(tabela: string): Promise<Linha[]> {
    if (!this.ativo()) {
      return [];
    }

    try {
      const linhas = await this.db.consultar<RowDataPacket>(
        `SELECT * FROM ${nomeSeguro(tabela)} LIMIT 80`
      );
      return linhas.map((linha) => ({ ...linha }));
    } catch (erro) {
      if (tabelaAusente(erro)) {
        return [];
      }
      throw erro;
    }
  }

  async listar(tabela: string, filtro: FiltroAcervo): Promise<Linha[]> {
    if (!this.ativo()) {
      return [];
    }

    const { processoIds, cnjs } = await this.resolver(filtro);

    if (!processoIds.length && !cnjs.length) {
      return [];
    }

    const partes: string[] = [];
    const params: unknown[] = [];

    if (processoIds.length) {
      partes.push(`processo_id IN (${processoIds.map(() => "?").join(", ")})`);
      params.push(...processoIds);
    }

    if (cnjs.length && tabela !== "prazos") {
      partes.push(`numero_cnj IN (${cnjs.map(() => "?").join(", ")})`);
      params.push(...cnjs);
    }

    if (!partes.length) {
      return [];
    }

    try {
      const linhas = await this.db.consultar<RowDataPacket>(
        `SELECT * FROM ${nomeSeguro(tabela)} WHERE ${partes.join(" OR ")}`,
        params
      );
      return linhas.map((linha) => ({ ...linha }));
    } catch (erro) {
      if (tabelaAusente(erro)) {
        return [];
      }

      throw erro;
    }
  }

  private async resolver(
    filtro: FiltroAcervo
  ): Promise<{ processoIds: string[]; cnjs: string[] }> {
    const processoIds = new Set<string>();
    const cnjs = new Set<string>();
    const processoId = soDigitos(filtro.processoId);
    const casoId = soDigitos(filtro.casoId);
    const cnj = cnjDigitos(filtro.processNumber);

    if (processoId) {
      processoIds.add(processoId);
    }

    if (cnj.length === 20) {
      cnjs.add(cnj);
    }

    if (casoId) {
      processoIds.add(casoId);

      try {
        const casos = await this.db.consultar<RowDataPacket>(
          "SELECT id, processo_id, numero_cnj FROM casos WHERE id = ? OR processo_id = ? LIMIT 1",
          [casoId, casoId]
        );

        if (casos[0]) {
          if (casos[0].processo_id != null) {
            processoIds.add(String(casos[0].processo_id));
          }

          const digits = cnjDigitos(casos[0].numero_cnj);

          if (digits.length === 20) {
            cnjs.add(digits);
          }
        }
      } catch (erro) {
        if (!tabelaAusente(erro)) {
          throw erro;
        }
      }
    }

    return { processoIds: [...processoIds], cnjs: [...cnjs] };
  }
}

function soDigitos(valor?: string): string | undefined {
  const texto = (valor || "").trim();
  return /^\d+$/.test(texto) ? texto : undefined;
}
