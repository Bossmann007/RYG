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
    const resposta = await fetch(`${baseUrl()}/api/casos`);

    if (!resposta.ok) {
      throw new Error(await lerErro(resposta));
    }

    const corpo = (await resposta.json()) as ListaCasosResposta;

    if (corpo.zone !== "internal" || !Array.isArray(corpo.casos)) {
      throw new Error("Resposta inválida do acervo interno.");
    }

    return corpo.casos.map((caso) => hidratarPrazos(caso));
  } catch (erro) {
    avisarFallback("/api/casos", erro);
    return CASOS;
  }
}

export async function obterCaso(idOrCnj: string): Promise<Caso> {
  try {
    const resposta = await fetch(`${baseUrl()}/api/casos/${encodeURIComponent(idOrCnj)}`);

    if (!resposta.ok) {
      throw new Error(await lerErro(resposta));
    }

    const corpo = (await resposta.json()) as CasoResposta;

    if (corpo.zone !== "internal" || !corpo.caso) {
      throw new Error("Resposta inválida do acervo interno.");
    }

    return hidratarPrazos(corpo.caso);
  } catch (erro) {
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
    { signal }
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
      headers: { "Content-Type": "application/json" },
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
