import { ParteRegistrada } from "@common/security/case-acl";
import { Caso } from "@models/caso.model";
import { DbService, tabelaAusente } from "@modules/db/db.service";
import { RetentionService } from "@modules/retention/retention.service";
import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { RowDataPacket } from "mysql2/promise";
import {
  cnjDigitos,
  montarCaso,
  valorCampo,
  type Linha,
  type PacoteCaso,
} from "./caso.assembler";
import { decidirPurgeIntake } from "./intake-delete-gate";
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
  constructor(
    private readonly db: DbService,
    private readonly retention: RetentionService,
  ) {}

  async listar(officeId: string): Promise<Caso[]> {
    return this.carregar(officeId);
  }

  async idDaCapa(officeId: string, idOrCnj: string): Promise<string | null> {
    const capa = await this.buscarCapa(officeId, idOrCnj);
    if (!capa) {
      return null;
    }
    const id = valorCampo(capa, ALIASES.id);
    return id == null || id === "" ? null : String(id);
  }

  async idsDoMembro(officeId: string, userId: string): Promise<string[]> {
    const linhas = await this.consultarAcl<RowDataPacket>(
      "SELECT caso_id FROM case_memberships WHERE office_id = ? AND user_id = ?",
      [officeId, userId],
    );
    return linhas.map((linha) => String(linha.caso_id));
  }

  async temMembership(officeId: string, casoId: string, userId: string): Promise<boolean> {
    const linhas = await this.consultarAcl<RowDataPacket>(
      "SELECT 1 AS ok FROM case_memberships WHERE office_id = ? AND caso_id = ? AND user_id = ? LIMIT 1",
      [officeId, casoId, userId],
    );
    return linhas.length > 0;
  }

  async partesDoEscritorio(officeId: string): Promise<ParteRegistrada[]> {
    const linhas = await this.consultarAcl<RowDataPacket>(
      "SELECT caso_id, side, name_key FROM case_parties WHERE office_id = ?",
      [officeId],
    );
    return linhas
      .filter((linha) => linha.side === "client" || linha.side === "adverse")
      .map((linha) => ({
        casoId: String(linha.caso_id),
        side: linha.side,
        nameKey: String(linha.name_key),
      }));
  }

  async inserirIntake(input: {
    officeId: string;
    userId: string;
    role: string;
    clientName: string;
    clientKey: string;
    adverseKey: string;
    classification: string;
  }): Promise<string> {
    const id = `${Date.now()}${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")}`;
    try {
      await this.db.executar(
        "INSERT INTO casos (id, titulo, cliente_nome, office_id, status, classification) VALUES (?, ?, ?, ?, 'intake', ?)",
        [
          id,
          input.clientName.slice(0, 200),
          input.clientName.slice(0, 255),
          input.officeId,
          input.classification,
        ],
      );
      await this.db.executar(
        "INSERT INTO case_memberships (office_id, caso_id, user_id, role) VALUES (?, ?, ?, ?)",
        [input.officeId, id, input.userId, input.role],
      );
      await this.db.executar(
        "INSERT INTO case_parties (office_id, caso_id, side, name_key) VALUES (?, ?, 'client', ?), (?, ?, 'adverse', ?)",
        [input.officeId, id, input.clientKey, input.officeId, id, input.adverseKey],
      );
    } catch (erro) {
      try {
        await this.apagarIntake(input.officeId, id);
      } catch {
        /* best-effort rollback; keep the original insert error */
      }
      throw erro;
    }
    return id;
  }

  async excluirCapa(officeId: string, casoId: string): Promise<void> {
    await this.retention.assertPodeApagar(officeId, casoId);
    await this.apagarIntake(officeId, casoId);
  }

  async obter(officeId: string, idOrCnj: string): Promise<Caso | undefined> {
    const capa = await this.buscarCapa(officeId, idOrCnj);
    if (!capa) {
      return undefined;
    }

    const processo = await this.buscarProcesso(officeId, capa);
    return this.montarDeCapa(capa, processo ? [processo] : [], true, true, officeId);
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

    if (!officeId) {
      throw new ServiceUnavailableException("office_id obrigatório para listar capas.");
    }

    const porTabela: Record<string, Linha[]> = {
      clientes: await this.linhas("clientes", officeId),
    };

    return Promise.all(
      capas.map((capa) =>
        this.montarDeCapa(capa, processos, casos.length > 0, false, officeId, porTabela),
      ),
    );
  }

  private async montarDeCapa(
    capa: Linha,
    processos: Linha[],
    capaEhCaso: boolean,
    filtrarFilhos: boolean,
    officeId: string,
    cache?: Record<string, Linha[]>
  ): Promise<Caso> {
    if (!officeId) {
      throw new ServiceUnavailableException("office_id obrigatório para montar capa.");
    }

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
          linhas: await this.linhasDoProcesso(tabela, officeId, processoId, cnj),
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

  private async linhas(tabela: NomeTabela, officeId: string): Promise<Linha[]> {
    if (!officeId) {
      throw new ServiceUnavailableException("office_id obrigatório para filhas.");
    }
    try {
      const registros = await this.db.consultar<RowDataPacket>(
        `SELECT * FROM ${nomeSeguro(tabela)} WHERE office_id = ?`,
        [officeId],
      );
      return registros.map((linha) => ({ ...linha }));
    } catch (erro) {
      if (tabelaAusente(erro)) {
        return [];
      }
      if (this.colunaAusente(erro, "office_id")) {
        throw new ServiceUnavailableException(
          `Coluna office_id ausente em ${tabela}. Operação recusada.`,
        );
      }

      throw erro;
    }
  }

  private async linhasDoProcesso(
    tabela: NomeTabela,
    officeId: string,
    processoId: string,
    cnj: string
  ): Promise<Linha[]> {
    if (!officeId) {
      throw new ServiceUnavailableException("office_id obrigatório para filhas.");
    }

    const partes: string[] = [];
    const params: unknown[] = [];

    if (processoId) {
      partes.push("processo_id = ?");
      params.push(processoId);
    }

    // prazos/historico are keyed by processo_id (+ office_id); they have no numero_cnj.
    if (cnj.length === 20 && tabela !== "prazos" && tabela !== "historico") {
      partes.push("numero_cnj = ?");
      params.push(cnj);
    }

    if (!partes.length) {
      return [];
    }

    try {
      const registros = await this.db.consultar<RowDataPacket>(
        `SELECT * FROM ${nomeSeguro(tabela)} WHERE office_id = ? AND (${partes.join(" OR ")})`,
        [officeId, ...params],
      );
      return registros.map((linha) => ({ ...linha }));
    } catch (erro) {
      if (tabelaAusente(erro)) {
        return [];
      }
      if (this.colunaAusente(erro, "office_id")) {
        throw new ServiceUnavailableException(
          `Coluna office_id ausente em ${tabela}. Operação recusada.`,
        );
      }

      throw erro;
    }
  }

  private colunaAusente(erro: unknown, coluna: string): boolean {
    const e = erro as { code?: string; errno?: number; message?: string };
    const msg = String(e.message || "");
    // Only treat as missing *this* column — other ER_BAD_FIELD_ERROR must not
    // masquerade as office_id gaps (e.g. absent numero_cnj on historico).
    return new RegExp(`Unknown column ['\`]?${coluna}['\`]?`, "i").test(msg);
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

  private async consultarAcl<T extends RowDataPacket>(sql: string, params: unknown[]): Promise<T[]> {
    try {
      return await this.db.consultar<T>(sql, params);
    } catch (erro) {
      if (tabelaAusente(erro)) {
        throw new ServiceUnavailableException("Case ACL ausente. Operação recusada.");
      }
      throw erro;
    }
  }

  private async apagarIntake(officeId: string, casoId: string): Promise<void> {
    await this.retention.assertPodeApagar(officeId, casoId);

    const capa = await this.db.executar(
      "DELETE FROM casos WHERE id = ? AND office_id = ? AND status = 'intake'",
      [casoId, officeId],
    );
    const capaRemovida = Number(capa.affectedRows || 0) > 0;

    let statusRestante: string | null = null;
    if (!capaRemovida) {
      const linhas = await this.db.consultar<RowDataPacket>(
        `SELECT status AS status FROM casos
         WHERE CAST(id AS CHAR) = ? AND office_id = ? LIMIT 1`,
        [casoId, officeId],
      );
      statusRestante = linhas.length ? String(linhas[0].status) : null;
    }

    if (decidirPurgeIntake({ capaRemovida, statusRestante }) === "conflict") {
      throw new ConflictException(
        "Só casos em intake podem ser excluídos nesta versão.",
      );
    }

    await this.db.executar("DELETE FROM case_parties WHERE caso_id = ?", [casoId]).catch(() => undefined);
    await this.db.executar("DELETE FROM case_memberships WHERE caso_id = ?", [casoId]).catch(() => undefined);
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
