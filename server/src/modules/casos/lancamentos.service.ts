import { IdentidadeRequisicao } from "@common/guards/identity.guard";
import { RegistroAuditoria } from "@models/gateway.model";
import { DbService, tabelaAusente } from "@modules/db/db.service";
import { AuditService } from "@modules/gateway/audit.service";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { randomBytes } from "crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { CasosService } from "./casos.service";

const KINDS_LANCAVEIS = ["honorario", "custa"] as const;
const STATUS = ["rascunho", "lancado"] as const;
const DESCRICAO_MAX = 160;

type KindLancavel = (typeof KINDS_LANCAVEIS)[number];
export type KindLancamento = KindLancavel | "fatura";
export type StatusLancamento = (typeof STATUS)[number];

export type Lancamento = {
  id: string;
  kind: KindLancamento;
  descricao: string;
  centavos: number;
  status: StatusLancamento;
  faturaId: string | null;
  createdBy: string;
  createdAt: string;
};

type Entrada = {
  kind: KindLancavel;
  descricao: string;
  centavos: number;
  status: StatusLancamento;
};

const COLUNAS = "id, kind, descricao, centavos, status, fatura_id, created_by, created_at";

function lerEntrada(corpo: unknown): Entrada {
  const bruto = (corpo ?? {}) as Record<string, unknown>;
  if (!KINDS_LANCAVEIS.includes(bruto.kind as KindLancavel)) {
    throw new BadRequestException("kind deve ser honorario ou custa.");
  }
  const descricao = typeof bruto.descricao === "string" ? bruto.descricao.trim() : "";
  if (!descricao || descricao.length > DESCRICAO_MAX) {
    throw new BadRequestException(`descricao deve ter de 1 a ${DESCRICAO_MAX} caracteres.`);
  }
  if (typeof bruto.centavos !== "number" || !Number.isSafeInteger(bruto.centavos) || bruto.centavos < 0) {
    throw new BadRequestException("centavos deve ser um inteiro maior ou igual a zero.");
  }
  const status = bruto.status === undefined ? "rascunho" : bruto.status;
  if (!STATUS.includes(status as StatusLancamento)) {
    throw new BadRequestException("status deve ser rascunho ou lancado.");
  }
  return {
    kind: bruto.kind as KindLancavel,
    descricao,
    centavos: bruto.centavos,
    status: status as StatusLancamento,
  };
}

function comoLancamento(linha: RowDataPacket): Lancamento {
  const criado = linha.created_at instanceof Date ? linha.created_at : new Date(linha.created_at);
  return {
    id: String(linha.id),
    kind: linha.kind as KindLancamento,
    descricao: String(linha.descricao),
    centavos: Number(linha.centavos),
    status: linha.status as StatusLancamento,
    faturaId: linha.fatura_id == null ? null : String(linha.fatura_id),
    createdBy: String(linha.created_by),
    createdAt: criado.toISOString(),
  };
}

function emAberto(lancamento: Lancamento): boolean {
  return lancamento.kind !== "fatura" && lancamento.status === "lancado" && lancamento.faturaId === null;
}

function novoId(): string {
  return `lan_${randomBytes(8).toString("hex")}`;
}

/** ADR 0006: one case ledger. Reads follow the capa gate, writes are socio only, audit before commit. */
@Injectable()
export class LancamentosService {
  constructor(
    private readonly db: DbService,
    private readonly casos: CasosService,
    private readonly audit: AuditService,
  ) {}

  async listar(
    identidade: IdentidadeRequisicao,
    idOrCnj: string,
  ): Promise<{ lancamentos: Lancamento[]; abertoCentavos: number; podeLancar: boolean }> {
    const casoId = await this.casos.autorizarCapa(identidade, idOrCnj);
    const linhas = await this.protegido(() =>
      this.db.consultar<RowDataPacket>(
        `SELECT ${COLUNAS} FROM caso_lancamentos
          WHERE office_id = ? AND caso_id = ?
          ORDER BY created_at ASC, id ASC`,
        [identidade.officeId, casoId],
      ),
    );
    const lancamentos = linhas.map(comoLancamento);
    return {
      lancamentos,
      abertoCentavos: lancamentos.filter(emAberto).reduce((soma, item) => soma + item.centavos, 0),
      podeLancar: identidade.papel === "socio",
    };
  }

