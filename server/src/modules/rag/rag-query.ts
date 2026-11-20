export const TAG_EMBED_RAG = "embeddinggemma:300m";
export const DIGEST_EMBED_RAG = "85462619ee72";

export type PedidoConsultaRag = {
  officeId: string;
  userId: string;
  papel: string;
  caseId?: string | null;
};

export type ConsultaRag = {
  sql: string;
  params: string[];
};

export type HitConsultaRag = {
  docId: string;
  snippet: string;
  distance: number;
};

export type RespostaConsultaRag = {
  citeStatus: "cited" | "silent";
  hits: HitConsultaRag[];
};

export function montarConsultaRag(pedido: PedidoConsultaRag): ConsultaRag {
  if (
    pedido == null ||
    typeof pedido.officeId !== "string" ||
    pedido.officeId.length === 0 ||
    typeof pedido.userId !== "string" ||
    pedido.userId.length === 0 ||
    typeof pedido.papel !== "string" ||
    pedido.papel.length === 0
  ) {
    throw new Error("acl ausente");
  }

  const params = [pedido.officeId];
  let filtro = "office_id = ?";
  if (pedido.caseId != null) {
    if (typeof pedido.caseId !== "string") {
      throw new Error("acl ausente");
    }
    filtro += " AND case_id = ?";
    params.push(pedido.caseId);
  }
  filtro += " AND embed_tag = ?";
  params.push(TAG_EMBED_RAG);
  filtro +=
    " AND (case_id IS NULL OR (case_id IN (SELECT m.caso_id FROM case_memberships m INNER JOIN casos c ON c.id = m.caso_id AND c.office_id = m.office_id WHERE m.office_id = ? AND m.user_id = ? AND (? = 'socio' OR c.classification IN ('publico', 'interno'))) AND NOT EXISTS (SELECT 1 FROM case_parties muro INNER JOIN case_memberships mm ON mm.office_id = muro.office_id AND mm.caso_id = muro.caso_id AND mm.user_id = ? INNER JOIN case_parties outro ON outro.office_id = muro.office_id AND outro.caso_id = rag_chunks.case_id AND outro.caso_id <> muro.caso_id AND ((muro.side = 'client' AND outro.side = 'adverse' AND outro.name_key = muro.name_key) OR (muro.side = 'adverse' AND outro.side = 'client' AND outro.name_key = muro.name_key)))))";
  params.push(pedido.officeId, pedido.userId, pedido.papel, pedido.userId);

  // Selecting id keeps TiDB from dropping embedding while it plans the distance.
  const sql =
    "SELECT id, doc_id, snippet, VEC_COSINE_DISTANCE(embedding, ?) AS distance FROM rag_chunks WHERE " +
    filtro +
    " ORDER BY VEC_COSINE_DISTANCE(embedding, ?) LIMIT 8";
  return { sql, params };
}

/** The cosine placeholders sit outside `params`. One is appended. Two means the SELECT list also takes the vector. */
export function ligarVetorRag(consulta: ConsultaRag, vetor: string): string[] {
  const faltam = consulta.sql.split("?").length - 1 - consulta.params.length;
  if (faltam === 1) {
    return consulta.params.concat(vetor);
  }
  if (faltam === 2) {
    return [vetor, ...consulta.params, vetor];
  }
  throw new Error("vetor");
}

export function respostaConsultaRag(
  linhas: ReadonlyArray<{ doc_id: unknown; snippet: unknown; distance: unknown }>,
): RespostaConsultaRag {
  const hits = linhas.slice(0, 8).map((linha) => ({
    docId: String(linha.doc_id),
    snippet: String(linha.snippet),
    distance: Number(linha.distance),
  }));
  return { citeStatus: hits.length > 0 ? "cited" : "silent", hits };
}
