import { IdentidadeRequisicao, identidadeDaRequisicao } from "@common/guards/identity.guard";
import { Public } from "@common/decorators/public.decorator";
import { RegistroAuditoria } from "@models/gateway.model";
import { Processo } from "@models/processo.model";
import { AuditService } from "@modules/gateway/audit.service";
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import { ProcessService } from "./process.service";

const LIMITE_TEXTO = 4000;
const LIMITE_LISTA = 40;

@Controller("process")
export class ProcessController {
  constructor(
    private processService: ProcessService,
    private audit: AuditService,
  ) {}

  @Public()
  @Get("source")
  fonte() {
    return {
      zone: "internal" as const,
      ...this.processService.fonteAtiva(),
      kinds: ["fixture", "datajud", "eproc", "manual", "upload"],
    };
  }

  @Get("capa/:cnj")
  capa(@Req() req: Request, @Param("cnj") cnj: string) {
    const identidade = identidadeDaRequisicao(req);
    return {
      zone: "internal" as const,
      source: this.processService.fonteAtiva().kind,
      processo: this.processService.buscarCapa(cnj, identidade.officeId),
    };
  }

  @Post("manual")
  @HttpCode(HttpStatus.OK)
  async registrarManual(@Req() req: Request, @Body() body: unknown) {
    const identidade = identidadeDaRequisicao(req);
    const processo = analisarCapaManual(body);
    const registrado = this.processService.registrarManual(identidade.officeId, processo);
    await this.audit.registrar(registroManual(identidade, registrado.processNumber));
    return {
      zone: "internal" as const,
      source: "manual" as const,
      processo: registrado,
    };
  }
}

function registroManual(
  identidade: IdentidadeRequisicao,
  processNumber: string,
): RegistroAuditoria {
  return {
    at: new Date().toISOString(),
    identidade: identidade.id,
    nome: identidade.nome,
    papel: identidade.papel,
    origem: "hub",
    ferramenta: "process_manual_register",
    argumentos: { processNumber, officeId: identidade.officeId },
    decisao: "permitido",
    motivo: "manual_capa",
    omitido: [],
    duracaoMs: 0,
  };
}

function analisarCapaManual(body: unknown): Processo {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new BadRequestException("capa manual inválida.");
  }
  const bruto = body as Partial<Processo>;
  if (typeof bruto.processNumber !== "string" || !bruto.processNumber.trim()) {
    throw new BadRequestException("processNumber é obrigatório.");
  }
  return {
    processNumber: bruto.processNumber.trim(),
    court: texto(bruto.court, "court"),
    courtUnit: texto(bruto.courtUnit, "courtUnit"),
    caseClass: texto(bruto.caseClass, "caseClass"),
    subjects: listaTextos(bruto.subjects, "subjects"),
    chamber: texto(bruto.chamber, "chamber", "—"),
    organ: texto(bruto.organ, "organ"),
    degree: texto(bruto.degree, "degree", "G1"),
    distributionDate: texto(bruto.distributionDate, "distributionDate"),
    parties: listaPartes(bruto.parties),
    movements: listaMovimentos(bruto.movements),
    thesis: texto(bruto.thesis, "thesis", ""),
    summary: texto(bruto.summary, "summary", ""),
    chamberOrientation:
      bruto.chamberOrientation === "aceita_revisao" ? "aceita_revisao" : "rejeita_revisao",
  };
}

function listaTextos(valor: unknown, campo: string): string[] {
  if (valor === undefined || valor === null) {
    return [];
  }
  if (!Array.isArray(valor) || valor.length > LIMITE_LISTA) {
    throw new BadRequestException(`${campo} inválido (máx ${LIMITE_LISTA}).`);
  }
  return valor.map((item) => {
    if (typeof item !== "string") {
      throw new BadRequestException(`${campo} deve conter strings.`);
    }
    return item.slice(0, LIMITE_TEXTO);
  });
}

function listaPartes(valor: unknown): Processo["parties"] {
  if (valor === undefined || valor === null) {
    return [];
  }
  if (!Array.isArray(valor) || valor.length > LIMITE_LISTA) {
    throw new BadRequestException(`parties inválido (máx ${LIMITE_LISTA}).`);
  }
  return valor.map((p) => ({
    papel: String((p as { papel?: string })?.papel || "").slice(0, 128),
    nome: String((p as { nome?: string })?.nome || "").slice(0, 255),
  }));
}

function listaMovimentos(valor: unknown): Processo["movements"] {
  if (valor === undefined || valor === null) {
    return [];
  }
  if (!Array.isArray(valor) || valor.length > LIMITE_LISTA) {
    throw new BadRequestException(`movements inválido (máx ${LIMITE_LISTA}).`);
  }
  return valor.map((m) => ({
    data: String((m as { data?: string })?.data || "").slice(0, 32),
    descricao: String((m as { descricao?: string })?.descricao || "").slice(0, LIMITE_TEXTO),
  }));
}

function texto(valor: unknown, campo: string, padrao?: string): string {
  if (typeof valor === "string" && valor.trim()) {
    return valor.trim().slice(0, LIMITE_TEXTO);
  }
  if (padrao !== undefined) {
    return padrao;
  }
  throw new BadRequestException(`${campo} é obrigatório.`);
}
