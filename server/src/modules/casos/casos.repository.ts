import { Caso } from "@models/caso.model";
import { DbService } from "@modules/db/db.service";
import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { RowDataPacket } from "mysql2/promise";
import {
  cnjDigitos,
  montarCaso,
  valorCampo,
  type Linha,
  type PacoteCaso,
} from "./caso.assembler";
import { ALIASES, nomeSeguro, TABELAS_ACERVO, type EsquemaAcervo } from "./schema-map";

@Injectable()
export class CasosRepository {
  private esquemaPromise: Promise<EsquemaAcervo> | null = null;

  constructor(private readonly db: DbService) {}

  async listar(): Promise<Caso[]> {
    return this.carregar();
  }

  async carregar(): Promise<Caso[]> {
    const esquema = await this.esquema();

    if (!esquema.tabelas.has("casos") && !esquema.tabelas.has("processos")) {
      throw new ServiceUnavailableException(
        "Tabelas casos/processos ausentes no banco configurado."
      );
    }

    const casos = await this.linhas(esquema, "casos");
    const processos = await this.linhas(esquema, "processos");
    const clientes = await this.linhas(esquema, "clientes");
    const capas = casos.length ? casos : processos;

    const filhos = {
      peticoes: await this.linhas(esquema, "peticoes"),
      contratos: await this.linhas(esquema, "contratos"),
      documentos: await this.linhas(esquema, "documentos"),
      decisoes: await this.linhas(esquema, "decisoes"),
      modelos: await this.linhas(esquema, "modelos"),
      historico: await this.linhas(esquema, "historico"),
      teses: await this.linhas(esquema, "teses"),
      resultados: await this.linhas(esquema, "resultados"),
      conversas: await this.linhas(esquema, "conversas"),
      jurisprudencias: await this.linhas(esquema, "jurisprudencias"),
      dissidios: await this.linhas(esquema, "dissidios"),
      jurimetria: await this.linhas(esquema, "jurimetria"),
    };

    return capas.map((capa) => {
      const processo = this.ligarProcesso(capa, processos, casos.length > 0);
      const cliente = this.ligarCliente(capa, processo, clientes);
      const pacote: PacoteCaso = {
        capa,
        processo,
        cliente,
        peticoes: this.ligarFilhos(filhos.peticoes, capa, processo),
        contratos: this.ligarFilhos(filhos.contratos, capa, processo),
        documentos: this.ligarFilhos(filhos.documentos, capa, processo),
        decisoes: this.ligarFilhos(filhos.decisoes, capa, processo),
        modelos: this.ligarFilhos(filhos.modelos, capa, processo),
        historico: this.ligarFilhos(filhos.historico, capa, processo),
        teses: this.ligarFilhos(filhos.teses, capa, processo),
        resultados: this.ligarFilhos(filhos.resultados, capa, processo),
        conversas: this.ligarFilhos(filhos.conversas, capa, processo),
        jurisprudencias: this.ligarFilhos(filhos.jurisprudencias, capa, processo),
        dissidios: this.ligarFilhos(filhos.dissidios, capa, processo),
        jurimetria: this.ligarFilhos(filhos.jurimetria, capa, processo)[0],
      };

      return montarCaso(pacote);
    });
  }

  private async esquema(): Promise<EsquemaAcervo> {
    if (!this.esquemaPromise) {
      this.esquemaPromise = this.descobrirEsquema().catch((erro) => {
        this.esquemaPromise = null;
        throw erro;
      });
    }

    return this.esquemaPromise;
  }

  private async descobrirEsquema(): Promise<EsquemaAcervo> {
    const placeholders = TABELAS_ACERVO.map(() => "?").join(", ");
    const linhas = await this.db.consultar<RowDataPacket>(
      `SELECT TABLE_NAME AS nome
         FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME IN (${placeholders})`,
      [...TABELAS_ACERVO]
    );

    return {
      tabelas: new Set(linhas.map((linha) => String(linha.nome))),
    };
  }

  private async linhas(esquema: EsquemaAcervo, tabela: (typeof TABELAS_ACERVO)[number]): Promise<Linha[]> {
    if (!esquema.tabelas.has(tabela)) {
      return [];
    }

    const registros = await this.db.consultar<RowDataPacket>(
      `SELECT * FROM ${nomeSeguro(tabela)}`
    );

    return registros.map((linha) => ({ ...linha }));
  }

  private ligarProcesso(capa: Linha, processos: Linha[], capaEhCaso: boolean): Linha | undefined {
    if (!capaEhCaso) {
      return capa;
    }

    const processoId = valorCampo(capa, ALIASES.processoId);
    if (processoId != null) {
      const porId = processos.find((processo) => String(valorCampo(processo, ALIASES.id)) === String(processoId));
      if (porId) {
        return porId;
      }
    }

    const cnj = cnjDigitos(valorCampo(capa, ALIASES.numeroCnj));
    if (cnj.length === 20) {
      return processos.find((processo) => cnjDigitos(valorCampo(processo, ALIASES.numeroCnj)) === cnj);
    }

    return undefined;
  }

  private ligarCliente(capa: Linha, processo: Linha | undefined, clientes: Linha[]): Linha | undefined {
    const clienteId = valorCampo(capa, ALIASES.clienteId) ?? valorCampo(processo, ALIASES.clienteId);
    if (clienteId != null) {
      const porId = clientes.find((cliente) => String(valorCampo(cliente, ALIASES.id)) === String(clienteId));
      if (porId) {
        return porId;
      }
    }

    const casoId = String(valorCampo(capa, ALIASES.id) ?? "");
    const processoId = String(
      valorCampo(processo, ALIASES.id) ?? valorCampo(capa, ALIASES.processoId) ?? ""
    );
    const cnj = cnjDigitos(
      valorCampo(processo, ALIASES.numeroCnj) ?? valorCampo(capa, ALIASES.numeroCnj)
    );

    return clientes.find((cliente) => {
      const cid = valorCampo(cliente, ALIASES.casoId);
      const pid = valorCampo(cliente, ALIASES.processoId);
      const rcnj = cnjDigitos(valorCampo(cliente, ALIASES.numeroCnj));

      return (
        (cid != null && String(cid) === casoId) ||
        (pid != null && processoId && String(pid) === processoId) ||
        (rcnj.length === 20 && rcnj === cnj)
      );
    });
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
