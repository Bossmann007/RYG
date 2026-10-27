export type CatalogItemKind = "prompt" | "skill" | "mcp" | "tool";

export type CatalogArea = "bancario" | "processual" | "conectores";

export type CatalogItem = {
  id: string;
  kind: CatalogItemKind;
  area: CatalogArea;
  titulo: string;
  descricao: string;
  /** When true, private client data must pass SafeDTO before external LLM egress. */
  requerSafeDto: boolean;
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
    endpoint: "/api/whatsapp/enviar",
  },
  {
    id: "tool-datajud-capa",
    kind: "tool",
    area: "conectores",
    titulo: "datajud_capa",
    descricao:
      "Conector DataJud (read-only) via ProcessSource=datajud — tool de capa, não app. Adapter real ainda fail-closed até credencial.",
    requerSafeDto: false,
    endpoint: "/api/process/source",
  },
  {
    id: "tool-djen-publicacoes",
    kind: "tool",
    area: "conectores",
    titulo: "djen_publicacoes",
    descricao:
      "DJEN / publicações oficiais como tool de ingestão (sibling claude-legal-br). Sem scrape Jusbrasil/PJe.",
    requerSafeDto: false,
    endpoint: "/api/process/source",
  },
  {
    id: "tool-process-source-manual",
    kind: "tool",
    area: "processual",
    titulo: "process_source_manual",
    descricao: "Registra capa manual no hub (PROCESS_SOURCE=manual). Sem LLM.",
    requerSafeDto: false,
    endpoint: "/api/process/manual",
  },
  {
    id: "tool-prazo-cpc",
    kind: "tool",
    area: "processual",
    titulo: "prazo_cpc",
    descricao:
      "Contagem determinística CPC (úteis/corridos). Script legalops no hub — sem modelo.",
    requerSafeDto: false,
    endpoint: "/api/tools/prazo-cpc",
  },
  {
    id: "tool-capa-processo",
    kind: "tool",
    area: "processual",
    titulo: "capa_processo",
    descricao: "GET capa via ProcessSource ativo (fixture | manual | …).",
    requerSafeDto: false,
    endpoint: "/api/process/capa/:cnj",
  },
];

/** @deprecated Prefer CATALOGO_BACKSTAGE — alias kept for short diffs. */
export const CATALOGO_BANCARIO = CATALOGO_BACKSTAGE;
