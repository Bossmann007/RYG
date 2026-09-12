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
};

export const PERFIS_DEMO = Object.entries(USUARIOS_POR_TOKEN).map(
  ([token, identidade]) => ({
    token,
    nome: identidade.nome,
    papel: identidade.papel,
  })
);
