import { EnvelopeSafe } from "@models/safe-dto.model";
import { Injectable, Logger } from "@nestjs/common";
import { createHash, randomBytes } from "crypto";

export type SafeDtoWire = {
  schemaVersion: "1";
  sessionId: string;
  releaseId: string;
  summary: string;
  decisions: Array<{ id: string; text: string }>;
  tasks: Array<{ id: string; text: string; status: "open" | "done" }>;
  safeReferences: Array<{
    id: string;
    label: string;
    kind: "public_jurisprudence" | "internal_case_ref" | "workproduct_ref";
  }>;
  warnings: Array<{ code: string; message: string }>;
};

export type EgressOk = { ok: true; dto: SafeDtoWire; wire: string };
export type EgressFail = { ok: false; reason: string };

/**
 * Maps Nest-internal EnvelopeSafe to privacy-gateway SafeDTO and runs
 * validate + serialize + firewall before MCP wire egress (ADR 0002).
 */
@Injectable()
export class SafeDtoEgressService {
  private readonly logger = new Logger(SafeDtoEgressService.name);
  private gatewayPromise: Promise<typeof import("@openlegalai/privacy-gateway")> | null =
    null;

  private carregarGateway() {
    if (!this.gatewayPromise) {
      this.gatewayPromise = import("@openlegalai/privacy-gateway");
    }
    return this.gatewayPromise;
  }

  async liberar(
    envelope: EnvelopeSafe<string, unknown>,
    identidadeId: string,
  ): Promise<EgressOk | EgressFail> {
    const dto = this.mapear(envelope, identidadeId);
    try {
      const gateway = await this.carregarGateway();
      const checked = gateway.validateSafeDto(dto);
      if (!checked.ok) {
        return { ok: false, reason: checked.reason };
      }
      let wire: string;
      try {
        wire = gateway.serializeSafeDtoForMcp(checked.dto);
      } catch (erro) {
        return {
          ok: false,
          reason: erro instanceof Error ? erro.message : "serialize_failed",
        };
      }
      const firewall = new gateway.EgressFirewall();
      const verdict = firewall.inspect(wire);
      if (!verdict.ok) {
        return { ok: false, reason: verdict.code };
      }
      return { ok: true, dto: checked.dto as SafeDtoWire, wire };
    } catch (erro) {
      this.logger.error(
        `SafeDTO egress failed: ${erro instanceof Error ? erro.message : "unknown"}`,
      );
      return { ok: false, reason: "egress_unavailable" };
    }
  }

  private mapear(
    envelope: EnvelopeSafe<string, unknown>,
    identidadeId: string,
  ): SafeDtoWire {
    const sessionId = `ofs_${hashId(identidadeId || "anon")}`;
    const releaseId = `rel_${randomBytes(8).toString("hex")}`;
    const omitido = envelope.declassificacao?.omitido || [];
    const warnings = omitido.slice(0, 5).map((item, indice) => ({
      code: `omitted_${indice}`,
      message: String(item).slice(0, 200),
    }));

    switch (envelope.tipo) {
      case "office_manifest": {
        const c = envelope.conteudo as {
          escritorio?: string;
          papel?: string;
          politica?: string;
        };
        return {
          schemaVersion: "1",
          sessionId,
          releaseId,
          summary: String(c.politica || "Office session opened.").slice(0, 600),
          decisions: [
            {
              id: "d1",
              text: `escritorio=${String(c.escritorio || "").slice(0, 80)} papel=${String(c.papel || "").slice(0, 40)}`,
            },
          ],
          tasks: [],
          safeReferences: [],
          warnings: warnings.length
            ? warnings
            : [
                {
                  code: "session_only",
                  message: "No case body released on session lifecycle tools.",
                },
              ],
        };
      }
      case "case_summary": {
        const c = envelope.conteudo as {
          situacao?: string;
          referencia?: string;
          tribunal?: string;
        };
        return {
          schemaVersion: "1",
          sessionId,
          releaseId,
          summary: String(c.situacao || "Case summary.").slice(0, 600),
          decisions: [],
          tasks: [],
          safeReferences: c.referencia
            ? [
                {
                  id: "r1",
                  label: `${String(c.tribunal || "case")}:${String(c.referencia).slice(0, 80)}`,
                  kind: "internal_case_ref",
                },
              ]
            : [],
          warnings,
        };
      }
      case "knowledge_result": {
        const c = envelope.conteudo as {
          consulta?: string[];
          itens?: Array<{
            referencia?: string;
            citavel?: boolean;
            ementa?: string | null;
            tribunal?: string;
          }>;
        };
        const refs = (c.itens || [])
          .filter((item) => item.citavel && item.ementa)
          .slice(0, 5)
          .map((item, indice) => ({
            id: `k${indice}`,
            label: `${String(item.tribunal || "pub")}:${String(item.referencia || "").slice(0, 80)}`,
            kind: "public_jurisprudence" as const,
          }));
        return {
          schemaVersion: "1",
          sessionId,
          releaseId,
          summary: `Knowledge hits for ${(c.consulta || []).join(", ").slice(0, 200) || "query"}.`,
          decisions: [],
          tasks: [],
          safeReferences: refs,
          warnings: refs.length
            ? warnings
            : [
                ...warnings,
                { code: "cite_or_silent", message: "No citable ementa in this pack." },
              ],
        };
      }
      case "strategic_update": {
        const c = envelope.conteudo as {
          sintese?: string;
          recomendacao?: string[];
        };
        const decisions = (c.recomendacao || []).slice(0, 5).map((texto, indice) => ({
          id: `s${indice}`,
          text: String(texto).slice(0, 600),
        }));
        return {
          schemaVersion: "1",
          sessionId,
          releaseId,
          summary: String(c.sintese || "Strategic update.").slice(0, 600),
          decisions,
          tasks: [],
          safeReferences: [],
          warnings,
        };
      }
      default:
        return {
          schemaVersion: "1",
          sessionId,
          releaseId,
          summary: "Release denied: unknown envelope type.",
          decisions: [],
          tasks: [],
          safeReferences: [],
          warnings: [{ code: "unknown_tipo", message: String(envelope.tipo) }],
        };
    }
  }
}

function hashId(valor: string): string {
  return createHash("sha256").update(valor).digest("hex").slice(0, 16);
}
