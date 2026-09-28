import { Caso } from "@models/caso.model";
import { DbService, tabelaAusente } from "@modules/db/db.service";
import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { RowDataPacket } from "mysql2/promise";
import {
  cnjDigitos,
  montarCaso,
  valorCampo,
  type Linha,
  type PacoteCaso,
} from "./caso.assembler";
import { ALIASES, nomeSeguro, type NomeTabela } from "./schema-map";

const PROCESSOS_COLUNAS = [
  "id",
  "numero_cnj",
  "tribunal",
  "grau",
  "classe_codigo",
  "classe_nome",
  "assuntos_json",
  "orgao_julgador",
  "data_ajuizamento",
  "data_hora_ultima_atualizacao",
  "nivel_sigilo",
  "formato",
  "sistema",
  "fonte",
  "created_at",
  "updated_at",
]
  .map(nomeSeguro)
  .join(", ");

const FILHAS: NomeTabela[] = [
  "clientes",
  "peticoes",
  "contratos",
  "documentos",
  "decisoes",
  "modelos",
  "historico",
  "prazos",
  "teses",
  "resultados",
  "conversas",
  "jurisprudencias",
  "jurimetria",
  "dissidios",
];

@Injectable()
export class CasosRepository {
  constructor(private readonly db: DbService) {}

  async listar(officeId: string): Promise<Caso[]> {
    return this.carregar(officeId);
  }

  async obter(officeId: string, idOrCnj: string): Promise<Caso | undefined> {
    const capa = await this.buscarCapa(officeId, idOrCnj);
    if (!capa) {
      return undefined;
    }

    const processo = await this.buscarProcesso(officeId, capa);
    return this.montarDeCapa(capa, processo ? [processo] : [], true, true);
  }

  private async buscarProcesso(officeId: string, capa: Linha): Promise<Linha | undefined> {
    const processoId = String(valorCampo(capa, ALIASES.processoId) ?? "");
    const cnj = cnjDigitos(valorCampo(capa, ALIASES.numeroCnj));

    try {
      if (processoId) {
        const porId = await this.db.consultar<RowDataPacket>(
          `SELECT ${PROCESSOS_COLUNAS} FROM processos WHERE id = ? AND office_id = ? LIMIT 1`,
          [processoId, officeId]
        );
        if (porId[0]) {
          return { ...porId[0] };
        }
      }

      if (cnj.length === 20) {
        const porCnj = await this.db.consultar<RowDataPacket>(
          `SELECT ${PROCESSOS_COLUNAS} FROM processos WHERE REPLACE(REPLACE(REPLACE(numero_cnj, '-', ''), '.', ''), '/', '') = ? AND office_id = ? LIMIT 1`,
          [cnj, officeId]
        );
        if (porCnj[0]) {
          return { ...porCnj[0] };
        }
      }
    } catch (erro) {
      if (!tabelaAusente(erro)) {
        throw erro;
      }
    }

    return undefined;
  }

  private async buscarCapa(officeId: string, idOrCnj: string): Promise<Linha | undefined> {
    const chave = idOrCnj.trim();
    const pedido = cnjDigitos(chave);

    try {
      if (/^\d+$/.test(chave)) {
        const porId = await this.db.consultar<RowDataPacket>(
          "SELECT * FROM casos WHERE (id = ? OR processo_id = ?) AND office_id = ? LIMIT 1",
          [chave, chave, officeId]
        );
        if (porId[0]) {
          return { ...porId[0] };
        }
      }

      if (pedido.length === 20) {
        const porCnj = await this.db.consultar<RowDataPacket>(
          "SELECT * FROM casos WHERE REPLACE(REPLACE(REPLACE(numero_cnj, '-', ''), '.', ''), '/', '') = ? AND office_id = ? LIMIT 1",
          [pedido, officeId]
        );
        if (porCnj[0]) {
          return { ...porCnj[0] };
        }
      }
    } catch (erro) {
      if (!tabelaAusente(erro)) {
        throw erro;
      }
    }

    const casos = (await this.capasDoEscritorio("casos", officeId)) ?? [];
    const processos = (await this.capasDoEscritorio("processos", officeId)) ?? [];
    const capas = casos.length ? casos : processos;
    return capas.find((linha) => this.capaBate(linha, idOrCnj));
  }

  async carregar(officeId: string): Promise<Caso[]> {
    const casosOuAusente = await this.capasDoEscritorio("casos", officeId);
    const processosOuAusente = await this.capasDoEscritorio("processos", officeId);

    if (!casosOuAusente && !processosOuAusente) {
      throw new ServiceUnavailableException(
        "Tabelas casos/processos ausentes no banco configurado."
      );
    }

    const casos = casosOuAusente ?? [];
    const processos = processosOuAusente ?? [];
    const capas = casos.length ? casos : processos;
    if (!capas.length) {
      return [];
    }

    const porTabela: Record<string, Linha[]> = {
      clientes: await this.linhas("clientes"),
    };

    return Promise.all(
      capas.map((capa) => this.montarDeCapa(capa, processos, casos.length > 0, false, porTabela))
    );
  }

