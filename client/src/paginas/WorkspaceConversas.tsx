import { FormEvent, useEffect, useState } from "react";
import {
  DmResumo,
  enviarMensagemDm,
  listarDms,
  listarMensagensDm,
} from "../api";
import { Mensagem } from "../tipos";

type Props = {
  onVoltar: () => void;
};

export function WorkspaceConversas({ onVoltar }: Props) {
  const [dms, setDms] = useState<DmResumo[]>([]);
  const [ativo, setAtivo] = useState<DmResumo | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const controle = new AbortController();
    setCarregando(true);
    setErro("");
    listarDms(controle.signal)
      .then((lista) => {
        setDms(lista);
        setAtivo((atual) => atual || lista[0] || null);
      })
      .catch((falha) => {
        if (falha instanceof DOMException && falha.name === "AbortError") return;
        setErro(falha instanceof Error ? falha.message : "Falha ao listar DMs.");
        setDms([]);
      })
      .finally(() => {
        if (!controle.signal.aborted) setCarregando(false);
      });
    return () => controle.abort();
  }, []);

  useEffect(() => {
    if (!ativo) {
      setMensagens([]);
      return;
    }
    const controle = new AbortController();
    listarMensagensDm(ativo.channelId, undefined, controle.signal)
      .then((pagina) => setMensagens(pagina.mensagens))
      .catch((falha) => {
        if (falha instanceof DOMException && falha.name === "AbortError") return;
        setErro(falha instanceof Error ? falha.message : "Falha ao carregar o DM.");
      });
    return () => controle.abort();
  }, [ativo?.channelId]);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!ativo || !texto.trim() || enviando) return;
    const id = crypto.randomUUID();
    const mensagem = texto.trim();
    setEnviando(true);
    setErro("");
    try {
      const criada = await enviarMensagemDm(ativo.channelId, id, mensagem);
      setMensagens((prev) => [...prev, criada]);
      setTexto("");
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Falha ao enviar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="workspace-dm">
      <div className="detalhe-topo">
        <div>
          <button className="voltar" type="button" onClick={onVoltar}>
            Voltar
          </button>
          <h2>Conversas do escritório</h2>
          <p>DMs autenticados entre membros do mesmo office_id.</p>
        </div>
      </div>

      {carregando && <div className="vazio"><p>Carregando conversas…</p></div>}

      {!carregando && !dms.length && !erro && (
        <div className="vazio">
          <p>Nenhuma conversa ainda.</p>
          <p className="vazio-dica">Abra um DM pela API ou rode o seed workspace-dm:apply.</p>
        </div>
      )}

      {!carregando && dms.length > 0 && (
        <div className="workspace-dm-grade">
          <aside className="workspace-dm-lista" aria-label="Lista de DMs">
            {dms.map((dm) => (
              <button
                key={dm.channelId}
                type="button"
                className={ativo?.channelId === dm.channelId ? "dm-item ativo" : "dm-item"}
                onClick={() => setAtivo(dm)}
              >
                <strong>{dm.peerNome}</strong>
                <small>{dm.peerPapel}</small>
              </button>
            ))}
          </aside>

          <div className="workspace-dm-thread">
            {ativo ? (
              <>
                <header>
                  <strong>{ativo.peerNome}</strong>
                  <span>{ativo.peerPapel}</span>
                </header>
                <div className="chat-corpo">
                  {mensagens.map((mensagem) => (
                    <article
                      key={mensagem.id}
                      className={mensagem.propria ? "balao propria" : "balao"}
                    >
                      <header>
                        <strong>{mensagem.autora}</strong>
                        <span>{mensagem.papel}</span>
                      </header>
                      <p>{mensagem.texto}</p>
                    </article>
                  ))}
                  {!mensagens.length && (
                    <div className="vazio"><p>Sem mensagens neste DM.</p></div>
                  )}
                </div>
                <form className="compositor" onSubmit={enviar}>
                  <input
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    placeholder="Escreva e use @Nome para mencionar"
                    disabled={enviando}
                  />
                  <button type="submit" disabled={enviando || !texto.trim()}>
                    Enviar
                  </button>
                </form>
              </>
            ) : (
              <div className="vazio"><p>Selecione uma conversa.</p></div>
            )}
          </div>
        </div>
      )}

      {erro && <p className="chat-erro" role="alert">{erro}</p>}
    </section>
  );
}
