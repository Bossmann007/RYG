import { FormEvent, useEffect, useState } from "react";
import {
  WorkspaceMessage,
  WorkspaceThread,
  abrirWorkspaceDm,
  enviarWorkspaceMensagem,
  listarWorkspaceDms,
  listarWorkspaceMensagens,
} from "../api";

type Props = {
  onVoltar: () => void;
};

export function Workspace({ onVoltar }: Props) {
  const [threads, setThreads] = useState<WorkspaceThread[]>([]);
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<WorkspaceMessage[]>([]);
  const [peerUserId, setPeerUserId] = useState("");
  const [corpo, setCorpo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  async function carregarLista() {
    const lista = await listarWorkspaceDms();
    setThreads(lista);
    return lista;
  }

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    setErro(null);
    carregarLista()
      .then((lista) => {
        if (!cancelado) {
          setThreads(lista);
        }
      })
      .catch((falha: unknown) => {
        if (!cancelado) {
          setErro(falha instanceof Error ? falha.message : "Mensagens indisponíveis.");
        }
      })
      .finally(() => {
        if (!cancelado) {
          setCarregando(false);
        }
      });
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    if (!selecionada) {
      setMensagens([]);
      return;
    }
    let cancelado = false;
    setErro(null);
    listarWorkspaceMensagens(selecionada)
      .then((lista) => {
        if (!cancelado) {
          setMensagens(lista);
        }
      })
      .catch((falha: unknown) => {
        if (!cancelado) {
          setErro(falha instanceof Error ? falha.message : "Thread indisponível.");
        }
      });
    return () => {
      cancelado = true;
    };
  }, [selecionada]);

  async function abrirDm(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    try {
      const threadId = await abrirWorkspaceDm(peerUserId.trim());
      const lista = await carregarLista();
      setThreads(lista);
      setSelecionada(threadId);
      setPeerUserId("");
    } catch (falha: unknown) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível abrir o DM.");
    }
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!selecionada) {
      return;
    }
    setErro(null);
    try {
      await enviarWorkspaceMensagem(selecionada, corpo);
      setCorpo("");
      setMensagens(await listarWorkspaceMensagens(selecionada));
    } catch (falha: unknown) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível enviar.");
    }
  }

  return (
    <section className="catalogo">
      <header className="detalhe-topo">
        <button className="voltar" type="button" onClick={onVoltar}>
          Casos
        </button>
        <div>
          <h2>Mensagens</h2>
          <p>DMs internos do escritório. Chat por caso continua na capa.</p>
        </div>
      </header>

      {erro && <p className="vazio">{erro}</p>}
      {carregando && !erro && <p className="vazio">Carregando threads…</p>}
      {!carregando && !erro && threads.length === 0 && (
        <p className="vazio">Nenhuma conversa ainda. Abra um DM pelo id do colega.</p>
      )}

      {threads.length > 0 && (
        <ul>
          {threads.map((thread) => (
            <li key={thread.id}>
              <button
                className="voltar"
                type="button"
                onClick={() => setSelecionada(thread.id)}
              >
                {thread.id}
                {selecionada === thread.id ? " · aberta" : ""}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={abrirDm}>
        <label>
          Abrir DM (peer user id)
          <input
            value={peerUserId}
            onChange={(evento) => setPeerUserId(evento.target.value)}
            placeholder="u-002"
            required
          />
        </label>
        <button type="submit">Abrir</button>
      </form>

      {selecionada && (
        <>
          <div>
            {mensagens.map((mensagem) => (
              <p key={mensagem.id}>
                <strong>{mensagem.authorId}</strong>: {mensagem.body}
              </p>
            ))}
            {mensagens.length === 0 && (
              <p className="vazio">Sem mensagens nesta thread.</p>
            )}
          </div>
          <form onSubmit={enviar}>
            <label>
              Mensagem
              <input
                value={corpo}
                onChange={(evento) => setCorpo(evento.target.value)}
                placeholder="ola @u-002"
                required
              />
            </label>
            <button type="submit">Enviar</button>
          </form>
        </>
      )}
    </section>
  );
}
