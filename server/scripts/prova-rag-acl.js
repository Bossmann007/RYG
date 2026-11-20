/**
 * Proves rag_chunks ACL: empty office throws before a rag SELECT, and an
 * office-a query returns only office-a. Leaves the table. Deletes only the
 * two prova rows. Prints one OK line.
 *
 *   node server/scripts/prova-rag-acl.js
 */
require("../dist/register-aliases");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const mysql = require("mysql2/promise");
const { lerDbEnv, opcoesPool } = require("../dist/config/db.config");
const { montarConsultaRag, ligarVetorRag } = require("../dist/modules/rag/rag-query");

const ID_A = "prova-rag-acl-a";
const ID_B = "prova-rag-acl-b";
const ID_C = "prova-rag-acl-c";
const ID_OK = "prova-rag-acl-ok-chunk";
const ID_MURO = "prova-rag-acl-muro-chunk";
const CASO_OK = "910000001";
const CASO_MURO = "910000002";
const ACESSO =
  " AND (case_id IS NULL OR (case_id IN (SELECT m.caso_id FROM case_memberships m INNER JOIN casos c ON c.id = m.caso_id AND c.office_id = m.office_id WHERE m.office_id = ? AND m.user_id = ? AND (? = 'socio' OR c.classification IN ('publico', 'interno'))) AND NOT EXISTS (SELECT 1 FROM case_parties muro INNER JOIN case_memberships mm ON mm.office_id = muro.office_id AND mm.caso_id = muro.caso_id AND mm.user_id = ? INNER JOIN case_parties outro ON outro.office_id = muro.office_id AND outro.caso_id = rag_chunks.case_id AND outro.caso_id <> muro.caso_id AND ((muro.side = 'client' AND outro.side = 'adverse' AND outro.name_key = muro.name_key) OR (muro.side = 'adverse' AND outro.side = 'client' AND outro.name_key = muro.name_key)))))";
const SQL_SEM_CASO =
  "SELECT id, doc_id, snippet, VEC_COSINE_DISTANCE(embedding, ?) AS distance FROM rag_chunks WHERE office_id = ? AND embed_tag = ?" +
  ACESSO +
  " ORDER BY VEC_COSINE_DISTANCE(embedding, ?) LIMIT 8";
const SQL_COM_CASO =
  "SELECT id, doc_id, snippet, VEC_COSINE_DISTANCE(embedding, ?) AS distance FROM rag_chunks WHERE office_id = ? AND case_id = ? AND embed_tag = ?" +
  ACESSO +
  " ORDER BY VEC_COSINE_DISTANCE(embedding, ?) LIMIT 8";
const SISTEMA = new Set([
  "sys",
  "mysql",
  "information_schema",
  "performance_schema",
  "metrics_schema",
]);

function vetor(posicao) {
  const valores = new Array(768).fill(0);
  valores[posicao] = 1;
  return "[" + valores.join(",") + "]";
}

