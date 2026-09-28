import { Identidade } from "@models/gateway.model";

/**
 * Usuarios da demo. Em producao isto vem do diretorio do escritorio
 * (OIDC/LDAP) e o token vira credencial emitida, nao string em fixture.
 */
export const USUARIOS_POR_TOKEN: Record<string, Identidade> = {
  "demo-socio": {
    id: "u-001",
    nome: "Dra. Helena Prado",
    papel: "socio",
    escritorio: "prado-advogados",
  },
  "demo-advogado": {
    id: "u-002",
    nome: "Dr. Rafael Nunes",
    papel: "advogado",
    escritorio: "prado-advogados",
  },
  "demo-estagiario": {
    id: "u-003",
    nome: "Marina Alves",
    papel: "estagiario",
    escritorio: "prado-advogados",
  },
  "demo-gestor": {
    id: "u-004",
    nome: "Carlos Beltrao",
    papel: "gestor",
    escritorio: "prado-advogados",
  },
  "demo-outro": {
    id: "u-099",
    nome: "Dra. Outra Banca",
    papel: "socio",
    escritorio: "outro-escritorio",
  },
};

/**
 * These tokens receive a membership row on every existing caso of their office.
 * Any other token in the same office stays a non-member (403 on capa).
 */
export const MEMBROS_DEMO_ESCRITORIO = ["demo-socio"] as const;

export const PERFIS_DEMO = Object.entries(USUARIOS_POR_TOKEN).map(
  ([token, identidade]) => ({
    token,
    nome: identidade.nome,
    papel: identidade.papel,
  })
);
