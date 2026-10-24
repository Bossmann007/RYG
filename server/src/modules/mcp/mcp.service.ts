import { Identidade } from "@models/gateway.model";
import { GatewayService } from "@modules/gateway/gateway.service";
import { Injectable } from "@nestjs/common";
import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

const NOME_SERVIDOR = "openlegalai-office";
const VERSAO = "0.2.0";

/**
 * Monta um McpServer por requisicao, com a lista de ferramentas ja recortada
 * pelo papel de quem chamou. Toda execucao passa pelo GatewayService.
 */
@Injectable()
export class McpService {
  constructor(private gatewayService: GatewayService) {}

  async criarServidor(identidade: Identidade | null): Promise<McpServer> {
    // ESM puro: import dinamico dentro de um modulo CommonJS (o Nest compila CJS).
    const { McpServer } = await import("@modelcontextprotocol/server");

    const servidor = new McpServer({ name: NOME_SERVIDOR, version: VERSAO });

    for (const ferramenta of this.gatewayService.ferramentasPara(identidade)) {
      servidor.registerTool(
        ferramenta.nome,
        {
          title: ferramenta.titulo,
          description: ferramenta.descricao,
          inputSchema: ferramenta.esquema as unknown as z.ZodObject<z.ZodRawShape>,
          annotations: {
            readOnlyHint: ferramenta.somenteLeitura,
            openWorldHint: false,
          },
        },
        async (argumentos: Record<string, unknown>) => {
          const resultado = await this.gatewayService.executar(
            ferramenta.nome,
            argumentos,
            identidade,
            "mcp"
          );

          if (resultado.decisao === "negado") {
            return {
              isError: true,
              content: [
                {
                  type: "text" as const,
                  text: `Gateway negou a chamada: ${resultado.motivo}`,
                },
              ],
            };
          }

          // `structuredContent` entrega o SafeDTO validado; o texto são os bytes
          // de `serializeSafeDtoForMcp` que passaram pelo firewall (ADR 0002).
          return {
            structuredContent: resultado.dto,
            content: [{ type: "text" as const, text: resultado.wire }],
          };
        }
      );
    }

    return servidor;
  }
}
