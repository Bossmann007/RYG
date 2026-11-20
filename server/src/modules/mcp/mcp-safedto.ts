import { randomBytes } from "node:crypto";

type EgressApi = {
  validateSafeDto: (input: unknown) => { ok: true } | { ok: false; reason: string };
  releaseSafeDto: (
    input: unknown
  ) => { ok: true; wire: string; dto: unknown } | { ok: false; reason: string };
};

type Item = { id: string; text: string };
type Tarefa = { id: string; text: string; status: "open" | "done" };
type Referencia = { id: string; label: string; kind: "public_jurisprudence" };
type Aviso = { code: string; message: string };

type SafeWire = {
  schemaVersion: "1";
  sessionId: string;
  releaseId: string;
  summary: string;
  decisions: Item[];
  tasks: Tarefa[];
  safeReferences: Referencia[];
  warnings: Aviso[];
};

const LISTA = 5;
const CAMPO = 600;

let egresso: Promise<EgressApi> | null = null;

function carregar(): Promise<EgressApi> {
  if (!egresso) {
    const nome: string = "@openlegalai/privacy-gateway/egress";
    egresso = import(nome) as Promise<EgressApi>;
  }
  return egresso;
}

function cortar(valor: unknown, reserva: string): string {
  const texto = typeof valor === "string" ? valor.trim() : "";
  const escolhido = texto || reserva;
  return escolhido.slice(0, CAMPO);
}

function avisosDe(omitido: unknown): Aviso[] {
  if (!Array.isArray(omitido)) {
    return [];
  }
  return omitido
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .slice(0, LISTA)
    .map((message, indice) => ({ code: `omitted_${indice}`, message: message.slice(0, CAMPO) }));
}

function referenciasDe(itens: unknown): Referencia[] {
  if (!Array.isArray(itens)) {
    return [];
  }
  return itens.slice(0, LISTA).map((item, indice) => {
    const linha = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const tribunal = typeof linha.tribunal === "string" && linha.tribunal.trim() ? linha.tribunal.trim() : "publico";
    const sentido = typeof linha.sentido === "string" && linha.sentido.trim() ? linha.sentido.trim() : "indefinido";
    return {
      id: `ref_${indice}`,
      label: `${tribunal} ${sentido}`.slice(0, CAMPO),
      kind: "public_jurisprudence",
    };
  });
}

function tarefasDe(pontos: unknown): Tarefa[] {
  if (!Array.isArray(pontos)) {
    return [];
  }
  return pontos
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .slice(0, LISTA)
    .map((text, indice) => ({ id: `task_${indice}`, text: text.slice(0, CAMPO), status: "open" as const }));
}

function base(): Pick<SafeWire, "schemaVersion" | "sessionId" | "releaseId"> {
  return {
    schemaVersion: "1",
    sessionId: `ofs_${randomBytes(6).toString("hex")}`,
    releaseId: `rel_${randomBytes(6).toString("hex")}`,
  };
}

function mapear(envelope: { tipo?: string; conteudo?: unknown; declassificacao?: { omitido?: unknown } }): SafeWire | null {
  const conteudo =
    envelope.conteudo && typeof envelope.conteudo === "object"
      ? (envelope.conteudo as Record<string, unknown>)
      : {};
  const warnings = avisosDe(envelope.declassificacao?.omitido);
  const vazio = { decisions: [] as Item[], tasks: [] as Tarefa[], safeReferences: [] as Referencia[] };

  if (envelope.tipo === "office_manifest") {
    return {
      ...base(),
      summary: "Office session opened. Private context remains server-side.",
      ...vazio,
      warnings: [
        { code: "session_only", message: "No case body released on session lifecycle tools." },
      ],
    };
  }

  if (envelope.tipo === "case_summary") {
    return {
      ...base(),
      summary: cortar(conteudo.situacao, "Resumo do caso sem texto de partes."),
      decisions: [
        {
          id: "fase",
          text: cortar(`${conteudo.fase || ""} ${conteudo.orientacaoDoOrgao || ""}`, "fase"),
        },
      ],
      tasks: [],
      safeReferences: [],
      warnings,
    };
  }

  if (envelope.tipo === "knowledge_result") {
    const itens = Array.isArray(conteudo.itens) ? conteudo.itens : [];
    const extra =
      itens.length > LISTA
        ? [{ code: "truncated", message: "Lista limitada ao contrato de egress." }]
        : [];
    return {
      ...base(),
      summary: cortar(`Busca publica devolveu ${Number(conteudo.quantidade) || itens.length} precedentes.`, "Busca publica."),
      decisions: [],
      tasks: [],
      safeReferences: referenciasDe(itens),
      warnings: [...warnings, ...extra].slice(0, LISTA),
    };
  }

  if (envelope.tipo === "strategic_update") {
    return {
      ...base(),
      summary: cortar(conteudo.sintese, "Atualizacao sem faixa de risco."),
      decisions: [],
      tasks: tarefasDe(conteudo.recomendacao),
      safeReferences: [],
      warnings,
    };
  }

  return null;
}

