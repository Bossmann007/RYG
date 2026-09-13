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
    if (!this.pool) {
      throw new ServiceUnavailableException(
        "Banco não configurado. Defina DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD e DB_DATABASE."
      );
    }

    const [linhas] = await this.pool.query<T[]>(sql, params);
    return linhas;
  }

  async executar(sql: string, params: unknown[] = []): Promise<ResultSetHeader> {
    if (!this.pool) {
      throw new ServiceUnavailableException(
        "Banco não configurado. Defina DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD e DB_DATABASE."
      );
    }

    const [resultado] = await this.pool.execute<ResultSetHeader>(sql, params);
    return resultado;
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
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
