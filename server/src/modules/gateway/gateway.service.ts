import {
  Identidade,
  Origem,
  RegistroAuditoria,
  ResultadoFerramenta,
} from "@models/gateway.model";
import { QualquerSafeDTO } from "@models/safe-dto.model";
import { Injectable, Logger } from "@nestjs/common";
import { XirpRunsService } from "@modules/xirp/xirp-runs.service";
import { AuditService } from "./audit.service";
import { FalhaDeDeclassificacao } from "./declassify.service";
import { PolicyService } from "./policy.service";
import { SafeDtoEgressService } from "./safe-dto-egress.service";
import { FerramentaGateway, ToolCatalogService } from "./tool-catalog.service";

/**
 * O gateway. Único caminho entre o acervo e qualquer IA externa:
 *
 *   identidade → política (default deny) → validação → execução →
 *   declassificação verificada → auditoria
 *
 * Fail closed em toda etapa. Se a declassificação não conseguir provar que a
 * saída é segura, a resposta é a mesma de uma negação de política: nada sai.
 * Falhar fechado significa que um bug no declassificador vira indisponibilidade,
 * nunca vazamento.
 */
@Injectable()
export class GatewayService {
  private readonly logger = new Logger(GatewayService.name);

  constructor(
    private policyService: PolicyService,
    private auditService: AuditService,
    private toolCatalogService: ToolCatalogService,
    private safeDtoEgress: SafeDtoEgressService,
    private xirpRuns: XirpRunsService,
  ) {}

  ferramentasPara(identidade: Identidade | null): FerramentaGateway[] {
    const permitidas = this.policyService.ferramentasPermitidas(identidade);

    return this.toolCatalogService
      .listar()
      .filter((ferramenta) => permitidas.includes(ferramenta.nome));
  }

  async executar(
    nome: string,
    argumentos: Record<string, unknown>,
    identidade: Identidade | null,
    origem: Origem
  ): Promise<ResultadoFerramenta> {
    const inicio = Date.now();
    const ferramenta = this.toolCatalogService.buscar(nome);

    if (!ferramenta) {
      return this.negar(
        nome,
        argumentos,
        identidade,
        origem,
        inicio,
        `Ferramenta '${nome}' não existe no gateway.`
      );
    }

    const avaliacao = this.policyService.avaliar(identidade, nome);

    if (avaliacao.decisao === "negado") {
      return this.negar(nome, argumentos, identidade, origem, inicio, avaliacao.motivo);
    }

    const validacao = ferramenta.esquema.safeParse(argumentos);

    if (!validacao.success) {
      const detalhe = validacao.error.issues
        .map((problema) => `${problema.path.join(".") || "(raiz)"}: ${problema.message}`)
        .join("; ");

      return this.negar(
        nome,
        argumentos,
        identidade,
        origem,
        inicio,
        `Argumentos inválidos — ${detalhe}`
      );
    }

    let dto: QualquerSafeDTO;

    try {
      dto = await ferramenta.executar(
        validacao.data as Record<string, unknown>,
        identidade
      );
    } catch (erro) {
      // Falha de declassificação não é erro de aplicação: é a barreira
      // funcionando. Vira negação, com a mesma trilha das demais.
      const motivo =
        erro instanceof FalhaDeDeclassificacao
          ? `Declassificação reprovada — ${erro.motivo}`
          : erro instanceof Error
            ? erro.message
            : "Falha ao consultar o acervo.";

      return this.negar(nome, argumentos, identidade, origem, inicio, motivo);
    }

    const egress = await this.safeDtoEgress.liberar(dto);
    if (!egress.ok) {
      return this.negar(
        nome,
        argumentos,
        identidade,
        origem,
        inicio,
        `SafeDTO egress reprovado — ${egress.code}`,
      );
    }

    // Record before the allow audit and before returning wire. The client has
    // not received SafeDTO bytes yet, so a durable-store failure can fail closed.
    if (identidade) {
      try {
        await this.xirpRuns.recordFromRelease({
          identidade,
          ferramenta: nome,
          argumentos: validacao.data as Record<string, unknown>,
          dto: egress.dto,
        });
      } catch (erro) {
        this.logger.warn(
          `Xirp record failed for ${egress.dto.releaseId}: ${erro instanceof Error ? erro.message : "erro"}`,
        );
        return this.negar(
          nome,
          argumentos,
          identidade,
          origem,
          inicio,
          "Xirp record failed.",
        );
      }
    }

    await this.auditService.registrar({
      ...this.registro(nome, argumentos, identidade, origem, inicio, "permitido"),
      sigiloOrigem: dto.declassificacao.sigiloOrigem,
      nivel: dto.declassificacao.nivel,
      omitido: dto.declassificacao.omitido,
    });

    return { decisao: "permitido", ferramenta: nome, dto: egress.dto, wire: egress.wire };
  }

  private async negar(
    nome: string,
    argumentos: Record<string, unknown>,
    identidade: Identidade | null,
    origem: Origem,
    inicio: number,
    motivo?: string
  ): Promise<ResultadoFerramenta> {
    this.logger.warn(`Negado '${nome}' para ${identidade?.id || "anônimo"}: ${motivo}`);

    await this.auditService.registrar({
      ...this.registro(nome, argumentos, identidade, origem, inicio, "negado"),
      motivo,
    });

    return { decisao: "negado", ferramenta: nome, motivo };
  }

  private registro(
    ferramenta: string,
    argumentos: Record<string, unknown>,
    identidade: Identidade | null,
    origem: Origem,
    inicio: number,
    decisao: "permitido" | "negado"
  ): RegistroAuditoria {
    return {
      at: new Date().toISOString(),
      identidade: identidade?.id || "anonimo",
      nome: identidade?.nome || "(sem credencial)",
      papel: identidade?.papel || "desconhecido",
      origem,
      ferramenta,
      argumentos,
      decisao,
      omitido: [],
      duracaoMs: Date.now() - inicio,
    };
  }
}
