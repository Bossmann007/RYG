import { IdentidadeRequisicao } from "@common/guards/identity.guard";

/** ADR 0005 allowlist. Nothing outside these four rows is offered to a PA session. */
export const FERRAMENTAS_PA = [
  { nome: "ler_caso", mutacao: false, irreversivel: false },
  { nome: "checklist", mutacao: true, irreversivel: false },
  { nome: "enviar_whatsapp", mutacao: true, irreversivel: true },
  { nome: "exportar_caso", mutacao: true, irreversivel: true },
] as const;

export type FerramentaPa = (typeof FERRAMENTAS_PA)[number];
export type NomeFerramentaPa = FerramentaPa["nome"];

export type ModoPa = { modo: "pa"; delegatedBy: string } | { modo: "consult" };

export function acharFerramentaPa(nome: unknown): FerramentaPa | undefined {
  return FERRAMENTAS_PA.find((ferramenta) => ferramenta.nome === nome);
}

function lista(valor: string | undefined): string[] {
  return (valor ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Socio only, and both OFFICE_PA and PA_USERS must name the caller. OFFICE_HOSTED_AI is not read. */
export function modoPa(identidade: IdentidadeRequisicao, env: NodeJS.ProcessEnv = process.env): ModoPa {
  const inscrito =
    identidade.papel === "socio" &&
    lista(env.OFFICE_PA).includes(identidade.officeId) &&
    lista(env.PA_USERS).includes(identidade.id);
  return inscrito ? { modo: "pa", delegatedBy: identidade.id } : { modo: "consult" };
}
