import { Identidade } from "@models/gateway.model";

/** Resolve @Name tokens against an office directory (exact name match, case/diacritic-insensitive). */
export function extrairMencoes(
  texto: string,
  diretorio: Identidade[],
): Identidade[] {
  const nomes = [...texto.matchAll(/@([\p{L}\p{M}][\p{L}\p{M}\s.'-]*)/gu)].map((m) =>
    m[1].trim(),
  );
  if (!nomes.length) {
    return [];
  }

  const achados = new Map<string, Identidade>();
  for (const bruto of nomes) {
    const chave = normalizar(bruto);
    const pessoa = diretorio.find((item) => normalizar(item.nome) === chave);
    if (pessoa) {
      achados.set(pessoa.id, pessoa);
    }
  }
  return [...achados.values()];
}

function normalizar(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
