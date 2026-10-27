/**
 * Applies migrations/20261026_workspace_dm.sql and seeds one demo DM
 * between demo-socio and demo-advogado. Safe to re-run.
 *
 *   pnpm --dir server run build
 *   node server/scripts/apply-workspace-dm.js
 */
require("../dist/register-aliases");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const mysql = require("mysql2/promise");
const { lerDbEnv, opcoesPool } = require("../dist/config/db.config");
const { USUARIOS_POR_TOKEN } = require("../dist/fixtures/usuarios");

const SEED_A = "demo-socio";
const SEED_B = "demo-advogado";

function parOrdenado(a, b) {
  return a < b ? [a, b] : [b, a];
}

async function main() {
  const env = lerDbEnv();
  if (!env) {
    throw new Error("DB_* not configured");
  }

  const pool = mysql.createPool(opcoesPool(env));
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, "../migrations/20261026_workspace_dm.sql"),
      "utf8",
    );
    const comandos = sql
      .split("\n")
      .filter((linha) => !linha.trim().startsWith("--"))
      .join("\n")
      .split(";")
      .map((comando) => comando.trim())
      .filter(Boolean);

    for (const comando of comandos) {
      await pool.query(comando);
    }
    console.log("workspace_dm: tables ready");

    const usuarioA = USUARIOS_POR_TOKEN[SEED_A];
    const usuarioB = USUARIOS_POR_TOKEN[SEED_B];
    if (!usuarioA || !usuarioB) {
      throw new Error("seed fixtures missing");
    }
    if (usuarioA.escritorio !== usuarioB.escritorio) {
      throw new Error("seed users must share office");
    }

    const officeId = usuarioA.escritorio;
    const [userA, userB] = parOrdenado(usuarioA.id, usuarioB.id);
    const [existentes] = await pool.query(
      `SELECT channel_id FROM workspace_dm_pairs
        WHERE office_id = ? AND user_a = ? AND user_b = ? LIMIT 1`,
      [officeId, userA, userB],
    );

    if (existentes.length) {
      console.log(`seed DM already present channel=${existentes[0].channel_id}`);
      return;
    }

    const channelId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO workspace_channels (id, office_id, kind, title)
       VALUES (?, ?, 'dm', NULL)`,
      [channelId, officeId],
    );
    await pool.query(
      `INSERT INTO workspace_channel_members (channel_id, office_id, user_id)
       VALUES (?, ?, ?), (?, ?, ?)`,
      [channelId, officeId, usuarioA.id, channelId, officeId, usuarioB.id],
    );
    await pool.query(
      `INSERT INTO workspace_dm_pairs (office_id, user_a, user_b, channel_id)
       VALUES (?, ?, ?, ?)`,
      [officeId, userA, userB, channelId],
    );
    console.log(`seed DM created channel=${channelId} ${SEED_A}<->${SEED_B}`);
  } finally {
    await pool.end();
  }
}

main().catch((erro) => {
  console.error(`apply-workspace-dm failed: ${erro.code || erro.message}`);
  process.exit(1);
});
