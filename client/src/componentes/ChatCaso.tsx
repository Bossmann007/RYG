import { ChangeEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { enviarMensagemChat, listarChat } from "../api";
import { EQUIPE } from "../dados";
import { MembroEquipe, Mensagem } from "../tipos";

const CONSULTA_MENCAO = /(^|\s)@([\p{L}\p{M}]*)$/u;
const NOMES_MENCIONAVEIS = new RegExp(`(@(?:${EQUIPE.map((p) => p.nome).join("|")}))`, "g");

function semAcento(valor: string) {
  return valor.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function horaMensagem(mensagem: Mensagem): string {
  if (mensagem.createdAt) {
    return new Date(mensagem.createdAt).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }
  return mensagem.hora || "";
}

function TextoMensagem({ texto }: { texto: string }) {
  return <p>{texto.split(NOMES_MENCIONAVEIS).map((parte, indice) =>
    EQUIPE.some((pessoa) => `@${pessoa.nome}` === parte)
      ? <span key={indice} className="mencao">{parte}</span>
      : parte
  )}</p>;
}

type Tentativa = { id: string; mensagem: string };

export function ChatCaso({ processoId }: { processoId?: string }) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState("");
  const [consulta, setConsulta] = useState<string | null>(null);
  const [destacado, setDestacado] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState<Tentativa | null>(null);
  const campoRef = useRef<HTMLInputElement>(null);
  const corpoRef = useRef<HTMLDivElement>(null);
  const caretRef = useRef<number | null>(null);

  const sugestoes = useMemo(() => {
    if (consulta === null) return [];
    const termo = semAcento(consulta);
    return EQUIPE.filter((pessoa) =>
      [...pessoa.nome.split(" "), pessoa.papel].some((alvo) => semAcento(alvo).startsWith(termo))
    );
  }, [consulta]);
  const listaAberta = consulta !== null && sugestoes.length > 0;

  useEffect(() => {
    setMensagens([]);
    setCursor(null);
    setErro("");
    setTentativa(null);
    if (!processoId) return;
    const controle = new AbortController();
    setCarregando(true);
    listarChat(processoId, undefined, controle.signal)
      .then((pagina) => {
        setMensagens(pagina.mensagens);
        setCursor(pagina.proximoCursor);
      })
      .catch((falha) => {
        if (falha instanceof DOMException && falha.name === "AbortError") return;
        setErro(falha instanceof Error ? falha.message : "Falha ao carregar o chat.");
      })
      .finally(() => { if (!controle.signal.aborted) setCarregando(false); });
    return () => controle.abort();
  }, [processoId]);

  useEffect(() => {
    const corpo = corpoRef.current;
    if (corpo) corpo.scrollTop = corpo.scrollHeight;
  }, [mensagens.length]);

  useEffect(() => {
    if (caretRef.current === null) return;
    const campo = campoRef.current;
    if (campo) {
      campo.focus();
      campo.setSelectionRange(caretRef.current, caretRef.current);
    }
    caretRef.current = null;
  }, [texto]);

  function aoDigitar(evento: ChangeEvent<HTMLInputElement>) {
    const valor = evento.target.value;
    const posicao = evento.target.selectionStart ?? valor.length;
    const achado = CONSULTA_MENCAO.exec(valor.slice(0, posicao));
    setTexto(valor);
    if (tentativa && tentativa.mensagem !== valor.trim()) setTentativa(null);
    setConsulta(achado ? achado[2] : null);
    setDestacado(0);
  }

  function marcar(pessoa: MembroEquipe) {
    const posicao = campoRef.current?.selectionStart ?? texto.length;
    const antes = texto.slice(0, posicao).replace(CONSULTA_MENCAO, `$1@${pessoa.nome} `);
    setTexto(antes + texto.slice(posicao));
    setTentativa(null);
    caretRef.current = antes.length;
    setConsulta(null);
  }

  async function enviar() {
    const limpa = texto.trim();
    if (!processoId || !limpa || enviando) return;
    const atual = tentativa?.mensagem === limpa
      ? tentativa
      : { id: crypto.randomUUID(), mensagem: limpa };
    setTentativa(atual);
    setEnviando(true);
    setErro("");
    try {
      const salva = await enviarMensagemChat(processoId, atual.id, atual.mensagem);
      setMensagens((lista) => lista.some((item) => item.id === salva.id) ? lista : [...lista, salva]);
      setTexto((valor) => valor.trim() === atual.mensagem ? "" : valor);
      setTentativa(null);
      setConsulta(null);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Falha ao salvar a mensagem.");
    } finally {
      setEnviando(false);
    }
  }

  async function carregarAnteriores() {
    if (!processoId || !cursor || carregando) return;
    setCarregando(true);
    setErro("");
    try {
      const pagina = await listarChat(processoId, cursor);
      setMensagens((atuais) => {
        const ids = new Set(atuais.map((item) => item.id));
        return [...pagina.mensagens.filter((item) => !ids.has(item.id)), ...atuais];
      });
      setCursor(pagina.proximoCursor);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Falha ao carregar mensagens anteriores.");
    } finally {
      setCarregando(false);
    }
  }

  function aoTeclar(evento: KeyboardEvent<HTMLInputElement>) {
    if (listaAberta) {
      if (evento.key === "ArrowDown") {
        evento.preventDefault();
        setDestacado((atual) => (atual + 1) % sugestoes.length);
        return;
      }
      if (evento.key === "ArrowUp") {
        evento.preventDefault();
        setDestacado((atual) => (atual - 1 + sugestoes.length) % sugestoes.length);
        return;
      }
      if (evento.key === "Enter" || evento.key === "Tab") {
        evento.preventDefault();
        marcar(sugestoes[destacado]);
        return;
      }
      if (evento.key === "Escape") {
        evento.preventDefault();
        setConsulta(null);
        return;
      }
    }
    if (evento.key === "Enter") {
      evento.preventDefault();
      void enviar();
    }
  }

  return (
    <section className="painel">
      <header className="painel-cabeca compacta">
        <div><h3>Canal do caso</h3><p>Histórico persistente vinculado ao processo.</p></div>
        <span className="selo neutro">Remetente simulado</span>
      </header>

      {!processoId ? (
        <div className="vazio"><p>Processo sem identificador interno para abrir o chat.</p></div>
      ) : (
        <>
          {cursor && <button className="chip chat-anteriores" type="button" onClick={carregarAnteriores} disabled={carregando}>{carregando ? "Carregando…" : "Carregar anteriores"}</button>}
          <div className="chat-corpo" ref={corpoRef}>
            {!carregando && mensagens.length === 0 && !erro ? <div className="vazio"><p>Nenhuma mensagem registrada neste processo.</p></div> : null}
            {mensagens.map((mensagem) => (
              <article key={mensagem.id} className={["balao", mensagem.ia ? "ia" : "", mensagem.propria ? "propria" : ""].filter(Boolean).join(" ")}>
                <header>
                  <strong>{mensagem.autora}{mensagem.simulada ? " · simulado" : ""}</strong>
                  <span>{mensagem.papel} · {horaMensagem(mensagem)}</span>
                </header>
                <TextoMensagem texto={mensagem.texto} />
              </article>
            ))}
          </div>
          {erro && <p className="chat-erro" role="alert">{erro}</p>}
          <div className="compositor">
            {listaAberta && (
              <ul className="sugestoes" role="listbox">
                {sugestoes.map((pessoa, indice) => (
                  <li key={pessoa.id}>
                    <button type="button" className={indice === destacado ? "ativa" : undefined} onMouseEnter={() => setDestacado(indice)} onMouseDown={(evento) => { evento.preventDefault(); marcar(pessoa); }}>
                      <span className="sugestao-selo">{pessoa.iniciais}</span>
                      <span><strong>{pessoa.nome}</strong><small>{pessoa.papel}</small></span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <input ref={campoRef} value={texto} maxLength={8000} onChange={aoDigitar} onKeyDown={aoTeclar} placeholder="Escreva no canal do caso. Use @ para marcar alguém." aria-label="Nova mensagem no canal do caso" />
            <button className="botao-enviar" type="button" onClick={() => void enviar()} disabled={enviando || texto.trim().length === 0}>{enviando ? "Salvando…" : "Enviar"}</button>
          </div>
        </>
      )}
    </section>
  );
}
