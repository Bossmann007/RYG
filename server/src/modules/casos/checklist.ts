export const ITENS_CHECKLIST = [
  { id: "tarifas", rotulo: "Tarifas" },
  { id: "seguro", rotulo: "Seguro" },
  { id: "iof", rotulo: "IOF" },
  { id: "vencimento", rotulo: "Vencimento antecipado" },
] as const;

export type IdChecklist = (typeof ITENS_CHECKLIST)[number]["id"];

export type ItemChecklist = {
  id: IdChecklist;
  rotulo: string;
  done: boolean;
};

const feitos = new Map<string, Set<IdChecklist>>();

function chave(officeId: string, casoId: string): string {
  return `${officeId}:${casoId}`;
}

export function ehItemChecklist(valor: string): valor is IdChecklist {
  return ITENS_CHECKLIST.some((item) => item.id === valor);
}

export function lerChecklist(officeId: string, casoId: string): ItemChecklist[] {
  const done = feitos.get(chave(officeId, casoId)) ?? new Set<IdChecklist>();
  return ITENS_CHECKLIST.map((item) => ({
    id: item.id,
    rotulo: item.rotulo,
    done: done.has(item.id),
  }));
}

export function marcarItemChecklist(
  officeId: string,
  casoId: string,
  item: IdChecklist,
  done: boolean,
): ItemChecklist[] {
  const key = chave(officeId, casoId);
  const set = new Set(feitos.get(key) ?? []);
  if (done) {
    set.add(item);
  } else {
    set.delete(item);
  }
  feitos.set(key, set);
  return lerChecklist(officeId, casoId);
}