function comandosMigration() {
  const sql = fs.readFileSync(
    path.join(__dirname, "../migrations/20261011_rag_chunks.sql"),
    "utf8",
  );
  return sql
    .split("\n")
    .filter((linha) => !linha.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((comando) => comando.trim())
    .filter(Boolean);
}

async function main() {
  const env = lerDbEnv();
  if (!env) {
    throw new Error("DB_* not configured");
  }

  const vetorA = vetor(0);
  const vetorB = vetor(1);
  if (vetorA === vetorB || JSON.parse(vetorA).length !== 768 || JSON.parse(vetorB).length !== 768) {
    throw new Error("vector fixture");
  }

  const pool = mysql.createPool(opcoesPool(env));
  let ragSelects = 0;
  const consultar = pool.query.bind(pool);
  pool.query = function (sql, params) {
    if (typeof sql === "string" && /^\s*SELECT\b/i.test(sql) && /\brag_chunks\b/i.test(sql)) {
      ragSelects += 1;
    }
    return consultar(sql, params);
  };

  let inseriu = false;
  try {
    const [[atual]] = await pool.query("SELECT DATABASE() AS db");
    const nome = String(atual.db || "");
    if (!nome || SISTEMA.has(nome.toLowerCase())) {
      throw new Error("refusing to run on a system schema");
    }

    const [probe] = await pool.query(
      `SELECT COUNT(*) AS n FROM information_schema.tables
        WHERE table_schema = DATABASE() AND table_name = ?`,
      ["rag_vector_probe"],
    );
    if (Number(probe[0].n) > 0) {
      throw new Error("rag_vector_probe exists");
    }

    for (const comando of comandosMigration()) {
      await pool.query(comando);
    }

    let lancou = false;
    try {
      montarConsultaRag({ officeId: "" });
    } catch (erro) {
      if (erro.message !== "acl ausente") {
        throw erro;
      }
      lancou = true;
    }
    if (!lancou) {
      throw new Error("empty office did not throw");
    }
    if (ragSelects !== 0) {
      throw new Error("SELECT ran before the ACL throw");
    }
    let semUsuario = false;
    try {
      montarConsultaRag({ officeId: "office-a", userId: "", papel: "socio" });
    } catch (erro) {
      if (erro.message !== "acl ausente") {
        throw erro;
      }
      semUsuario = true;
    }
    if (!semUsuario || ragSelects !== 0) {
      throw new Error("empty user did not throw before SQL");
    }

    const semCaso = montarConsultaRag({ officeId: "office-a", userId: "u-1", papel: "socio" });
    if (
      semCaso.sql !== SQL_SEM_CASO ||
      semCaso.params.length !== 6 ||
      semCaso.params[0] !== "office-a" ||
      semCaso.params[1] !== "embeddinggemma:300m" ||
      semCaso.params[2] !== "office-a" ||
      semCaso.params[3] !== "u-1" ||
      semCaso.params[4] !== "socio" ||
      semCaso.params[5] !== "u-1"
    ) {
      throw new Error("office sql shape");
    }
    if (semCaso.sql.includes("office-a")) {
      throw new Error("office id was concatenated");
    }
    const onde = semCaso.sql.indexOf("WHERE office_id = ?");
    const ordem = semCaso.sql.indexOf("ORDER BY VEC_COSINE_DISTANCE(embedding, ?)");
    if (onde < 0 || ordem < 0 || onde > ordem) {
      throw new Error("WHERE is not before distance");
    }

    const comCaso = montarConsultaRag({
      officeId: "office-a",
      userId: "u-1",
      papel: "socio",
      caseId: "caso-1",
    });
    if (
      comCaso.sql !== SQL_COM_CASO ||
      comCaso.params[0] !== "office-a" ||
      comCaso.params[1] !== "caso-1" ||
      comCaso.params[2] !== "embeddinggemma:300m" ||
      comCaso.params[4] !== "u-1" ||
      comCaso.params[5] !== "socio" ||
      comCaso.params[6] !== "u-1"
    ) {
      throw new Error("case sql shape");
    }

    await pool.query("DELETE FROM rag_chunks WHERE id IN (?, ?, ?)", [ID_A, ID_B, ID_C]);
    await pool.query(
      `INSERT INTO rag_chunks
        (id, office_id, case_id, doc_id, snippet, embed_tag, embed_digest, embedding)
       VALUES (?, ?, NULL, ?, ?, ?, ?, ?), (?, ?, NULL, ?, ?, ?, ?, ?)`,
      [
        ID_A,
        "office-a",
        "doc-a",
        "snippet-a",
        "embeddinggemma:300m",
        "85462619ee72",
        vetorA,
        ID_B,
        "office-b",
        "doc-b",
        "snippet-b",
        "embeddinggemma:300m",
        "85462619ee72",
        vetorB,
      ],
    );
    await pool.query(
      `INSERT INTO rag_chunks
        (id, office_id, case_id, doc_id, snippet, embed_tag, embed_digest, embedding)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [ID_C, "office-a", "caso-fechado", "doc-c", "snippet-c", "embeddinggemma:300m", "85462619ee72", vetorA],
    );
    inseriu = true;

    const [linhas] = await pool.query(semCaso.sql, ligarVetorRag(semCaso, vetorA));
    if (linhas.length !== 1 || linhas[0].id !== ID_A || linhas[0].doc_id !== "doc-a" || linhas[0].snippet !== "snippet-a") {
      throw new Error("office filter returned the wrong row");
    }
    if (linhas.some((linha) => linha.id === ID_C)) {
      throw new Error("case chunk without membership was returned");
    }

    await pool.query("DELETE FROM case_parties WHERE caso_id IN (?, ?)", [CASO_OK, CASO_MURO]);
    await pool.query("DELETE FROM case_memberships WHERE caso_id IN (?, ?)", [CASO_OK, CASO_MURO]);
    await pool.query("DELETE FROM casos WHERE id IN (?, ?)", [CASO_OK, CASO_MURO]);
    await pool.query("DELETE FROM rag_chunks WHERE id IN (?, ?)", [ID_OK, ID_MURO]);
    await pool.query(
      "INSERT INTO casos (id, titulo, cliente_nome, office_id, status, classification) VALUES (?, ?, ?, 'office-a', 'intake', 'interno'), (?, ?, ?, 'office-a', 'intake', 'interno')",
      [CASO_OK, "alfa", "alfa", CASO_MURO, "beta", "beta"],
    );
    await pool.query(
      "INSERT INTO case_memberships (office_id, caso_id, user_id, role) VALUES ('office-a', ?, 'u-1', 'socio'), ('office-a', ?, 'u-1', 'socio'), ('office-a', ?, 'u-2', 'socio')",
      [CASO_OK, CASO_MURO, CASO_OK],
    );
    await pool.query(
      "INSERT INTO case_parties (office_id, caso_id, side, name_key) VALUES ('office-a', ?, 'client', 'alfa'), ('office-a', ?, 'adverse', 'beta'), ('office-a', ?, 'client', 'beta'), ('office-a', ?, 'adverse', 'gama')",
      [CASO_OK, CASO_OK, CASO_MURO, CASO_MURO],
    );
    await pool.query(
      `INSERT INTO rag_chunks
        (id, office_id, case_id, doc_id, snippet, embed_tag, embed_digest, embedding)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ID_OK, "office-a", CASO_OK, "doc-ok", "snippet-ok", "embeddinggemma:300m", "85462619ee72", vetorA,
        ID_MURO, "office-a", CASO_MURO, "doc-muro", "snippet-muro", "embeddinggemma:300m", "85462619ee72", vetorA,
      ],
    );
    const muro = montarConsultaRag({ officeId: "office-a", userId: "u-1", papel: "socio" });
    const [comMuro] = await pool.query(muro.sql, ligarVetorRag(muro, vetorA));
    if (comMuro.some((linha) => linha.id === ID_OK || linha.id === ID_MURO)) {
      throw new Error("conflicting case chunk was returned");
    }
    const limpo = montarConsultaRag({ officeId: "office-a", userId: "u-2", papel: "socio" });
    const [semMuro] = await pool.query(limpo.sql, ligarVetorRag(limpo, vetorA));
    if (!semMuro.some((linha) => linha.id === ID_OK) || semMuro.some((linha) => linha.id === ID_MURO)) {
      throw new Error("wall hid the case the user can read");
    }
    console.log("assert: opposing case parties stay out of the query");

    console.log("prova-rag-acl OK");
  } finally {
    if (inseriu) {
      await pool.query("DELETE FROM case_parties WHERE caso_id IN (?, ?)", [CASO_OK, CASO_MURO]);
      await pool.query("DELETE FROM case_memberships WHERE caso_id IN (?, ?)", [CASO_OK, CASO_MURO]);
      await pool.query("DELETE FROM casos WHERE id IN (?, ?)", [CASO_OK, CASO_MURO]);
      await pool.query("DELETE FROM rag_chunks WHERE id IN (?, ?, ?, ?, ?)", [ID_A, ID_B, ID_C, ID_OK, ID_MURO]);
    }
    await pool.end();
  }
}

main().catch((erro) => {
  console.error(erro.code || erro.message);
  process.exit(1);
});
