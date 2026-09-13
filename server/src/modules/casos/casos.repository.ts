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

  async listar(): Promise<Caso[]> {
    return this.carregar();
  }

  async obter(idOrCnj: string): Promise<Caso | undefined> {
    const casos = await this.linhas("casos");
    const processos = await this.linhas("processos");
    const capas = casos.length ? casos : processos;

    if (!capas.length) {
      throw new ServiceUnavailableException(
        "Tabelas casos/processos ausentes no banco configurado."
      );
    }

    const capa = capas.find((linha) => this.capaBate(linha, idOrCnj));
    if (!capa) {
      return undefined;
    }

    return this.montarDeCapa(capa, processos, casos.length > 0, true);
  }

  async carregar(): Promise<Caso[]> {
    const casos = await this.linhas("casos");
    const processos = await this.linhas("processos");
    const capas = casos.length ? casos : processos;

    if (!capas.length) {
      throw new ServiceUnavailableException(
        "Tabelas casos/processos ausentes no banco configurado."
      );
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
    for (const tabela of FILHAS) {
      filhos[tabela] = filtrarFilhos
        ? await this.linhasDoProcesso(tabela, processoId, cnj)
        : this.ligarFilhos(cache?.[tabela] || [], capa, processo);
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

  private async linhas(tabela: NomeTabela): Promise<Linha[]> {
    const sql =
      tabela === "processos"
        ? `SELECT ${PROCESSOS_COLUNAS} FROM ${nomeSeguro(tabela)}`
        : `SELECT * FROM ${nomeSeguro(tabela)}`;

    try {
      const registros = await this.db.consultar<RowDataPacket>(sql);
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
