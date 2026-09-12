import { ResultadoPesquisa } from "./tipos";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export async function pesquisarProcesso(
  processNumber: string,
  fileName?: string
): Promise<ResultadoPesquisa> {
  const resposta = await fetch(`${API_URL}/api/research`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      processNumber,
      fileName: fileName || undefined,
    }),
  });

  const corpo = await resposta.json();

  if (!resposta.ok) {
    const erro = corpo?.erro;
    const mensagem =
      typeof erro === "string"
        ? erro
        : Array.isArray(erro)
          ? "Número do processo inválido."
          : "Não foi possível concluir a pesquisa.";
    throw new Error(mensagem);
  }

  return corpo as ResultadoPesquisa;
}
