import { readFileSync } from "fs";
import type { PoolOptions } from "mysql2/promise";

export type DbEnvConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl: boolean;
  sslCa?: string;
};

function lido(nome: string): string | undefined {
  const valor = process.env[nome];
  if (valor === undefined) {
    return undefined;
  }

  const limpo = valor.trim();
  return limpo.length ? limpo : undefined;
}

export function lerDbEnv(): DbEnvConfig | null {
  const host = lido("DB_HOST");
  const user = lido("DB_USERNAME");
  const database = lido("DB_DATABASE");

  if (!host || !user || !database) {
    return null;
  }

  const port = parseInt(lido("DB_PORT") || "4000", 10);
  const sslPadrao = port === 4000 ? "true" : "false";
  const ssl = (lido("DB_SSL") || sslPadrao) !== "false";

  return {
    host,
    port,
    user,
    password: process.env.DB_PASSWORD ?? "",
    database,
    ssl,
    sslCa: lido("DB_SSL_CA"),
  };
}

export function opcoesPool(env: DbEnvConfig): PoolOptions {
  const opcoes: PoolOptions = {
    host: env.host,
    port: env.port,
    user: env.user,
    password: env.password,
    database: env.database,
    waitForConnections: true,
    connectionLimit: 10,
    enableKeepAlive: true,
    timezone: "Z",
  };

  if (env.ssl) {
    opcoes.ssl = {
      minVersion: "TLSv1.2",
      rejectUnauthorized: lido("DB_SSL_REJECT_UNAUTHORIZED") !== "false",
    };

    if (env.sslCa) {
      opcoes.ssl.ca = readFileSync(env.sslCa);
    }
  }

  return opcoes;
}
