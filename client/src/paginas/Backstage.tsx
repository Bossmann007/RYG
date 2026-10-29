import { CSSProperties, FormEvent, useEffect, useState } from "react";
import {
  CatalogItem,
  EnviarWhatsappPedido,
  WHATSAPP_CLASSIFICACOES,
  WHATSAPP_TEMPLATES,
  WhatsappClassificacao,
  WhatsappStatus,
  WhatsappTemplateId,
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

type EstadoEnvio =
  | { fase: "ocioso" }
  | { fase: "enviando" }
  | {
      fase: "aguardando_confirmacao";
      pedido: EnviarWhatsappPedido;
      desafio: string;
      expiraEm: string;
    }
  | { fase: "enviado"; id: string; modo: string }
  | { fase: "erro"; mensagem: string };

const ROTULO_CLASSIFICACAO: Record<WhatsappClassificacao, string> = {
  publico: "Público",
  interno: "Interno",
  sigiloso: "Sigiloso",
  segredo_justica: "Segredo de justiça",
};

const estiloCampo: CSSProperties = {
  width: "100%",
  border: "1px solid var(--linha)",
  borderRadius: "14px",
  padding: "12px 14px",
  background: "var(--papel)",
  color: "var(--texto)",
};

function FormEnvioWhatsapp() {
  const [para, setPara] = useState("");
  const [texto, setTexto] = useState("");
  const [classification, setClassification] = useState<WhatsappClassificacao | "">("");
  const [classificationAck, setClassificationAck] = useState(false);
  const [templateId, setTemplateId] = useState<WhatsappTemplateId | "">("");
  const [safeDtoReleaseId, setSafeDtoReleaseId] = useState("");
  const [envio, setEnvio] = useState<EstadoEnvio>({ fase: "ocioso" });

  const bloqueado = envio.fase === "enviando" || envio.fase === "aguardando_confirmacao";

  async function disparar(pedido: EnviarWhatsappPedido) {
    setEnvio({ fase: "enviando" });
    try {
      const resultado = await enviarWhatsapp(pedido);
      if (resultado.status === "confirmacao_necessaria") {
        setEnvio({
          fase: "aguardando_confirmacao",
          pedido,
          desafio: resultado.desafio,
          expiraEm: resultado.expiraEm,
        });
        return;
      }
      setEnvio({ fase: "enviado", id: resultado.id, modo: resultado.modo });
      setTexto("");
      setClassificationAck(false);
    } catch (falha) {
      setEnvio({
        fase: "erro",
        mensagem: falha instanceof Error ? falha.message : "Falha ao enviar WhatsApp.",
      });
    }
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (bloqueado || !classification || !classificationAck) return;
    void disparar({
      para: para.trim(),
      texto: texto.trim(),
      classification,
      classificationAck,
      templateId: templateId || undefined,
      safeDtoReleaseId: safeDtoReleaseId.trim() || undefined,
    });
  }

  return (
    <form
      className="compositor"
      style={{ flexDirection: "column", alignItems: "stretch", marginTop: "1rem" }}
      onSubmit={enviar}
    >
      <fieldset
        disabled={bloqueado}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          border: 0,
          padding: 0,
          margin: 0,
          minWidth: 0,
        }}
      >
        <input
          value={para}
          onChange={(e) => setPara(e.target.value)}
          placeholder="Para (telefone com DDI)"
          aria-label="Destino"
          required
        />
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Mensagem"
          aria-label="Mensagem"
          rows={4}
          required
          style={{ ...estiloCampo, resize: "vertical" }}
        />
        <select
          value={classification}
          onChange={(e) =>
            setClassification(WHATSAPP_CLASSIFICACOES.find((c) => c === e.target.value) ?? "")
          }
          aria-label="Classificação do conteúdo"
          required
          style={estiloCampo}
        >
          <option value="">Classificação do conteúdo…</option>
          {WHATSAPP_CLASSIFICACOES.map((c) => (
            <option key={c} value={c}>
              {ROTULO_CLASSIFICACAO[c]}
            </option>
          ))}
        </select>
        <select
          value={templateId}
          onChange={(e) =>
            setTemplateId(WHATSAPP_TEMPLATES.find((t) => t === e.target.value) ?? "")
          }
          aria-label="Template aprovado"
          style={estiloCampo}
        >
          <option value="">Sem template (texto livre)</option>
          {WHATSAPP_TEMPLATES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          value={safeDtoReleaseId}
          onChange={(e) => setSafeDtoReleaseId(e.target.value)}
          placeholder="safeDtoReleaseId (rel_…), opcional"
          aria-label="safeDtoReleaseId"
        />
        <p className="cartao-meta">
          CPF, CNPJ, número CNJ ou e-mail no texto exigem template aprovado ou release SafeDTO.
        </p>
        <label style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
          <input
            type="checkbox"
            checked={classificationAck}
            onChange={(e) => setClassificationAck(e.target.checked)}
            style={{ flex: "none", padding: 0, marginTop: "4px" }}
          />
          <span>
            Revisei a mensagem: a classificação escolhida está correta e o conteúdo pode sair do
            hub por WhatsApp.
          </span>
        </label>
        <div>
          <button type="submit" disabled={bloqueado || !classification || !classificationAck}>
            {envio.fase === "enviando" ? "Enviando…" : "Enviar WhatsApp"}
          </button>
        </div>
      </fieldset>

      {envio.fase === "aguardando_confirmacao" && (
        <div role="alert">
          <p>
            Confirmação humana necessária para enviar a <strong>{envio.pedido.para}</strong> (
            {ROTULO_CLASSIFICACAO[envio.pedido.classification]}). Desafio{" "}
            <strong>{envio.desafio}</strong>, válido até{" "}
            {new Date(envio.expiraEm).toLocaleTimeString("pt-BR")}.
          </p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => void disparar({ ...envio.pedido, confirmacao: envio.desafio })}
            >
              Confirmar envio
            </button>
            <button type="button" className="voltar" onClick={() => setEnvio({ fase: "ocioso" })}>
              Cancelar
            </button>
          </div>
        </div>
      )}
      {envio.fase === "enviado" && (
        <p className="selo status-ATIVO" role="status">
          Enviado ({envio.modo || "ok"}) · id {envio.id}
        </p>
      )}
      {envio.fase === "erro" && (
        <p className="chat-erro" role="alert">
          {envio.mensagem}
        </p>
      )}
    </form>
  );
}

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
    const item = itens.find((entrada) => entrada.id === id);
    let releaseId: string | undefined;
    if (item?.requerSafeDto) {
      const digitado = window.prompt(
        "Este prompt exige SafeDTO. Cole o safeDtoReleaseId da liberação HITL:",
      );
      if (!digitado?.trim()) {
        setExportado("Export cancelado: falta safeDtoReleaseId.");
        return;
      }
      releaseId = digitado.trim();
    }
    const prompt = await exportarPromptCatalogo(id, releaseId);
    await navigator.clipboard.writeText(prompt.corpo);
    setExportado(
      prompt.requerSafeDto
        ? "Copiado. Release SafeDTO registrado na auditoria."
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
  const live = tools.filter((item) => item.status === "live");

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
        {live.length} tools live · {tools.length} tools no catálogo · {itens.length} entradas
      </p>

      <div className="catalogo-grid">
        {itens.map((item) => (
          <article key={item.id} className="cartao-suave">
            <div className="selos">
              <span className="selo neutro">{item.kind}</span>
              <span className="selo neutro">{item.area}</span>
              {item.status ? <span className="selo neutro">{item.status}</span> : null}
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
        <FormEnvioWhatsapp />
      </article>
    </section>
  );
}

/** @deprecated Prefer Backstage */
export { Backstage as CatalogoBancario };
