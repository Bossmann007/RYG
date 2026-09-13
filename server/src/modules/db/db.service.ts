import { lerDbEnv, opcoesPool } from "@config/db.config";
import {
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  createPool,
  type Pool,
  type ResultSetHeader,
  type RowDataPacket,
} from "mysql2/promise";

@Injectable()
export class DbService implements OnModuleDestroy {
  private readonly pool: Pool | null;

  constructor() {
    const env = lerDbEnv();
    this.pool = env ? createPool(opcoesPool(env)) : null;
  }

  configurado(): boolean {
    return this.pool !== null;
  }

  async consultar<T extends RowDataPacket = RowDataPacket>(
    sql: string,
    params: unknown[] = []
  ): Promise<T[]> {
    const [linhas] = await this.consultarBanco<T[]>(sql, params);
    return linhas;
  }

  async executar(sql: string, params: unknown[] = []): Promise<ResultSetHeader> {
    const [resultado] = await this.consultarBanco<ResultSetHeader>(sql, params);
    return resultado;
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
    }
  }

  private async consultarBanco<T>(sql: string, params: unknown[]): Promise<[T, unknown]> {
    if (!this.pool) {
      throw new ServiceUnavailableException(
        "Banco não configurado. Defina DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD e DB_DATABASE."
      );
    }

    try {
      return (await this.pool.query(sql, params)) as [T, unknown];
    } catch (erro) {
      const codigo = (erro as { code?: string }).code;
      if (
        codigo === "ETIMEDOUT" ||
        codigo === "ECONNRESET" ||
        codigo === "PROTOCOL_CONNECTION_LOST"
      ) {
        return (await this.pool.query(sql, params)) as [T, unknown];
      }
      throw erro;
    }
  }
}

export function tabelaAusente(erro: unknown): boolean {
  const e = erro as { code?: string; errno?: number; message?: string };
  const msg = String(e.message || "");
  return (
    e.code === "ER_NO_SUCH_TABLE" ||
    e.errno === 1146 ||
    /doesn'?t exist/i.test(msg) ||
    /Unknown table/i.test(msg)
  );
}
