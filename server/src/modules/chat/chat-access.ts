import type { Request } from "express";

export type ChatAccessEnvironment = {
  enabled?: string;
  nodeEnv?: string;
};

export function acessoChatLocalPermitido(
  req: Pick<Request, "headers" | "ip" | "socket">,
  env: ChatAccessEnvironment
): boolean {
  if (env.enabled !== "true" || env.nodeEnv === "production") {
    return false;
  }

  if (
    req.headers["x-forwarded-for"] ||
    req.headers["x-forwarded-host"] ||
    req.headers["x-forwarded-proto"]
  ) {
    return false;
  }

  if (!enderecoLoopback(req.ip) || !enderecoLoopback(req.socket.remoteAddress)) {
    return false;
  }

  const host = valorCabecalho(req.headers.host);
  if (!host || !hostLocal(host)) {
    return false;
  }

  const origin = valorCabecalho(req.headers.origin);
  return !origin || originLocal(origin);
}

function valorCabecalho(valor: string | string[] | undefined): string {
  return Array.isArray(valor) ? "" : String(valor || "").trim();
}

function enderecoLoopback(valor?: string | null): boolean {
  const endereco = String(valor || "").trim().toLowerCase();
  return (
    endereco === "::1" ||
    endereco === "127.0.0.1" ||
    endereco === "::ffff:127.0.0.1"
  );
}

function hostLocal(valor: string): boolean {
  try {
    const url = new URL(`http://${valor}`);
    return hostnameLocal(url.hostname);
  } catch {
    return false;
  }
}

function originLocal(valor: string): boolean {
  try {
    const url = new URL(valor);
    return url.protocol === "http:" && hostnameLocal(url.hostname);
  } catch {
    return false;
  }
}

function hostnameLocal(valor: string): boolean {
  const hostname = valor.replace(/^\[|\]$/g, "").toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}
