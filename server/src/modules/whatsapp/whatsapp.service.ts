import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "crypto";

export type WhatsappStatus = {
  conectado: boolean;
  modo: "stub" | "oauth";
  telefoneMascarado: string | null;
  pendenteOauth: boolean;
};

type EnviarInput = {
  para: string;
  texto: string;
  processoId?: string;
};

type DesafioEnvio = {
  officeId: string;
  para: string;
  texto: string;
  processoId: string;
  expira: number;
};

const DESAFIO_MS = 120_000;

/**
 * WhatsApp is a send tool, not the office inbox.
 * OAuth/connection skeleton only in v0 — no Meta Graph calls without keys.
 */
@Injectable()
export class WhatsappService {
  private conectado = false;
  private telefoneMascarado: string | null = null;
  private pendenteOauth = false;
  private readonly enviados: Array<EnviarInput & { em: string; id: string }> = [];
  private readonly desafios = new Map<string, DesafioEnvio>();

  constructor(private config: ConfigService) {}

  status(): WhatsappStatus {
    const appId = this.config.get<string>("WHATSAPP_APP_ID");
    return {
      conectado: this.conectado,
      modo: appId ? "oauth" : "stub",
      telefoneMascarado: this.telefoneMascarado,
      pendenteOauth: this.pendenteOauth,
    };
  }

  iniciarOauth(): { authorizeUrl: string; state: string } {
    const appId = this.config.get<string>("WHATSAPP_APP_ID") || "PENDENTE_WHATSAPP_APP_ID";
    const redirect =
      this.config.get<string>("WHATSAPP_REDIRECT_URI") ||
      "http://127.0.0.1:3000/api/whatsapp/oauth/callback";
    const state = `wa_${Date.now()}`;
    this.pendenteOauth = true;
    const authorizeUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirect)}&state=${state}&scope=whatsapp_business_management,whatsapp_business_messaging`;
    return { authorizeUrl, state };
  }

  concluirOauth(code?: string): WhatsappStatus {
    this.pendenteOauth = false;
    if (!code) {
      return this.status();
    }
    // Stub: real token exchange needs WHATSAPP_APP_SECRET — never log secrets.
    this.conectado = true;
    this.telefoneMascarado = "+55 •••••-0000";
    return this.status();
  }

  /** Local demo without Meta credentials. */
  conectarStub(): WhatsappStatus {
    this.conectado = true;
    this.telefoneMascarado = "+55 •••••-STUB";
    this.pendenteOauth = false;
    return this.status();
  }

  desconectar(): WhatsappStatus {
    this.conectado = false;
    this.telefoneMascarado = null;
    this.pendenteOauth = false;
    return this.status();
  }

  abrirDesafio(officeId: string, input: EnviarInput): { desafio: string; expiraEm: string } {
    const desafio = randomBytes(16).toString("hex");
    const expira = Date.now() + DESAFIO_MS;
    this.desafios.set(desafio, {
      officeId,
      para: input.para,
      texto: input.texto,
      processoId: input.processoId || "",
      expira,
    });
    return { desafio, expiraEm: new Date(expira).toISOString() };
  }

  /** True only for the same office, payload, and an unexpired one-shot token. */
  consumirDesafio(desafio: string, officeId: string, input: EnviarInput): boolean {
    const salvo = this.desafios.get(desafio);
    this.desafios.delete(desafio);
    if (!salvo || salvo.expira < Date.now() || salvo.officeId !== officeId) {
      return false;
    }
    return (
      salvo.para === input.para &&
      salvo.texto === input.texto &&
      salvo.processoId === (input.processoId || "")
    );
  }

  enviar(input: EnviarInput): { ok: boolean; id: string; modo: string; erro?: string } {
    if (!this.conectado) {
      return {
        ok: false,
        id: "",
        modo: "desconectado",
        erro: "Conecte o WhatsApp (OAuth ou stub) antes de enviar.",
      };
    }
    const id = `wa_msg_${this.enviados.length + 1}`;
    this.enviados.push({ ...input, id, em: new Date().toISOString() });
    return { ok: true, id, modo: "stub_fila_local" };
  }

  historicoLocal() {
    return this.enviados.slice(-20);
  }
}
