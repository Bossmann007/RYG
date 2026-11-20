import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Response } from "express";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    let erro: any;

    if (exception.response) {
      if (exception.response.message) {
        erro = exception.response.message;
      } else if (exception.response.data && exception.response.data.erro) {
        erro = exception.response.data.erro;
      } else {
        erro = "Erro interno do servidor!";
      }
    } else if (exception.message) {
      erro = exception.message;
    } else {
      erro = exception;
    }

    const extra = respostaExtra(exception);
    response.status(status).json(extra ? { erro, ...extra } : { erro });
  }
}

type ExtraConfirmacao = { confirmacaoNecessaria: true; desafio?: string; expiraEm?: string; proposta?: string };

function respostaExtra(exception: unknown): ExtraConfirmacao | null {
  if (!(exception instanceof HttpException)) {
    return null;
  }
  const bruto = exception.getResponse();
  if (!bruto || typeof bruto !== "object") {
    return null;
  }
  const corpo = bruto as { confirmacaoNecessaria?: unknown; desafio?: unknown; expiraEm?: unknown; proposta?: unknown };
  if (corpo.confirmacaoNecessaria !== true) {
    return null;
  }
  return {
    confirmacaoNecessaria: true,
    ...(typeof corpo.desafio === "string" ? { desafio: corpo.desafio } : {}),
    ...(typeof corpo.expiraEm === "string" ? { expiraEm: corpo.expiraEm } : {}),
    ...(typeof corpo.proposta === "string" ? { proposta: corpo.proposta } : {}),
  };
}