function textos(valor: unknown, saida: string[]): void {
  if (typeof valor === "string") {
    saida.push(valor);
    return;
  }
  if (Array.isArray(valor)) {
    for (const item of valor) {
      textos(item, saida);
    }
    return;
  }
  if (valor && typeof valor === "object") {
    for (const item of Object.values(valor)) {
      textos(item, saida);
    }
  }
}

const SOBREPOSICAO = 64;

/** Sliding windows so a hard exclusion past CAMPO still hits the firewall. */
function janelas(texto: string): string[] {
  if (texto.length <= CAMPO) {
    return [texto];
  }
  const passo = CAMPO - SOBREPOSICAO;
  const saida: string[] = [];
  for (let i = 0; i < texto.length; i += passo) {
    saida.push(texto.slice(i, i + CAMPO));
    if (i + CAMPO >= texto.length) {
      break;
    }
  }
  return saida;
}

/** Package validator only. A hard exclusion refuses the call before any wire is built. */
export async function argumentoExcluido(argumentos: Record<string, unknown>): Promise<string | null> {
  const { validateSafeDto } = await carregar();
  const encontrados: string[] = [];
  textos(argumentos, encontrados);

  for (const texto of encontrados) {
    if (!texto.trim()) {
      continue;
    }
    for (const janela of janelas(texto)) {
      const sonda = {
        schemaVersion: "1",
        sessionId: "ofs_probe",
        releaseId: "rel_probe",
        summary: janela,
        decisions: [],
        tasks: [],
        safeReferences: [],
        warnings: [],
      };
      const veredito = validateSafeDto(sonda);
      if (veredito.ok === false && veredito.reason.startsWith("hard_exclusion:")) {
        return veredito.reason;
      }
    }
  }

  return null;
}

export type MetadadoRun = { releaseId: string; summary: string; citeStatus: "cited" | "silent" };

/** Run metadata for Xirp, taken from the released DTO and envelope. Never from tool arguments. */
export function metadadoDaRun(
  envelope: { tipo?: string; conteudo?: unknown },
  dto: unknown,
): MetadadoRun | null {
  const wire = dto && typeof dto === "object" ? (dto as Record<string, unknown>) : {};
  if (typeof wire.releaseId !== "string" || typeof wire.summary !== "string") {
    return null;
  }
  const conteudo =
    envelope.conteudo && typeof envelope.conteudo === "object"
      ? (envelope.conteudo as Record<string, unknown>)
      : {};
  const itens = envelope.tipo === "knowledge_result" && Array.isArray(conteudo.itens) ? conteudo.itens : [];
  const citavel = itens.some(
    (item) => !!item && typeof item === "object" && (item as Record<string, unknown>).citavel === true,
  );
  return { releaseId: wire.releaseId, summary: wire.summary, citeStatus: citavel ? "cited" : "silent" };
}

export async function liberarEnvelope(envelope: {
  tipo?: string;
  conteudo?: unknown;
  declassificacao?: { omitido?: unknown };
}): Promise<{ ok: true; wire: string; dto: unknown } | { ok: false; reason: string }> {
  const dto = mapear(envelope);
  if (!dto) {
    return { ok: false, reason: "unmapped_tool" };
  }
  const { releaseSafeDto } = await carregar();
  return releaseSafeDto(dto);
}
