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
    descricao: "Roteiro interno; se colar cláusula do cliente, use SafeDTO antes do linked-provider.",
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
    titulo: "MCP escritório (export MCP)",
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
    id: "tool-whatsapp-aviso-prazo",
    kind: "tool",
    area: "bancario",
    titulo: "Modelo tpl-aviso-prazo",
    descricao:
      "Aviso fixo de prazo para o Zap, sem dado pessoal livre (sem nome, e-mail, CPF ou telefone no texto). Passa pelo mesmo desafio humano.",
    requerSafeDto: false,
    endpoint: "/api/whatsapp/enviar",
  },
  {
    id: "tool-datajud",
    kind: "tool",
    area: "bancario",
    titulo: "DataJud",
    descricao:
      "Futura ferramenta ProcessSource somente-leitura (capa/metadados). Não é app. Ainda não conectada.",
    requerSafeDto: false,
  },
  {
    id: "tool-djen",
    kind: "tool",
    area: "bancario",
    titulo: "DJEN",
    descricao:
      "Futura ferramenta ProcessSource somente-leitura (intimações/publicações). Não é app. Ainda não conectada.",
    requerSafeDto: false,
  },
  {
    id: "tool-prazo-cpc",
    kind: "tool",
    area: "bancario",
    titulo: "Prazo CPC",
    descricao:
      "Dias úteis do CPC art. 219, sem o dia inicial e sem feriados forenses. Sem LLM.",
    requerSafeDto: false,
    endpoint: "/api/tools/prazo-cpc",
  },
  {
    id: "runtime-office-hosted",
    kind: "tool",
    area: "bancario",
    titulo: "Office-hosted AI",
    descricao:
      "Hub base cobre prazo e processo sem modelo. Hub com consulta local acrescenta a resposta citada quando OFFICE_HOSTED_AI inclui o escritório. O modelo só reescreve trechos já citados.",
    requerSafeDto: false,
    endpoint: "/api/rag/consult",
  },
  {
    id: "runtime-linked-provider",
    kind: "mcp",
    area: "bancario",
    titulo: "Linked provider (MCP)",
    descricao:
      "Provedor ligado pelo usuário, com saída só por SafeDTO. Permanece desligado até o DPA. Esta versão não chama o provedor.",
    requerSafeDto: true,
  },
];
