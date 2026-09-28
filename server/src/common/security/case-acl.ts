export type LadoParte = "client" | "adverse";

export type ParteRegistrada = {
  casoId: string;
  side: LadoParte;
  nameKey: string;
};

export type ConflitoPartes = {
  casoId: string;
  motivo: string;
};

export function normalizarNomeParte(nome: string): string {
  return nome.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ").slice(0, 255);
}

/**
 * Wall is opposing sides only. The same client on a new adverse party is not a conflict.
 * Existing rows are other matters. This matter's own parties are not in `existentes` yet.
 */
export function acharConflito(
  pedido: { client: string; adverse: string },
  existentes: ParteRegistrada[],
): ConflitoPartes | null {
  const client = normalizarNomeParte(pedido.client);
  const adverse = normalizarNomeParte(pedido.adverse);
  if (!client || !adverse) {
    return null;
  }

  for (const parte of existentes) {
    if (parte.side === "adverse" && parte.nameKey === client) {
      return {
        casoId: parte.casoId,
        motivo: `cliente coincide com parte adversa do caso ${parte.casoId}`,
      };
    }
    if (parte.side === "client" && parte.nameKey === adverse) {
      return {
        casoId: parte.casoId,
        motivo: `parte adversa coincide com cliente do caso ${parte.casoId}`,
      };
    }
  }

  return null;
}
