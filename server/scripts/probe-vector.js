/**
 * Throwaway VECTOR probe. Creates rag_vector_probe, checks a WHERE-before-distance
 * query, then drops the table. Refuses a pre-existing table and system schemas.
 * Never prints host, user, or password.
 *
 *   node server/scripts/probe-vector.js
 */
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const mysql = require("mysql2/promise");

const TABELA = "rag_vector_probe";
const SISTEMA = new Set(["sys", "mysql", "information_schema", "performance_schema", "metrics_schema"]);

function lido(nome) {
  const valor = process.env[nome];
  if (valor === undefined) return undefined;
  const limpo = valor.trim();
  return limpo.length ? limpo : undefined;
}

function codigo(erro) {
  return erro && erro.code ? erro.code : "DB_ERROR";
}

async function main() {
  const host = lido("DB_HOST");
  const user = lido("DB_USERNAME");
  const database = lido("DB_DATABASE");
  if (!host || !user || !database) {
    throw new Error("DB_* not configured");
  }
  if (host.includes("example")) {
    throw new Error("DB_HOST is still the example placeholder");
  }

  const port = parseInt(lido("DB_PORT") || "4000", 10);
  const sslPadrao = port === 4000 ? "true" : "false";
  const ssl = (lido("DB_SSL") || sslPadrao) !== "false";
  const opcoes = {
    host,
    port,
    user,
    password: process.env.DB_PASSWORD ?? "",
    database,
    connectTimeout: 12000,
  };
  if (ssl) {
    opcoes.ssl = {
      minVersion: "TLSv1.2",
      rejectUnauthorized: lido("DB_SSL_REJECT_UNAUTHORIZED") !== "false",
    };
    const ca = lido("DB_SSL_CA");
    if (ca) opcoes.ssl.ca = fs.readFileSync(ca);
  }

  const pool = mysql.createPool(opcoes);
  let criou = false;
  try {
    try {
      await pool.query("SELECT 1");
    } catch (erro) {
      throw new Error(`TiDB unreachable: ${codigo(erro)}`);
    }

    const [[atual]] = await pool.query("SELECT DATABASE() AS db");
    const nome = String(atual.db || "");
    if (!nome || SISTEMA.has(nome.toLowerCase())) {
      throw new Error("refusing to run on a system schema");
    }

    let versao = "unknown";
    try {
      const [[v]] = await pool.query("SELECT VERSION() AS v");
      versao = String(v.v || "unknown");
    } catch (erro) {
      versao = `unread:${codigo(erro)}`;
    }

    try {
      await pool.query(
        `CREATE TABLE ${TABELA} (
           id INT PRIMARY KEY,
           office_id VARCHAR(64) NOT NULL,
           embedding VECTOR(3) NOT NULL
         )`,
      );
    } catch (erro) {
      if (erro.code === "ER_TABLE_EXISTS_ERROR") {
        throw new Error(`${TABELA} already exists; refusing to touch it`);
      }
      throw new Error(`CREATE VECTOR failed: ${codigo(erro)}`);
    }
    criou = true;

    await pool.query(
      `INSERT INTO ${TABELA} (id, office_id, embedding) VALUES (1, 'office-a', '[1,0,0]'), (2, 'office-b', '[0,1,0]')`,
    );
    const [linhas] = await pool.query(
      `SELECT id FROM ${TABELA} WHERE office_id = ? ORDER BY VEC_COSINE_DISTANCE(embedding, '[1,0,0]') LIMIT 1`,
      ["office-a"],
    );
    if (linhas.length !== 1 || linhas[0].id !== 1) {
      throw new Error("WHERE before distance returned the wrong row");
    }

    console.log(
      `probe-vector OK database=${nome} hubLegal=${nome === "HubLegal"} version=${versao} shape=where-before-cosine`,
    );
  } finally {
    if (criou) {
      await pool.query(`DROP TABLE ${TABELA}`);
    }
    await pool.end();
  }
}

main().catch((erro) => {
  console.error(erro.message);
  process.exit(1);
});