  private async montarDeCapa(
    capa: Linha,
    processos: Linha[],
    capaEhCaso: boolean,
    filtrarFilhos: boolean,
    cache?: Record<string, Linha[]>
  ): Promise<Caso> {
    const processo = this.ligarProcesso(capa, processos, capaEhCaso);
    const processoId = String(
      valorCampo(processo, ALIASES.id) ?? valorCampo(capa, ALIASES.processoId) ?? ""
    );
    const cnj = cnjDigitos(
      valorCampo(processo, ALIASES.numeroCnj) ?? valorCampo(capa, ALIASES.numeroCnj)
    );

    const filhos: Record<string, Linha[]> = {};
    if (filtrarFilhos) {
      const carregadas = await Promise.all(
        FILHAS.map(async (tabela) => ({
          tabela,
          linhas: await this.linhasDoProcesso(tabela, processoId, cnj),
        }))
      );
      for (const item of carregadas) {
        filhos[item.tabela] = item.linhas;
      }
    } else {
      for (const tabela of FILHAS) {
        filhos[tabela] = this.ligarFilhos(cache?.[tabela] || [], capa, processo);
      }
    }

    const pacote: PacoteCaso = {
      capa,
      processo,
      cliente: filhos.clientes[0],
      clientes: filhos.clientes,
      peticoes: filhos.peticoes,
      contratos: filhos.contratos,
      documentos: filhos.documentos,
      decisoes: filhos.decisoes,
      modelos: filhos.modelos,
      historico: filhos.historico,
      prazos: filhos.prazos,
      teses: filhos.teses,
      resultados: filhos.resultados,
      conversas: filhos.conversas,
      jurisprudencias: filhos.jurisprudencias,
      dissidios: filhos.dissidios,
      jurimetria: filhos.jurimetria[0],
    };

    return montarCaso(pacote);
  }

  private capaBate(capa: Linha, idOrCnj: string): boolean {
    const chave = idOrCnj.trim();
    const id = String(valorCampo(capa, ALIASES.id) ?? "");
    const processoId = String(valorCampo(capa, ALIASES.processoId) ?? "");
    const cnj = cnjDigitos(valorCampo(capa, ALIASES.numeroCnj));
    const pedido = cnjDigitos(chave);

    return (
      id === chave ||
      processoId === chave ||
      (pedido.length === 20 && pedido === cnj)
    );
  }

  /** Returns null when the table does not exist, [] when the office has no rows. */
  private async capasDoEscritorio(
    tabela: "casos" | "processos",
    officeId: string
  ): Promise<Linha[] | null> {
    const colunas = tabela === "processos" ? PROCESSOS_COLUNAS : "*";

    try {
      const registros = await this.db.consultar<RowDataPacket>(
        `SELECT ${colunas} FROM ${tabela} WHERE office_id = ?`,
        [officeId]
      );
      return registros.map((linha) => ({ ...linha }));
    } catch (erro) {
      if (tabelaAusente(erro)) {
        return null;
      }

      throw erro;
    }
  }

  private async linhas(tabela: NomeTabela): Promise<Linha[]> {
    try {
      const registros = await this.db.consultar<RowDataPacket>(
        `SELECT * FROM ${nomeSeguro(tabela)}`
      );
      return registros.map((linha) => ({ ...linha }));
    } catch (erro) {
      if (tabelaAusente(erro)) {
        return [];
      }

      throw erro;
    }
  }

  private async linhasDoProcesso(
    tabela: NomeTabela,
    processoId: string,
    cnj: string
  ): Promise<Linha[]> {
    const partes: string[] = [];
    const params: unknown[] = [];

    if (processoId) {
      partes.push("processo_id = ?");
      params.push(processoId);
    }

    if (cnj.length === 20 && tabela !== "prazos") {
      partes.push("numero_cnj = ?");
      params.push(cnj);
    }

    if (!partes.length) {
      return [];
    }

    try {
      const registros = await this.db.consultar<RowDataPacket>(
        `SELECT * FROM ${nomeSeguro(tabela)} WHERE ${partes.join(" OR ")}`,
        params
      );
      return registros.map((linha) => ({ ...linha }));
    } catch (erro) {
      if (tabelaAusente(erro)) {
        return [];
      }

      throw erro;
    }
  }

  private ligarProcesso(capa: Linha, processos: Linha[], capaEhCaso: boolean): Linha | undefined {
    if (!capaEhCaso) {
      return capa;
    }

    const processoId = valorCampo(capa, ALIASES.processoId);
    if (processoId != null) {
      const porId = processos.find(
        (processo) => String(valorCampo(processo, ALIASES.id)) === String(processoId)
      );
      if (porId) {
        return porId;
      }
    }

    const cnj = cnjDigitos(valorCampo(capa, ALIASES.numeroCnj));
    if (cnj.length === 20) {
      return processos.find(
        (processo) => cnjDigitos(valorCampo(processo, ALIASES.numeroCnj)) === cnj
      );
    }

    return undefined;
  }

  private ligarFilhos(linhas: Linha[], capa: Linha, processo?: Linha): Linha[] {
    const casoId = String(valorCampo(capa, ALIASES.id) ?? "");
    const processoId = String(
      valorCampo(processo, ALIASES.id) ?? valorCampo(capa, ALIASES.processoId) ?? ""
    );
    const cnj = cnjDigitos(
      valorCampo(processo, ALIASES.numeroCnj) ?? valorCampo(capa, ALIASES.numeroCnj)
    );

    return linhas.filter((linha) => {
      const cid = valorCampo(linha, ALIASES.casoId);
      const pid = valorCampo(linha, ALIASES.processoId);
      const rcnj = cnjDigitos(valorCampo(linha, ALIASES.numeroCnj));

      return (
        (cid != null && casoId && String(cid) === casoId) ||
        (pid != null && processoId && String(pid) === processoId) ||
        (rcnj.length === 20 && rcnj === cnj)
      );
    });
  }
}
