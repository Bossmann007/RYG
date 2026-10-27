import { IdentidadeRequisicao } from "@common/guards/identity.guard";
import { DbService } from "@modules/db/db.service";
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { CalendarioPrazo, ResultadoPrazoCpc } from "./prazo-cpc";

export type PrazoKindPersist =
  | "manifestacao"
  | "recurso"
  | "prova"
  | "audiencia"
  | "interno"
  | "outro";

@Injectable()
export class PrazosService {
  constructor(private readonly db: DbService) {}

  async anexarAoCaso(
    identidade: IdentidadeRequisicao,
    casoId: string,
    calculo: ResultadoPrazoCpc,
    meta: { title: string; kind: PrazoKindPersist; notes?: string },
  ): Promise<{ prazoId: number; processoId: string }> {
    const capa = await this.db.consultar<
      RowDataPacket & { id: string | number; processo_id: string | number | null }
    >(
      `SELECT CAST(id AS CHAR) AS id, processo_id
         FROM casos
        WHERE CAST(id AS CHAR) = ? AND office_id = ?
        LIMIT 1`,
      [casoId, identidade.officeId],
    );
    if (!capa[0]) {
      throw new NotFoundException("Caso não encontrado.");
    }

    const membro = await this.db.consultar<RowDataPacket>(
      `SELECT 1 AS ok FROM case_memberships
        WHERE office_id = ? AND caso_id = ? AND user_id = ? LIMIT 1`,
      [identidade.officeId, String(capa[0].id), identidade.id],
    );
    if (!membro.length) {
      throw new ForbiddenException("Sem membership neste caso.");
    }

    const processoId = capa[0].processo_id;
    if (processoId === null || processoId === undefined || processoId === "") {
      throw new ServiceUnavailableException("Caso sem processo_id para anexar prazo.");
    }

    const status = statusInicial(calculo.dueAt);
    try {
      const resultado = await this.db.executar(
        `INSERT INTO prazos
          (processo_id, office_id, titulo, tipo, data_vencimento, data_inicio,
           quantidade_dias, contagem, status, responsavel, gatilho, gatilho_fonte, observacoes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'acervo_interno', ?)`,
        [
          processoId,
          identidade.officeId,
          meta.title.slice(0, 255),
          meta.kind,
          calculo.dueAt,
          calculo.startedAt,
          calculo.days,
          calculo.calendar,
          status,
          identidade.nome.slice(0, 255),
          `Contagem CPC (${calculo.calendar}, ${calculo.days}d) via tool prazo_cpc.`,
          meta.notes ? meta.notes.slice(0, 4000) : null,
        ],
      );
      return { prazoId: Number((resultado as ResultSetHeader).insertId), processoId: String(processoId) };
    } catch (erro) {
      if (tabelaAusente(erro)) {
        throw new ServiceUnavailableException(
          "Tabela prazos ausente. Rode pnpm --dir server run prazos:apply.",
        );
      }
      throw erro;
    }
  }
}

function statusInicial(dueAt: string): "aberto" | "a_vencer" | "vencido" {
  const hoje = new Date();
  const isoHoje = hoje.toISOString().slice(0, 10);
  if (dueAt < isoHoje) return "vencido";
  const limiar = new Date(`${isoHoje}T12:00:00.000Z`);
  limiar.setUTCDate(limiar.getUTCDate() + 7);
  if (dueAt <= limiar.toISOString().slice(0, 10)) return "a_vencer";
  return "aberto";
}

function tabelaAusente(erro: unknown): boolean {
  const db = erro as { code?: string; errno?: number };
  return db?.code === "ER_NO_SUCH_TABLE" || db?.errno === 1146;
}

export type { CalendarioPrazo };
