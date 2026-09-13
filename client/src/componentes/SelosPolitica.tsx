import {
  FonteFato,
  Jurisprudencia,
  Tese,
  ehCitavel,
  rotuloFonte,
} from "../tipos";

export function SeloFonte({ fonte }: { fonte?: FonteFato }) {
  if (!fonte) {
    return null;
  }

  return <span className={`selo fonte-${fonte}`}>{rotuloFonte(fonte)}</span>;
}

export function SeloCitacao({ item }: { item: Pick<Jurisprudencia, "citavel" | "ementa"> }) {
  if (ehCitavel(item)) {
    return <span className="selo citavel">Citável</span>;
  }

  return <span className="selo nao-citavel">Não citável</span>;
}

export function SeloTese({ tese }: { tese: Tese }) {
  return <SeloFonte fonte={tese.fonte || "acervo_interno"} />;
}

export function ementaExibida(item: Pick<Jurisprudencia, "citavel" | "ementa">): string {
  return ehCitavel(item) ? item.ementa : "Não citável. Ementa oficial ausente.";
}
