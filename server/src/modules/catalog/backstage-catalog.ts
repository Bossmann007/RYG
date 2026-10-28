export type CatalogItemKind = "prompt" | "skill" | "mcp" | "tool";

export type CatalogArea = "bancario" | "processual" | "conectores";

/** live = wired hub endpoint; stub = catalog pointer until adapter lands. */
export type CatalogToolStatus = "live" | "stub";

export type CatalogItem = {
  id: string;
  kind: CatalogItemKind;
  area: CatalogArea;
  titulo: string;
  descricao: string;
  /** When true, private client data must pass SafeDTO before external LLM egress. */
  requerSafeDto: boolean;
  /** Only meaningful for kind=tool. */
  status?: CatalogToolStatus;
  corpo?: string;
  endpoint?: string;
};

/**
 * Small v0 Backstage catalog — tools by practice area, not apps.
 * Export prompts keep requerSafeDto for linked-provider egress.
 */
export const CATALOGO_BACKSTAGE: CatalogItem[] = [
  {
    id: "prompt-capa-bancario",
    kind: "prompt",
    area: "bancario",
    titulo: "Resumo de capa (bancário)",
    descricao: "Pede capa CNJ + tese em bullets. Só metadados públicos / já no hub.",
    requerSafeDto: false,
    corpo:
      "Com base na capa do processo {{cnj}}, liste tribunal, órgão, fase e assuntos. Cite só o que estiver na capa. Sem inventar chance de êxito.",
  },
  {
    id: "prompt-checklist-revisao",
    kind: "prompt",
    area: "bancario",
    titulo: "Checklist revisão de contrato bancário",
    descricao: "Roteiro interno; se colar cláusula do cliente, use SafeDTO antes de linked-provider egress.",
    requerSafeDto: true,
    corpo:
      "Monte checklist de revisão para contrato bancário (tarifas, seguro, IOF, vencimento antecipado). Não peça PII além do necessário.",
  },
  {
    id: "skill-cite-or-silent",
    kind: "skill",
    area: "bancario",
    titulo: "Cite-or-silent",
    descricao: "Sem texto oficial da fonte, não inventa cite. Sem % de vitória.",
    requerSafeDto: false,
    corpo: "Regra: cite-or-silent. Jurimetria e win-rate fora do v0.",
  },
  {
    id: "mcp-office-export",
    kind: "mcp",
    area: "bancario",
    titulo: "MCP escritório (export linked-provider)",
    descricao: "Ferramentas get_safe_summary / search_safe_knowledge via /api/mcp.",
    requerSafeDto: true,
    endpoint: "/api/mcp",
  },
  {
    id: "tool-enviar-whatsapp",
    kind: "tool",
    area: "bancario",
    titulo: "enviar_whatsapp",
    descricao: "Envia aviso/doc pelo Zap. Não é inbox. Requer conexão OAuth.",
    requerSafeDto: false,
    status: "live",
    endpoint: "/api/whatsapp/enviar",
  },
  {
    id: "tool-process-source-status",
    kind: "tool",
    area: "processual",
    titulo: "process_source_status",
    descricao: "Informa ProcessSource ativo (fixture|manual|…) e se está configurado.",
    requerSafeDto: false,
    status: "live",
    endpoint: "/api/process/source",
  },
  {
    id: "tool-datajud-capa",
    kind: "tool",
    area: "conectores",
    titulo: "datajud_capa",
    descricao:
      "Stub de catálogo para conector DataJud read-only (PROCESS_SOURCE=datajud). Fail-closed até credencial.",
    requerSafeDto: false,
    status: "stub",
    endpoint: "/api/process/source",
  },
  {
    id: "tool-djen-publicacoes",
    kind: "tool",
    area: "conectores",
    titulo: "djen_publicacoes",
    descricao:
      "Stub de catálogo para DJEN (sibling claude-legal-br). Sem scrape Jusbrasil/PJe.",
    requerSafeDto: false,
    status: "stub",
    endpoint: "/api/process/source",
  },
  {
    id: "tool-process-source-manual",
    kind: "tool",
    area: "processual",
    titulo: "process_source_manual",
    descricao: "Registra capa manual no hub (PROCESS_SOURCE=manual), isolada por office_id. Sem LLM.",
    requerSafeDto: false,
    status: "live",
    endpoint: "/api/process/manual",
  },
  {
    id: "tool-prazo-cpc",
    kind: "tool",
    area: "processual",
    titulo: "prazo_cpc",
    descricao:
      "Contagem determinística CPC (úteis/corridos + art. 224). Script legalops no hub — sem modelo.",
    requerSafeDto: false,
    status: "live",
    endpoint: "/api/tools/prazo-cpc",
  },
  {
    id: "tool-capa-processo",
    kind: "tool",
    area: "processual",
    titulo: "capa_processo",
    descricao: "GET capa via ProcessSource ativo, scoped ao office do Bearer.",
    requerSafeDto: false,
    status: "live",
    endpoint: "/api/process/capa/:cnj",
  },
  {
    id: "tool-rag-consult-linked",
    kind: "tool",
    area: "conectores",
    titulo: "rag_consult_linked_provider",
    descricao:
      "Consult retrieval-only via linked-provider runtime. Pack de cites; sem tools de mutação.",
    requerSafeDto: true,
    status: "live",
    endpoint: "/api/rag/consult",
  },
  {
    id: "tool-rag-consult-office-hosted",
    kind: "tool",
    area: "conectores",
    titulo: "rag_consult_office_hosted",
    descricao:
      "Consult retrieval-only no runtime office-hosted (flag OFFICE_HOSTED_AI). Sem BYOAI.",
    requerSafeDto: false,
    status: "live",
    endpoint: "/api/rag/consult",
  },
];

/** @deprecated Prefer CATALOGO_BACKSTAGE — alias kept for short diffs. */
export const CATALOGO_BANCARIO = CATALOGO_BACKSTAGE;
