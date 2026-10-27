import { Public } from "@common/decorators/public.decorator";
import { identidadeDaRequisicao } from "@common/guards/identity.guard";
import { Processo } from "@models/processo.model";
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

@Controller("process")
export class ProcessController {
  constructor(private processService: ProcessService) {}

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
    identidadeDaRequisicao(req);
    return {
      zone: "internal" as const,
      source: this.processService.fonteAtiva().kind,
      processo: this.processService.buscarCapa(cnj),
    };
  }

  @Post("manual")
  @HttpCode(HttpStatus.OK)
  registrarManual(@Req() req: Request, @Body() body: unknown) {
    identidadeDaRequisicao(req);
    const processo = analisarCapaManual(body);
    return {
      zone: "internal" as const,
      source: "manual" as const,
      processo: this.processService.registrarManual(processo),
    };
  }
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
    subjects: Array.isArray(bruto.subjects)
      ? bruto.subjects.map((s) => String(s))
      : [],
    chamber: texto(bruto.chamber, "chamber", "—"),
    organ: texto(bruto.organ, "organ"),
    degree: texto(bruto.degree, "degree", "G1"),
    distributionDate: texto(bruto.distributionDate, "distributionDate"),
    parties: Array.isArray(bruto.parties)
      ? bruto.parties.map((p) => ({
          papel: String((p as { papel?: string })?.papel || ""),
          nome: String((p as { nome?: string })?.nome || ""),
        }))
      : [],
    movements: Array.isArray(bruto.movements)
      ? bruto.movements.map((m) => ({
          data: String((m as { data?: string })?.data || ""),
          descricao: String((m as { descricao?: string })?.descricao || ""),
        }))
      : [],
    thesis: texto(bruto.thesis, "thesis", ""),
    summary: texto(bruto.summary, "summary", ""),
    chamberOrientation:
      bruto.chamberOrientation === "aceita_revisao" ? "aceita_revisao" : "rejeita_revisao",
  };
}

function texto(valor: unknown, campo: string, padrao?: string): string {
  if (typeof valor === "string" && valor.trim()) {
    return valor.trim();
  }
  if (padrao !== undefined) {
    return padrao;
  }
  throw new BadRequestException(`${campo} é obrigatório.`);
}
