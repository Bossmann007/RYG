import { CASOS } from "./dados";
import { hidratarPrazos } from "./prazos-escritorio";
import { Caso, Documento, Mensagem } from "./tipos";

type ListaCasosResposta = {
  zone?: string;
  casos?: Caso[];
  erro?: string;
};

type CasoResposta = {
  zone?: string;
  caso?: Caso;
  erro?: string;
};

export type RecursoAba =
  | "peticoes"
  | "contratos"
  | "clientes"
  | "decisoes"
  | "modelos";

type FiltroAba = {
  casoId: string;
  processNumber: string;
};

const CAMINHO_ABA: Record<RecursoAba, string> = {
  peticoes: "/api/peticoes",
  contratos: "/api/contratos",
  clientes: "/api/clientes",
  decisoes: "/api/decisoes",
  modelos: "/api/modelos",
};

function baseUrl(): string {
  const bruto = import.meta.env.VITE_API_URL;
  if (!bruto) {
    return "";
  }

  return String(bruto).replace(/\/$/, "");
}

export function cabecalhoHub(): HeadersInit {
  const token = import.meta.env.VITE_HUB_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** 401/403 must reach the UI: falling back to local CASOS would reopen the hub. */
class AcessoNegadoError extends Error {}

async function exigirOk(resposta: Response): Promise<void> {
  if (resposta.status === 401 || resposta.status === 403) {
    throw new AcessoNegadoError(await lerErro(resposta));
  }
  if (!resposta.ok) {
    throw new Error(await lerErro(resposta));
  }
}

function queryAba(filtro: FiltroAba): string {
  const params = new URLSearchParams();
  params.set("casoId", filtro.casoId);
  params.set("processNumber", filtro.processNumber);
  return params.toString();
}

async function lerErro(resposta: Response): Promise<string> {
  try {
    const corpo = (await resposta.json()) as { erro?: string };
    if (corpo.erro) {
      return String(corpo.erro);
    }
  } catch {
    /* corpo vazio ou não-JSON */
  }

  return `Falha ao ler o acervo (${resposta.status}).`;
}

function comoDocumento(item: Record<string, unknown>, indice: number): Documento {
  return {
    id: String(item.id ?? indice),
    titulo: String(item.titulo ?? item.title ?? item.displayName ?? ""),
    tipo: String(item.tipo ?? item.kind ?? item.papel ?? ""),
    data: String(item.data ?? item.filedAt ?? item.decidedAt ?? item.updatedAt ?? ""),
    origem: String(item.origem ?? item.court ?? "Acervo interno"),
    resumo: String(item.resumo ?? item.summary ?? item.notes ?? ""),
    corpo: item.corpo || item.body ? String(item.corpo ?? item.body) : undefined,
  };
}

export async function listarCasos(): Promise<Caso[]> {
  try {
    const resposta = await fetch(`${baseUrl()}/api/casos`, { headers: cabecalhoHub() });
    await exigirOk(resposta);

    const corpo = (await resposta.json()) as ListaCasosResposta;

    if (corpo.zone !== "internal" || !Array.isArray(corpo.casos)) {
      throw new Error("Resposta inválida do acervo interno.");
    }

    return corpo.casos.map((caso) => hidratarPrazos(caso));
  } catch (erro) {
    if (erro instanceof AcessoNegadoError) {
      throw erro;
    }
    avisarFallback("/api/casos", erro);
    return CASOS;
  }
}

export async function obterCaso(idOrCnj: string): Promise<Caso> {
  try {
    const resposta = await fetch(`${baseUrl()}/api/casos/${encodeURIComponent(idOrCnj)}`, {
      headers: cabecalhoHub(),
    });
    await exigirOk(resposta);

    const corpo = (await resposta.json()) as CasoResposta;

    if (corpo.zone !== "internal" || !corpo.caso) {
      throw new Error("Resposta inválida do acervo interno.");
    }

    return hidratarPrazos(corpo.caso);
  } catch (erro) {
    if (erro instanceof AcessoNegadoError) {
      throw erro;
    }
    const local = casoLocal(idOrCnj);

    if (local) {
      avisarFallback(`/api/casos/${idOrCnj}`, erro);
      return local;
    }

    throw erro;
  }
}

export async function listarAba(
  recurso: RecursoAba,
  filtro: FiltroAba
): Promise<Documento[]> {
  try {
    const resposta = await fetch(
      `${baseUrl()}${CAMINHO_ABA[recurso]}?${queryAba(filtro)}`,
      { headers: cabecalhoHub() }
    );
    await exigirOk(resposta);

    const corpo = (await resposta.json()) as Record<string, unknown>;
    const itens = corpo[recurso];

    if (corpo.zone !== "internal" || !Array.isArray(itens)) {
      throw new Error("Resposta inválida do acervo interno.");
    }

    return (itens as Record<string, unknown>[]).map(comoDocumento);
  } catch (erro) {
    if (erro instanceof AcessoNegadoError) {
      throw erro;
    }

    const local = casoLocal(filtro.casoId) || casoLocal(filtro.processNumber);

    if (local) {
      avisarFallback(CAMINHO_ABA[recurso], erro);
      return abaLocal(local, recurso);
    }

    throw erro;
  }
}

type PaginaChat = {
  zone?: string;
  mensagens?: Mensagem[];
  proximoCursor?: string | null;
};

export type ItemChecklist = {
  id: string;
  rotulo: string;
  done: boolean;
};

export async function listarChecklist(casoId: string): Promise<ItemChecklist[]> {
  const resposta = await fetch(`${baseUrl()}/api/casos/${encodeURIComponent(casoId)}/checklist`, {
    headers: cabecalhoHub(),
  });
  if (!resposta.ok) {
    throw new Error(await lerErro(resposta));
  }
  const corpo = (await resposta.json()) as { zone?: string; itens?: ItemChecklist[] };
  if (corpo.zone !== "internal" || !Array.isArray(corpo.itens)) {
    throw new Error("Resposta inválida do checklist.");
  }
  return corpo.itens;
}

export async function marcarChecklist(
  casoId: string,
  item: string,
  done: boolean,
): Promise<ItemChecklist[]> {
  const resposta = await fetch(`${baseUrl()}/api/casos/${encodeURIComponent(casoId)}/checklist`, {
    method: "POST",
    headers: { ...cabecalhoHub(), "Content-Type": "application/json" },
    body: JSON.stringify({ item, done }),
  });
  if (!resposta.ok) {
    throw new Error(await lerErro(resposta));
  }
  const corpo = (await resposta.json()) as { zone?: string; itens?: ItemChecklist[] };
  if (corpo.zone !== "internal" || !Array.isArray(corpo.itens)) {
    throw new Error("Resposta inválida do checklist.");
  }
  return corpo.itens;
}

export type RunXirp = {
  id: string;
  toolName: string;
  releaseId: string | null;
  citeStatus: "cited" | "silent" | "refused";
  summary: string;
  createdAt: string;
};

export async function listarRunsXirp(casoId: string): Promise<RunXirp[]> {
  const resposta = await fetch(`${baseUrl()}/api/casos/${encodeURIComponent(casoId)}/xirp`, {
    headers: cabecalhoHub(),
  });
  if (!resposta.ok) {
    throw new Error(await lerErro(resposta));
  }
  const corpo = (await resposta.json()) as { zone?: string; runs?: RunXirp[] };
  if (corpo.zone !== "internal" || !Array.isArray(corpo.runs)) {
    throw new Error("Resposta inválida do Xirp.");
  }
  return corpo.runs;
}

export type Lancamento = {
  id: string;
  kind: "honorario" | "custa" | "fatura";
  descricao: string;
  centavos: number;
  status: "rascunho" | "lancado";
  faturaId: string | null;
  createdBy: string;
  createdAt: string;
};

export type FinanceiroCaso = {
  lancamentos: Lancamento[];
  abertoCentavos: number;
  podeLancar: boolean;
};

export type NovoLancamento = {
  kind: "honorario" | "custa";
  descricao: string;
  centavos: number;
  status: "rascunho" | "lancado";
};

export async function listarLancamentos(casoId: string): Promise<FinanceiroCaso> {
  const resposta = await fetch(`${baseUrl()}/api/casos/${encodeURIComponent(casoId)}/lancamentos`, {
    headers: cabecalhoHub(),
  });
  if (!resposta.ok) {
    throw new Error(await lerErro(resposta));
  }
  const corpo = (await resposta.json()) as { zone?: string } & Partial<FinanceiroCaso>;
  if (corpo.zone !== "internal" || !Array.isArray(corpo.lancamentos) || typeof corpo.abertoCentavos !== "number") {
    throw new Error("Resposta inválida do financeiro.");
  }
  return {
    lancamentos: corpo.lancamentos,
    abertoCentavos: corpo.abertoCentavos,
    podeLancar: corpo.podeLancar === true,
  };
}

export async function criarLancamento(casoId: string, novo: NovoLancamento): Promise<void> {
  const resposta = await fetch(`${baseUrl()}/api/casos/${encodeURIComponent(casoId)}/lancamentos`, {
    method: "POST",
    headers: { ...cabecalhoHub(), "Content-Type": "application/json" },
    body: JSON.stringify(novo),
  });
  if (!resposta.ok) {
    throw new Error(await lerErro(resposta));
  }
}

export async function substituirLancamento(casoId: string, lancamentoId: string, novo: NovoLancamento): Promise<void> {
  const resposta = await fetch(
    `${baseUrl()}/api/casos/${encodeURIComponent(casoId)}/lancamentos/${encodeURIComponent(lancamentoId)}`,
    {
      method: "PATCH",
      headers: { ...cabecalhoHub(), "Content-Type": "application/json" },
      body: JSON.stringify(novo),
    },
  );
  if (!resposta.ok) {
    throw new Error(await lerErro(resposta));
  }
}

export async function gerarFatura(casoId: string): Promise<void> {
  const resposta = await fetch(`${baseUrl()}/api/casos/${encodeURIComponent(casoId)}/fatura`, {
    method: "POST",
    headers: cabecalhoHub(),
  });
  if (!resposta.ok) {
    throw new Error(await lerErro(resposta));
  }
}

export async function enviarPedidoDsar(pedido: string): Promise<string> {
  const resposta = await fetch(`${baseUrl()}/api/dsar`, {
    method: "POST",
    headers: { ...cabecalhoHub(), "Content-Type": "application/json" },
    body: JSON.stringify({ pedido }),
  });
  if (!resposta.ok) {
    throw new Error(await lerErro(resposta));
  }
  const corpo = (await resposta.json()) as { zone?: string; protocol?: string };
  if (corpo.zone !== "internal" || typeof corpo.protocol !== "string") {
    throw new Error("Resposta inválida do protocolo.");
  }
  return corpo.protocol;
}

export type RespostaConsulta = {
  runtime: "office-hosted";
  citeStatus: "cited" | "silent";
  hits: { docId: string; snippet: string; distance: number }[];
  answer: string | null;
  generative: boolean;
  notice: string;
};

export async function consultarLocal(q: string): Promise<RespostaConsulta> {
  const resposta = await fetch(`${baseUrl()}/api/rag/consult`, {
    method: "POST",
    headers: { ...cabecalhoHub(), "Content-Type": "application/json" },
    body: JSON.stringify({ q }),
  });
  if (!resposta.ok) {
    throw new Error(await lerErro(resposta));
  }
  const corpo = (await resposta.json()) as RespostaConsulta;
  if (corpo.runtime !== "office-hosted" || typeof corpo.notice !== "string") {
    throw new Error("Resposta inválida da consulta.");
  }
  return corpo;
}

export type PendenciaPa = {
  desafio: string;
  tool: string;
  caseId: string;
  expiraEm: string;
};

export async function listarPendenciasPa(): Promise<PendenciaPa[]> {
  const resposta = await fetch(`${baseUrl()}/api/pa/pendencias`, { headers: cabecalhoHub() });
  if (!resposta.ok) {
    throw new Error(await lerErro(resposta));
  }
  const corpo = (await resposta.json()) as { zone?: string; pendencias?: PendenciaPa[] };
  if (corpo.zone !== "internal" || !Array.isArray(corpo.pendencias)) {
    throw new Error("Resposta inválida das confirmações.");
  }
  return corpo.pendencias;
}

export async function confirmarPendenciaPa(desafio: string): Promise<void> {
  const resposta = await fetch(`${baseUrl()}/api/pa/confirm`, {
    method: "POST",
    headers: { ...cabecalhoHub(), "Content-Type": "application/json" },
    body: JSON.stringify({ desafio }),
  });
  if (!resposta.ok) {
    throw new Error(await lerErro(resposta));
  }
}

export async function calcularPrazoCpc(inicio: string, dias: number): Promise<string> {
  const resposta = await fetch(`${baseUrl()}/api/tools/prazo-cpc`, {
    method: "POST",
    headers: { ...cabecalhoHub(), "Content-Type": "application/json" },
    body: JSON.stringify({ inicio, dias }),
  });
  if (!resposta.ok) {
    throw new Error(await lerErro(resposta));
  }
  const corpo = (await resposta.json()) as { zone?: string; termo?: string };
  if (corpo.zone !== "internal" || !corpo.termo) {
    throw new Error("Resposta inválida do prazo.");
  }
  return corpo.termo;
}

export async function listarChat(
  processoId: string,
  cursor?: string,
  signal?: AbortSignal
): Promise<{ mensagens: Mensagem[]; proximoCursor: string | null }> {
  const params = new URLSearchParams({ limite: "50" });
  if (cursor) params.set("cursor", cursor);
  const resposta = await fetch(
    `${baseUrl()}/api/processos/${encodeURIComponent(processoId)}/chat?${params}`,
    { signal, headers: cabecalhoHub() }
  );
  if (!resposta.ok) throw new Error(await lerErro(resposta));
  const corpo = (await resposta.json()) as PaginaChat;
  if (corpo.zone !== "internal" || !Array.isArray(corpo.mensagens)) {
    throw new Error("Resposta inválida do chat interno.");
  }
  return {
    mensagens: corpo.mensagens,
    proximoCursor: corpo.proximoCursor || null,
  };
}

export async function enviarMensagemChat(
  processoId: string,
  id: string,
  mensagem: string
): Promise<Mensagem> {
  const resposta = await fetch(
    `${baseUrl()}/api/processos/${encodeURIComponent(processoId)}/chat`,
    {
      method: "POST",
      headers: { ...cabecalhoHub(), "Content-Type": "application/json" },
      body: JSON.stringify({ id, mensagem }),
    }
  );
  if (!resposta.ok) throw new Error(await lerErro(resposta));
  const corpo = (await resposta.json()) as { zone?: string; mensagem?: Mensagem };
  if (corpo.zone !== "internal" || !corpo.mensagem) {
    throw new Error("Resposta inválida do chat interno.");
  }
  return corpo.mensagem;
}

export type WikiNotePointer = {
  id: string;
  title: string;
  snippet: string;
};

export type WikiNote = {
  id: string;
  title: string;
  body: string;
};

export async function carregarWikiLoad(): Promise<{
  notes: WikiNotePointer[];
  hardvault: WikiNotePointer[];
}> {
  const resposta = await fetch(`${baseUrl()}/api/wiki/load`, {
    headers: cabecalhoHub(),
  });
  if (!resposta.ok) {
    throw new Error(await lerErro(resposta));
  }
  const corpo = (await resposta.json()) as {
    zone?: string;
    notes?: WikiNotePointer[];
    hardvault?: WikiNotePointer[];
  };
  if (corpo.zone !== "internal" || !Array.isArray(corpo.notes) || !Array.isArray(corpo.hardvault)) {
    throw new Error("Resposta inválida das notas.");
  }
  return { notes: corpo.notes, hardvault: corpo.hardvault };
}

export async function obterWikiNote(id: string): Promise<WikiNote> {
  const resposta = await fetch(`${baseUrl()}/api/wiki/notes/${encodeURIComponent(id)}`, {
    headers: cabecalhoHub(),
  });
  if (!resposta.ok) {
    throw new Error(await lerErro(resposta));
  }
  const corpo = (await resposta.json()) as { zone?: string; note?: WikiNote };
  if (corpo.zone !== "internal" || !corpo.note?.id) {
    throw new Error("Resposta inválida da nota.");
  }
  return {
    id: String(corpo.note.id),
    title: String(corpo.note.title ?? ""),
    body: String(corpo.note.body ?? ""),
  };
}

export async function criarWikiNote(
  title: string,
  body: string,
): Promise<{ id: string; title: string }> {
  const resposta = await fetch(`${baseUrl()}/api/wiki/notes`, {
    method: "POST",
    headers: { ...cabecalhoHub(), "Content-Type": "application/json" },
    body: JSON.stringify({ title, body }),
  });
  if (!resposta.ok) {
    throw new Error(await lerErro(resposta));
  }
  const corpo = (await resposta.json()) as {
    zone?: string;
    note?: { id?: string; title?: string };
  };
  if (corpo.zone !== "internal" || !corpo.note?.id) {
    throw new Error("Resposta inválida ao criar nota.");
  }
  return { id: String(corpo.note.id), title: String(corpo.note.title ?? title) };
}

export async function publicarWikiNote(id: string): Promise<{ id: string; title: string }> {
  const resposta = await fetch(
    `${baseUrl()}/api/wiki/notes/${encodeURIComponent(id)}/publish`,
    {
      method: "POST",
      headers: { ...cabecalhoHub(), "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: true }),
    },
  );
  if (!resposta.ok) {
    throw new Error(await lerErro(resposta));
  }
  const corpo = (await resposta.json()) as {
    zone?: string;
    doc?: { id?: string; title?: string };
  };
  if (corpo.zone !== "internal" || !corpo.doc?.id) {
    throw new Error("Resposta inválida ao publicar no hardvault.");
  }
  return { id: String(corpo.doc.id), title: String(corpo.doc.title ?? "") };
}

export type WorkspaceThread = { id: string };

export type WorkspaceMessage = {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
};

export async function listarWorkspaceDms(): Promise<WorkspaceThread[]> {
  const resposta = await fetch(`${baseUrl()}/api/workspace/dms`, {
    headers: cabecalhoHub(),
  });
  await exigirOk(resposta);
  const corpo = (await resposta.json()) as {
    zone?: string;
    threads?: WorkspaceThread[];
  };
  if (corpo.zone !== "internal" || !Array.isArray(corpo.threads)) {
    throw new Error("Resposta inválida das mensagens do workspace.");
  }
  return corpo.threads;
}

export async function abrirWorkspaceDm(peerUserId: string): Promise<string> {
  const resposta = await fetch(`${baseUrl()}/api/workspace/dms`, {
    method: "POST",
    headers: { ...cabecalhoHub(), "Content-Type": "application/json" },
    body: JSON.stringify({ peerUserId }),
  });
  await exigirOk(resposta);
  const corpo = (await resposta.json()) as { threadId?: string };
  if (!corpo.threadId) {
    throw new Error("Resposta inválida ao abrir DM.");
  }
  return String(corpo.threadId);
}

export async function listarWorkspaceMensagens(
  threadId: string,
): Promise<WorkspaceMessage[]> {
  const resposta = await fetch(
    `${baseUrl()}/api/workspace/dms/${encodeURIComponent(threadId)}`,
    { headers: cabecalhoHub() },
  );
  await exigirOk(resposta);
  const corpo = (await resposta.json()) as {
    zone?: string;
    messages?: WorkspaceMessage[];
  };
  if (corpo.zone !== "internal" || !Array.isArray(corpo.messages)) {
    throw new Error("Resposta inválida das mensagens do workspace.");
  }
  return corpo.messages;
}

export async function enviarWorkspaceMensagem(
  threadId: string,
  body: string,
): Promise<{ messageId: string; mentions: string[] }> {
  const resposta = await fetch(
    `${baseUrl()}/api/workspace/dms/${encodeURIComponent(threadId)}/messages`,
    {
      method: "POST",
      headers: { ...cabecalhoHub(), "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    },
  );
  await exigirOk(resposta);
  const corpo = (await resposta.json()) as {
    zone?: string;
    messageId?: string;
    mentions?: string[];
  };
  if (corpo.zone !== "internal" || !corpo.messageId) {
    throw new Error("Resposta inválida ao enviar mensagem.");
  }
  return {
    messageId: String(corpo.messageId),
    mentions: Array.isArray(corpo.mentions) ? corpo.mentions.map(String) : [],
  };
}

export type CatalogItem = {
  id: string;
  kind: string;
  area: string;
  titulo: string;
  descricao: string;
  requerSafeDto: boolean;
  corpo?: string;
  endpoint?: string;
};

export type WhatsappStatus = {
  conectado: boolean;
  modo: string;
  telefoneMascarado: string | null;
  pendenteOauth: boolean;
};

export async function listarCatalogo(): Promise<CatalogItem[]> {
  const resposta = await fetch(`${baseUrl()}/api/catalogo`);
  if (!resposta.ok) throw new Error(await lerErro(resposta));
  const corpo = (await resposta.json()) as { zone?: string; itens?: CatalogItem[] };
  if (corpo.zone !== "internal" || !Array.isArray(corpo.itens)) {
    throw new Error("Resposta inválida do catálogo.");
  }
  return corpo.itens;
}

export async function exportarPromptCatalogo(
  id: string
): Promise<{ id: string; corpo: string; requerSafeDto: boolean; aviso: string }> {
  const resposta = await fetch(`${baseUrl()}/api/catalogo/export/${encodeURIComponent(id)}`);
  if (!resposta.ok) throw new Error(await lerErro(resposta));
  const corpo = (await resposta.json()) as {
    zone?: string;
    id?: string;
    corpo?: string;
    requerSafeDto?: boolean;
    aviso?: string;
  };
  if (corpo.zone !== "internal" || !corpo.corpo) {
    throw new Error("Export de prompt inválido.");
  }
  return {
    id: String(corpo.id),
    corpo: corpo.corpo,
    requerSafeDto: !!corpo.requerSafeDto,
    aviso: String(corpo.aviso || ""),
  };
}

export async function obterStatusWhatsapp(): Promise<WhatsappStatus> {
  const resposta = await fetch(`${baseUrl()}/api/whatsapp/status`);
  if (!resposta.ok) throw new Error(await lerErro(resposta));
  return (await resposta.json()) as WhatsappStatus;
}

export async function conectarWhatsappStub(): Promise<WhatsappStatus> {
  const resposta = await fetch(`${baseUrl()}/api/whatsapp/conectar-stub`, { method: "POST" });
  if (!resposta.ok) throw new Error(await lerErro(resposta));
  return (await resposta.json()) as WhatsappStatus;
}

export async function iniciarOauthWhatsapp(): Promise<{ authorizeUrl: string; state: string }> {
  const resposta = await fetch(`${baseUrl()}/api/whatsapp/oauth/start`, { method: "POST" });
  if (!resposta.ok) throw new Error(await lerErro(resposta));
  return (await resposta.json()) as { authorizeUrl: string; state: string };
}

export type PedidoWhatsapp = {
  para: string;
  texto?: string;
  templateId?: string;
  revisao: boolean;
  confirmacao?: string;
};

export type ResultadoEnvioWhatsapp =
  | { tipo: "desafio"; desafio: string }
  | { tipo: "enviado"; modo: string };

/** 409 with a desafio is the expected first step, not an error. */
export async function enviarWhatsapp(pedido: PedidoWhatsapp): Promise<ResultadoEnvioWhatsapp> {
  const resposta = await fetch(`${baseUrl()}/api/whatsapp/enviar`, {
    method: "POST",
    headers: { ...cabecalhoHub(), "Content-Type": "application/json" },
    body: JSON.stringify(pedido),
  });
  const corpo = (await resposta.json().catch(() => ({}))) as {
    ok?: boolean;
    modo?: string;
    desafio?: string;
    confirmacaoNecessaria?: boolean;
    erro?: string | string[];
  };
  if (resposta.status === 409 && corpo.confirmacaoNecessaria && corpo.desafio) {
    return { tipo: "desafio", desafio: corpo.desafio };
  }
  if (!resposta.ok || !corpo.ok) {
    const motivo = Array.isArray(corpo.erro) ? corpo.erro.join(" ") : corpo.erro;
    throw new Error(motivo || `Envio recusado (${resposta.status}).`);
  }
  return { tipo: "enviado", modo: String(corpo.modo || "") };
}

/** A tela continua de pé com a cópia local, mas o motivo tem de ficar visível. */
function avisarFallback(caminho: string, erro: unknown) {
  const motivo = erro instanceof Error ? erro.message : String(erro);
  console.warn(`${caminho} indisponível (${motivo}). Usando a cópia local do acervo.`);
}

function casoLocal(idOrCnj: string): Caso | undefined {
  const digitos = idOrCnj.replace(/\D/g, "");

  return CASOS.find(
    (caso) =>
      caso.id === idOrCnj ||
      caso.processNumber === idOrCnj ||
      (digitos.length === 20 && caso.processNumber.replace(/\D/g, "") === digitos)
  );
}

function abaLocal(caso: Caso, recurso: RecursoAba): Documento[] {
  if (recurso === "clientes") {
    return caso.partes.map((parte, indice) => ({
      id: `parte-${indice}`,
      titulo: parte.nome,
      tipo: parte.papel,
      data: "",
      origem: "Acervo interno",
      resumo: parte.papel,
    }));
  }

  return caso[recurso];
}
