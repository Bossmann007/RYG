import { IdentidadeRequisicao, identidadeDaRequisicao } from "@common/guards/identity.guard";
import { RegistroAuditoria } from "@models/gateway.model";
import { AuditService } from "@modules/gateway/audit.service";
import { BadRequestException, Body, Controller, HttpCode, Post, Req } from "@nestjs/common";
import { Request } from "express";

type NotaTransferencia = {
  destino: string;
  nota?: string;
};

@Controller("transfer")
export class TransferController {
  constructor(private readonly audit: AuditService) {}

  @Post("note")
  @HttpCode(200)
  async note(@Req() req: Request, @Body() body: unknown) {
    const identidade = identidadeDaRequisicao(req);
    const nota = analisarNota(body);
    await this.audit.registrar(registroDeNota(identidade, nota));
    return { registrado: true, destino: nota.destino };
  }
}

function analisarNota(body: unknown): NotaTransferencia {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new BadRequestException("destino é obrigatório.");
  }
  const bruto = body as { destino?: unknown; motivo?: unknown };
  if (typeof bruto.destino !== "string" || bruto.destino.trim() === "") {
    throw new BadRequestException("destino é obrigatório.");
  }
  const destino = bruto.destino.trim();
  if (bruto.motivo === undefined || bruto.motivo === null || bruto.motivo === "") {
    return { destino };
  }
  if (typeof bruto.motivo !== "string" || bruto.motivo.trim() === "") {
    throw new BadRequestException("motivo inválido.");
  }
  return { destino, nota: bruto.motivo.trim() };
}

function registroDeNota(identidade: IdentidadeRequisicao, nota: NotaTransferencia): RegistroAuditoria {
  const argumentos: Record<string, unknown> = {
    motivo: "transfer",
    destino: nota.destino,
  };
  if (nota.nota) {
    argumentos.nota = nota.nota;
  }
  return {
    at: new Date().toISOString(),
    identidade: identidade.id,
    nome: identidade.nome,
    papel: identidade.papel,
    origem: "hub",
    ferramenta: "transfer_note",
    argumentos,
    decisao: "permitido",
    motivo: "transfer",
    omitido: [],
    duracaoMs: 0,
  };
}
