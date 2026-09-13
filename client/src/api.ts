import { CASOS } from "./dados";
import { hidratarPrazos } from "./prazos-escritorio";
import { Caso } from "./tipos";

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

function baseUrl(): string {
  const bruto = import.meta.env.VITE_API_URL;
  if (!bruto) {
    return "";
  }

  return String(bruto).replace(/\/$/, "");
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

    return corpo.casos.map((caso) => hidratarPrazos({ ...caso, prazos: caso.prazos ?? [] }));
  } catch (erro) {
    if (import.meta.env.DEV) {
      return acervoLocal();
    }

    throw erro;
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

    return hidratarPrazos({ ...corpo.caso, prazos: corpo.caso.prazos ?? [] });
  } catch (erro) {
    if (import.meta.env.DEV) {
      const local = acervoLocal().find(
        (caso) => caso.id === idOrCnj || caso.processNumber === idOrCnj
      );
      if (local) {
        return local;
      }
    }

    throw erro;
  }
}

function acervoLocal(): Caso[] {
  return CASOS.map((caso) => hidratarPrazos(caso));
}
