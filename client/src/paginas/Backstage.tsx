import { useEffect, useState } from "react";
import {
  CatalogItem,
  WhatsappStatus,
  conectarWhatsappStub,
  exportarPromptCatalogo,
  listarCatalogo,
  obterStatusWhatsapp,
  iniciarOauthWhatsapp,
} from "../api";

type Props = {
  onVoltar: () => void;
};

export function Backstage({ onVoltar }: Props) {
  const [itens, setItens] = useState<CatalogItem[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [exportado, setExportado] = useState<string | null>(null);
  const [wa, setWa] = useState<WhatsappStatus | null>(null);

  useEffect(() => {
    let cancelado = false;
    listarCatalogo()
      .then((lista) => {
        if (!cancelado) setItens(lista);
      })
      .catch((falha: unknown) => {
        if (!cancelado) {
          setErro(falha instanceof Error ? falha.message : "Catálogo indisponível.");
        }
      });
    obterStatusWhatsapp()
      .then((status) => {
        if (!cancelado) setWa(status);
      })
      .catch(() => {
        /* optional */
      });
    return () => {
      cancelado = true;
    };
  }, []);

  async function exportar(id: string) {
    const prompt = await exportarPromptCatalogo(id);
    await navigator.clipboard.writeText(prompt.corpo);
    setExportado(
      prompt.requerSafeDto
        ? "Copiado. Este prompt exige SafeDTO se houver PII do cliente."
        : "Prompt copiado para linked-provider."
    );
  }

  async function conectarWa() {
    const status = await conectarWhatsappStub();
    setWa(status);
  }

  async function oauthWa() {
    const inicio = await iniciarOauthWhatsapp();
    window.open(inicio.authorizeUrl, "_blank", "noopener,noreferrer");
  }

  const tools = itens.filter((item) => item.kind === "tool");

  return (
    <section className="catalogo">
      <header className="detalhe-topo">
        <button className="voltar" type="button" onClick={onVoltar}>
          Casos
        </button>
        <div>
          <h2>Backstage</h2>
          <p>
            Catálogo de tools por área (bancário, processual, conectores). WhatsApp = envio, não
            inbox.
          </p>
        </div>
      </header>

      {erro && <p className="vazio">{erro}</p>}
      {exportado && <p className="selo neutro">{exportado}</p>}

      <p className="cartao-meta">
        {tools.length} tools · {itens.length} entradas no catálogo
      </p>

      <div className="catalogo-grid">
        {itens.map((item) => (
          <article key={item.id} className="cartao-suave">
            <div className="selos">
              <span className="selo neutro">{item.kind}</span>
              <span className="selo neutro">{item.area}</span>
              {item.requerSafeDto ? (
                <span className="selo status-ATIVO">SafeDTO</span>
              ) : null}
            </div>
            <h3>{item.titulo}</h3>
            <p>{item.descricao}</p>
            {item.endpoint ? <p className="cartao-meta">{item.endpoint}</p> : null}
            {item.kind === "prompt" ? (
              <button type="button" className="voltar" onClick={() => void exportar(item.id)}>
                Exportar prompt
              </button>
            ) : null}
          </article>
        ))}
      </div>

      <article className="cartao-suave" style={{ marginTop: "1.5rem" }}>
        <h3>WhatsApp (tool enviar_whatsapp)</h3>
        <p>
          {wa
            ? wa.conectado
              ? `Conectado (${wa.telefoneMascarado || "ok"}) · modo ${wa.modo}`
              : `Desconectado · modo ${wa.modo}`
            : "Status indisponível (subir o Nest)."}
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button type="button" className="voltar" onClick={() => void conectarWa()}>
            Conectar stub local
          </button>
          <button type="button" className="voltar" onClick={() => void oauthWa()}>
            Abrir OAuth (precisa APP_ID)
          </button>
        </div>
      </article>
    </section>
  );
}

/** @deprecated Prefer Backstage */
export { Backstage as CatalogoBancario };
