import { RegistroAuditoria } from "@models/gateway.model";
import { Injectable, Logger } from "@nestjs/common";
import { appendFile, mkdir } from "fs/promises";
import { dirname, resolve } from "path";

const LIMITE_MEMORIA = 200;

/**
 * Trilha de auditoria append-only. Cada passagem pelo gateway vira uma linha —
 * inclusive as negadas, que são justamente as que interessam numa auditoria.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private readonly recentes: RegistroAuditoria[] = [];
  private readonly arquivo = resolve(
    process.env.GATEWAY_AUDIT_FILE || "audit/auditoria.jsonl"
  );

  async registrar(registro: RegistroAuditoria): Promise<void> {
    this.recentes.unshift(registro);

    if (this.recentes.length > LIMITE_MEMORIA) {
      this.recentes.length = LIMITE_MEMORIA;
    }

    try {
      await mkdir(dirname(this.arquivo), { recursive: true });
      await appendFile(
        this.arquivo,
        JSON.stringify(registro) + "\n",
        "utf-8"
      );
    } catch (erro) {
      // A trilha em disco não pode derrubar a requisição; o log fica avisado.
      this.logger.error(`Falha ao gravar auditoria: ${erro}`);
    }
  }

  listar(limite = 50): RegistroAuditoria[] {
    return this.recentes.slice(0, limite);
  }
}
