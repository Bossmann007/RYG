import { QualquerSafeDTO } from "@models/safe-dto.model";
import { Injectable, Logger } from "@nestjs/common";
import type * as PrivacyGateway from "@openlegalai/privacy-gateway";
import type { McpRelease, SafeDTO } from "@openlegalai/privacy-gateway";
import { randomBytes } from "crypto";

type CorpoSafeDto = Omit<SafeDTO, "schemaVersion" | "sessionId" | "releaseId">;

type EgressIndisponivel = { ok: false; stage: "load"; code: "EGRESS_UNAVAILABLE" };

export type LiberacaoMcp = McpRelease | EgressIndisponivel;

/**
 * ADR 0002: the MCP wire carries only privacy-gateway SafeDTO. This service maps
 * the Nest-internal envelope and hands it to `releaseForMcp`, which validates,
 * serializes, and firewalls it. Nest never writes egress bytes itself.
 */
@Injectable()
export class SafeDtoEgressService {
  private readonly logger = new Logger(SafeDtoEgressService.name);

  async liberar(envelope: QualquerSafeDTO): Promise<LiberacaoMcp> {
    let gateway: typeof PrivacyGateway;
    try {
      // Lazy so the hub boots without the MCP egress; tsc lowers this to
      // require(), which loads the ESM package on Node >= 20.19.
      gateway = await import("@openlegalai/privacy-gateway");
    } catch (erro) {
      const codigo = erro instanceof Error && "code" in erro ? String(erro.code) : "load";
      this.logger.error(`privacy-gateway indisponivel: ${codigo}`);
      return { ok: false, stage: "load", code: "EGRESS_UNAVAILABLE" };
    }

    return gateway.releaseForMcp({
      schemaVersion: "1",
      // /api/mcp is stateless: each call gets a fresh, unlinkable session id.
      sessionId: `ofs_${randomBytes(6).toString("hex")}`,
      releaseId: `rel_${randomBytes(5).toString("hex")}`,
      ...corpoSafeDto(envelope, gateway.LIST_MAX),
    });
  }
}

/**
 * `referencia` of case-bound envelopes is a CNJ number, which the firewall
 * rejects, so it is not mapped. The caller already sent it as an argument.
 */
function corpoSafeDto(envelope: QualquerSafeDTO, limiteLista: number): CorpoSafeDto {
  const omitidos = envelope.declassificacao.omitido.map((item) => ({
    code: "omitted",
    message: item,
  }));

  switch (envelope.tipo) {
    case "office_manifest": {
      const c = envelope.conteudo;
      return {
        summary: `Escritório ${c.escritorio}, papel ${c.papel}. ${c.politica} Ferramentas: ${c.ferramentas.join(", ")}.`,
        decisions: Object.entries(c.tetoDeDeclassificacao).map(([sigilo, nivel]) => ({
          id: `teto_${sigilo}`,
          text: `Fonte ${sigilo}: declassificação até ${nivel}.`,
        })),
        tasks: [],
        safeReferences: [],
        warnings: omitidos,
      };
    }
    case "case_summary": {
      const c = envelope.conteudo;
      return {
        summary: c.situacao,
        decisions: [
          { id: "fase", text: `Fase processual: ${c.fase}.` },
          { id: "orgao_julgador", text: `${c.tribunal}, ${c.grau}, ${c.orgaoJulgador}.` },
          { id: "orientacao_do_orgao", text: `Orientação do órgão: ${c.orientacaoDoOrgao}.` },
          { id: "assuntos", text: `Assuntos: ${c.assuntos.join(", ") || "nenhum catalogado"}.` },
        ],
        tasks: [],
        safeReferences: [],
        warnings: omitidos,
      };
    }
    case "knowledge_result": {
      const c = envelope.conteudo;
      const excedentes = c.itens.length - limiteLista;
      return {
        summary: `${c.quantidade} precedente(s) para ${c.consulta.join(", ") || "nenhum assunto catalogado"}.`,
        decisions: [],
        tasks: [],
        safeReferences: c.itens.slice(0, limiteLista).map((item, indice) => ({
          id: `jur_${indice + 1}`,
          label: `${item.referencia} (${item.tribunal}, ${item.orgaoJulgador}). Sentido ${item.sentido}; ${item.citavel ? "citável" : "não citável"}.`,
          kind: "public_jurisprudence",
        })),
        warnings: [
          ...omitidos,
          ...(excedentes > 0
            ? [{ code: "references_truncated", message: `${excedentes} precedente(s) além do limite de ${limiteLista} não foram listados.` }]
            : []),
          ...(c.itens.some((item) => item.ementa)
            ? [{ code: "ementa_withheld", message: "SafeDTO v1 não carrega ementa. Consulte a fonte oficial pela referência." }]
            : []),
        ],
      };
    }
    case "strategic_update": {
      const c = envelope.conteudo;
      return {
        summary: c.sintese,
        decisions: [],
        tasks: c.recomendacao.map((texto, indice) => ({
          id: `ponto_${indice + 1}`,
          text: texto,
          status: "open",
        })),
        safeReferences: [],
        warnings: omitidos,
      };
    }
    default: {
      const exaustivo: never = envelope;
      throw new Error(`Envelope sem mapeamento SafeDTO: ${(exaustivo as QualquerSafeDTO).tipo}`);
    }
  }
}
