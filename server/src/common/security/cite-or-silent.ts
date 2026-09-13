export type CiteStatus = "ok" | "nao_citavel";

export type FonteCitavel = {
  citavel?: boolean | null;
  ementaSnippet?: string | null;
  ementa?: string | null;
  processNumber?: string | null;
  court?: string | null;
  acordaoNumber?: string | null;
  acordao?: string | null;
  organ?: string | null;
  judgmentDate?: string | null;
  publicationDate?: string | null;
  date?: string | null;
};

function preenchido(valor: unknown): boolean {
  return typeof valor === "string" && valor.trim().length > 0;
}

export function ementaOficialPresente(item: FonteCitavel): boolean {
  const ementa = item.ementaSnippet ?? item.ementa;
  const identificador =
    preenchido(item.processNumber) ||
    preenchido(item.acordaoNumber) ||
    preenchido(item.acordao);
  const corte = preenchido(item.court) || preenchido(item.organ);
  const data =
    preenchido(item.judgmentDate) ||
    preenchido(item.publicationDate) ||
    preenchido(item.date);

  return preenchido(ementa) && identificador && corte && data;
}

export function ementaCitavel(item: FonteCitavel): boolean {
  return item.citavel === true && ementaOficialPresente(item);
}

export function citeStatusDe(item: FonteCitavel): CiteStatus {
  return ementaCitavel(item) ? "ok" : "nao_citavel";
}

export function ementaParaCitacao(item: FonteCitavel): string | null {
  if (!ementaCitavel(item)) {
    return null;
  }

  const ementa = item.ementaSnippet ?? item.ementa;
  return preenchido(ementa) ? String(ementa).trim() : null;
}
