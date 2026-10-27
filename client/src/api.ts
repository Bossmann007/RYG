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

function cabecalhoHub(): HeadersInit {
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
      `${baseUrl()}${CAMINHO_ABA[recurso]}?${queryAba(filtro)}`
    );

    if (!resposta.ok) {
      throw new Error(await lerErro(resposta));
    }

    const corpo = (await resposta.json()) as Record<string, unknown>;
    const itens = corpo[recurso];

    if (corpo.zone !== "internal" || !Array.isArray(itens)) {
      throw new Error("Resposta inválida do acervo interno.");
    }

    return (itens as Record<string, unknown>[]).map(comoDocumento);
  } catch (erro) {
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

export async function listarChat(
  processoId: string,
  cursor?: string,
  signal?: AbortSignal
): Promise<{ mensagens: Mensagem[]; proximoCursor: string | null }> {
  const params = new URLSearchParams({ limite: "50" });
  if (cursor) params.set("cursor", cursor);
  const resposta = await fetch(
    `${baseUrl()}/api/processos/${encodeURIComponent(processoId)}/chat?${params}`,
    { headers: cabecalhoHub(), signal }
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

export type DmResumo = {
  channelId: string;
  peerUserId: string;
  peerNome: string;
  peerPapel: string;
  createdAt: string;
};

export async function listarDms(signal?: AbortSignal): Promise<DmResumo[]> {
  const resposta = await fetch(`${baseUrl()}/api/workspace/dms`, {
    headers: cabecalhoHub(),
    signal,
  });
  await exigirOk(resposta);
  const corpo = (await resposta.json()) as { zone?: string; dms?: DmResumo[] };
  if (corpo.zone !== "internal" || !Array.isArray(corpo.dms)) {
    throw new Error("Resposta inválida das conversas do workspace.");
  }
  return corpo.dms;
}

export async function abrirDm(peerUserId: string): Promise<{ channelId: string }> {
  const resposta = await fetch(`${baseUrl()}/api/workspace/dms`, {
    method: "POST",
    headers: { ...cabecalhoHub(), "Content-Type": "application/json" },
    body: JSON.stringify({ peerUserId }),
  });
  await exigirOk(resposta);
  const corpo = (await resposta.json()) as { zone?: string; channelId?: string };
  if (corpo.zone !== "internal" || !corpo.channelId) {
    throw new Error("Resposta inválida ao abrir DM.");
  }
  return { channelId: corpo.channelId };
}

export async function listarMensagensDm(
  channelId: string,
  cursor?: string,
  signal?: AbortSignal
): Promise<{ mensagens: Mensagem[]; proximoCursor: string | null }> {
  const params = new URLSearchParams({ limite: "50" });
  if (cursor) params.set("cursor", cursor);
  const resposta = await fetch(
    `${baseUrl()}/api/workspace/dms/${encodeURIComponent(channelId)}/messages?${params}`,
    { headers: cabecalhoHub(), signal }
  );
  await exigirOk(resposta);
  const corpo = (await resposta.json()) as PaginaChat;
  if (corpo.zone !== "internal" || !Array.isArray(corpo.mensagens)) {
    throw new Error("Resposta inválida do DM.");
  }
  return {
    mensagens: corpo.mensagens,
    proximoCursor: corpo.proximoCursor || null,
  };
}

export async function enviarMensagemDm(
  channelId: string,
  id: string,
  mensagem: string
): Promise<Mensagem> {
  const resposta = await fetch(
    `${baseUrl()}/api/workspace/dms/${encodeURIComponent(channelId)}/messages`,
    {
      method: "POST",
      headers: { ...cabecalhoHub(), "Content-Type": "application/json" },
      body: JSON.stringify({ id, mensagem }),
    }
  );
  await exigirOk(resposta);
  const corpo = (await resposta.json()) as { zone?: string; mensagem?: Mensagem };
  if (corpo.zone !== "internal" || !corpo.mensagem) {
    throw new Error("Resposta inválida ao enviar DM.");
  }
  return corpo.mensagem;
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