  async criar(identidade: IdentidadeRequisicao, idOrCnj: string, corpo: unknown): Promise<Lancamento> {
    const casoId = await this.exigirSocio(identidade, idOrCnj);
    const entrada = lerEntrada(corpo);
    const id = novoId();
    return this.protegido(() =>
      this.db.transacao(async (connection) => {
        await connection.query(
          `INSERT INTO caso_lancamentos
             (id, office_id, caso_id, kind, descricao, centavos, status, fatura_id, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
          [id, identidade.officeId, casoId, entrada.kind, entrada.descricao, entrada.centavos, entrada.status, identidade.id],
        );
        await this.auditar(identidade, "permitido", "lancamento criado", {
          casoId,
          lancamentoId: id,
          kind: entrada.kind,
          centavos: entrada.centavos,
        });
        return this.lerUm(connection, identidade.officeId, casoId, id);
      }),
    );
  }

  async substituir(
    identidade: IdentidadeRequisicao,
    idOrCnj: string,
    lancamentoId: string,
    corpo: unknown,
  ): Promise<Lancamento> {
    const casoId = await this.exigirSocio(identidade, idOrCnj);
    const entrada = lerEntrada(corpo);
    return this.protegido(() =>
      this.db.transacao(async (connection) => {
        const [linhas] = await connection.query<RowDataPacket[]>(
          `SELECT kind, status, fatura_id, created_by FROM caso_lancamentos
            WHERE id = ? AND office_id = ? AND caso_id = ? LIMIT 1 FOR UPDATE`,
          [lancamentoId, identidade.officeId, casoId],
        );
        const atual = linhas[0];
        if (!atual) {
          throw new NotFoundException("Lançamento não encontrado.");
        }
        if (atual.status !== "rascunho" || atual.fatura_id != null || atual.kind === "fatura") {
          throw new ConflictException("Lançamento lançado ou faturado é imutável.");
        }
        if (String(atual.created_by) !== identidade.id) {
          throw new ForbiddenException("Só o sócio que criou o rascunho pode substituí-lo.");
        }
        await connection.query(
          `UPDATE caso_lancamentos SET kind = ?, descricao = ?, centavos = ?, status = ?
            WHERE id = ? AND office_id = ? AND caso_id = ?`,
          [entrada.kind, entrada.descricao, entrada.centavos, entrada.status, lancamentoId, identidade.officeId, casoId],
        );
        await this.auditar(identidade, "permitido", "rascunho substituido", {
          casoId,
          lancamentoId,
          kind: entrada.kind,
          centavos: entrada.centavos,
        });
        return this.lerUm(connection, identidade.officeId, casoId, lancamentoId);
      }),
    );
  }

  /** ADR 0006 decision 4: sums open lancado honorario and custa rows, freezes them under one fatura row. */
  async faturar(identidade: IdentidadeRequisicao, idOrCnj: string): Promise<Lancamento> {
    const casoId = await this.exigirSocio(identidade, idOrCnj);
    const id = novoId();
    return this.protegido(() =>
      this.db.transacao(async (connection) => {
        const [linhas] = await connection.query<RowDataPacket[]>(
          `SELECT id, centavos FROM caso_lancamentos
            WHERE office_id = ? AND caso_id = ? AND kind IN ('honorario', 'custa')
              AND status = 'lancado' AND fatura_id IS NULL
            FOR UPDATE`,
          [identidade.officeId, casoId],
        );
        if (!linhas.length) {
          throw new BadRequestException("Nenhum lançamento em aberto para faturar.");
        }
        const total = linhas.reduce((soma, linha) => soma + Number(linha.centavos), 0);
        if (!Number.isSafeInteger(total)) {
          throw new BadRequestException("Soma da fatura fora do limite.");
        }
        const ids = linhas.map((linha) => String(linha.id));
        await connection.query(
          `INSERT INTO caso_lancamentos
             (id, office_id, caso_id, kind, descricao, centavos, status, fatura_id, created_by)
           VALUES (?, ?, ?, 'fatura', ?, ?, 'lancado', NULL, ?)`,
          [id, identidade.officeId, casoId, `Fatura de ${ids.length} lançamento(s)`, total, identidade.id],
        );
        await connection.query(
          `UPDATE caso_lancamentos SET fatura_id = ?
            WHERE office_id = ? AND caso_id = ? AND id IN (?)`,
          [id, identidade.officeId, casoId, ids],
        );
        await this.auditar(identidade, "permitido", "fatura gerada", {
          casoId,
          lancamentoId: id,
          kind: "fatura",
          centavos: total,
        });
        return this.lerUm(connection, identidade.officeId, casoId, id);
      }),
    );
  }

  private async exigirSocio(identidade: IdentidadeRequisicao, idOrCnj: string): Promise<string> {
    const casoId = await this.casos.autorizarCapa(identidade, idOrCnj);
    if (identidade.papel !== "socio") {
      await this.auditar(identidade, "negado", "papel sem permissão financeira", { casoId });
      throw new ForbiddenException("Só sócio lança valores no caso.");
    }
    return casoId;
  }

  private async lerUm(
    connection: PoolConnection,
    officeId: string,
    casoId: string,
    id: string,
  ): Promise<Lancamento> {
    const [linhas] = await connection.query<RowDataPacket[]>(
      `SELECT ${COLUNAS} FROM caso_lancamentos WHERE id = ? AND office_id = ? AND caso_id = ? LIMIT 1`,
      [id, officeId, casoId],
    );
    return comoLancamento(linhas[0]);
  }

  private async protegido<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (erro) {
      if (!(erro instanceof HttpException) && tabelaAusente(erro)) {
        throw new ServiceUnavailableException("Financeiro do caso indisponível. Operação recusada.");
      }
      throw erro;
    }
  }

  private auditar(
    identidade: IdentidadeRequisicao,
    decisao: RegistroAuditoria["decisao"],
    motivo: string,
    argumentos: { casoId: string; lancamentoId?: string; kind?: KindLancamento; centavos?: number },
  ): Promise<void> {
    return this.audit.registrar({
      at: new Date().toISOString(),
      identidade: identidade.id,
      nome: identidade.nome,
      papel: identidade.papel,
      origem: "hub",
      ferramenta: "caso_lancamento",
      argumentos,
      decisao,
      motivo,
      omitido: [],
      duracaoMs: 0,
    });
  }
}
