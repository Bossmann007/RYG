import { identidadeDaRequisicao } from "@common/guards/identity.guard";
import { BadRequestException, Body, Controller, HttpCode, HttpStatus, Post, Req } from "@nestjs/common";
import { Request } from "express";
import { RagService } from "./rag.service";

const Q_MAX = 500;

@Controller("rag")
export class RagController {
  constructor(private readonly rag: RagService) {}

  @Post("query")
  @HttpCode(HttpStatus.OK)
  async consultar(@Req() req: Request, @Body() body: { q?: unknown; caseId?: unknown }) {
    const identidade = identidadeDaRequisicao(req);
    const q = body?.q;
    if (typeof q !== "string" || q.length < 1 || q.length > Q_MAX) {
      throw new BadRequestException(`q é obrigatório (1 a ${Q_MAX} caracteres).`);
    }
    const caseId = typeof body?.caseId === "string" && body.caseId.length > 0 ? body.caseId : undefined;
    return this.rag.consultar(identidade, q, caseId);
  }

  @Post("consult")
  @HttpCode(HttpStatus.OK)
  async consultarLocal(@Req() req: Request, @Body() body: { q?: unknown; caseId?: unknown }) {
    const identidade = identidadeDaRequisicao(req);
    const q = body?.q;
    if (typeof q !== "string" || q.length < 1 || q.length > Q_MAX) {
      throw new BadRequestException(`q é obrigatório (1 a ${Q_MAX} caracteres).`);
    }
    const caseId = typeof body?.caseId === "string" && body.caseId.length > 0 ? body.caseId : undefined;
    return this.rag.consultarLocal(identidade, q, caseId);
  }

  @Post("ingest")
  @HttpCode(HttpStatus.OK)
  async ingerir(@Req() req: Request, @Body() body: { docId?: unknown }) {
    const identidade = identidadeDaRequisicao(req);
    const docId = body?.docId;
    if (typeof docId !== "string" || docId.length === 0) {
      throw new BadRequestException("docId é obrigatório.");
    }
    return this.rag.ingerir(identidade, docId);
  }
}
