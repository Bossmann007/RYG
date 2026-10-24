export type CatalogItemKind = "prompt" | "skill" | "mcp" | "tool";

export type CatalogItem = {
  id: string;
  kind: CatalogItemKind;
  area: "bancario";
  titulo: string;
  descricao: string;
  /** When true, private client data must pass SafeDTO before external LLM egress. */
  requerSafeDto: boolean;
  corpo?: string;
  endpoint?: string;
};

/** Small v0 backstage catalog — banking only. Not a full eng Backstage clone. */
export const CATALOGO_BANCARIO: CatalogItem[] = [
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
];
