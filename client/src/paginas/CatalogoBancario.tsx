import { useEffect, useState } from "react";
import {
  CatalogItem,
  PedidoWhatsapp,
  WhatsappStatus,
  conectarWhatsappStub,
  enviarWhatsapp,
  exportarPromptCatalogo,
  listarCatalogo,
  obterStatusWhatsapp,
  iniciarOauthWhatsapp,
} from "../api";

type Props = {
  onVoltar: () => void;
};

export function CatalogoBancario({ onVoltar }: Props) {
  const [itens, setItens] = useState<CatalogItem[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [exportado, setExportado] = useState<string | null>(null);
  const [wa, setWa] = useState<WhatsappStatus | null>(null);
  const [para, setPara] = useState("");
  const [texto, setTexto] = useState("");
  const [revisado, setRevisado] = useState(false);
  const [pendente, setPendente] = useState<{ pedido: PedidoWhatsapp; desafio: string } | null>(null);
  const [envioMsg, setEnvioMsg] = useState<string | null>(null);
  const [envioErro, setEnvioErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

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

  function limparEnvio() {
    setPendente(null);
    setEnvioMsg(null);
    setEnvioErro(null);
  }

  async function pedirEnvio(pedido: PedidoWhatsapp) {
    setEnvioMsg(null);
    setEnvioErro(null);
    setEnviando(true);
    try {
      const resultado = await enviarWhatsapp(pedido);
      if (resultado.tipo === "desafio") {
        setPendente({ pedido, desafio: resultado.desafio });
        setEnvioMsg("Confira os dados e confirme o envio.");
      } else {
        setPendente(null);
        setEnvioMsg(`Envio registrado (modo ${resultado.modo}).`);
      }
    } catch (falha: unknown) {
      setPendente(null);
      setEnvioErro(falha instanceof Error ? falha.message : "Envio recusado.");
    } finally {
      setEnviando(false);
    }
  }

  function enviarTexto() {
    void pedirEnvio({ para: para.trim(), texto, revisao: revisado });
  }

  function enviarModelo() {
    void pedirEnvio({ para: para.trim(), templateId: "tpl-aviso-prazo", revisao: revisado });
  }

  function confirmarEnvio() {
    if (!pendente) return;
    void pedirEnvio({ ...pendente.pedido, confirmacao: pendente.desafio });
  }

  return (
    <section className="catalogo">
      <header className="detalhe-topo">
        <button className="voltar" type="button" onClick={onVoltar}>
          Casos
        </button>
        <div>
          <h2>Backstage bancário</h2>
          <p>Prompts, skills, MCP e tools. WhatsApp = envio, não inbox.</p>
        </div>
      </header>

      {erro && <p className="vazio">{erro}</p>}
      {exportado && <p className="selo neutro">{exportado}</p>}

      <div className="catalogo-grid">
        {itens.map((item) => (
          <article key={item.id} className="cartao-suave">
            <div className="selos">
              <span className="selo neutro">{item.kind}</span>
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

        <div style={{ display: "grid", gap: "0.5rem", marginTop: "1rem" }}>
          <label>
            Destino (telefone)
            <input
              type="tel"
              value={para}
              autoComplete="off"
              onChange={(e) => {
                setPara(e.target.value);
                limparEnvio();
              }}
            />
          </label>
          <label>
            Mensagem
            <textarea
              rows={3}
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                limparEnvio();
              }}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={revisado}
              onChange={(e) => {
                setRevisado(e.target.checked);
                limparEnvio();
              }}
            />{" "}
            Revisei a classificação e o texto
          </label>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button type="button" className="voltar" disabled={enviando} onClick={enviarTexto}>
              Solicitar envio
            </button>
            <button type="button" className="voltar" disabled={enviando} onClick={enviarModelo}>
              Enviar aviso de prazo (modelo fixo)
            </button>
            {pendente ? (
              <button type="button" className="voltar" disabled={enviando} onClick={confirmarEnvio}>
                Confirmar envio
              </button>
            ) : null}
          </div>
          {envioMsg ? <p className="selo neutro">{envioMsg}</p> : null}
          {envioErro ? <p className="vazio">{envioErro}</p> : null}
        </div>
      </article>
    </section>
  );
}
