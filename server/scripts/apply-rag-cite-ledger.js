/**
 * Applies migrations/20261028_rag_cite_ledger.sql. Safe to re-run.
 *
 *   pnpm --dir server run rag:apply
 */
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

async function main() {
  const host = process.env.DB_HOST;
  if (!host) {
    console.log("rag:apply skipped (DB_HOST unset)");
    return;
  }
  const sqlPath = path.join(__dirname, "../migrations/20261028_rag_cite_ledger.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  const conn = await mysql.createConnection({
    host,
    port: Number(process.env.DB_PORT || 4000),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "HubLegal",
    multipleStatements: true,
  });
  try {
    await conn.query(sql);
    console.log("rag_cite_ledger: ready");
  } finally {
    await conn.end();
  }
}

main().catch((erro) => {
  console.error(`apply-rag-cite-ledger failed: ${erro.code || erro.message}`);
  process.exit(1);
});
