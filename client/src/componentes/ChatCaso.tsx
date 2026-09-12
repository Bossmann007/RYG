import {
  ChangeEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { EQUIPE, ESCRITORIO } from "../dados";
import { MembroEquipe, Mensagem } from "../tipos";

/** Captura o "@algo" que está sendo digitado imediatamente antes do cursor. */
const CONSULTA_MENCAO = /(^|\s)@([\p{L}\p{M}]*)$/u;

const NOMES_MENCIONAVEIS = new RegExp(
  `(@(?:${EQUIPE.map((pessoa) => pessoa.nome).join("|")}))`,
  "g"
);

function semAcento(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function horaAgora() {
  return new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TextoMensagem({ texto }: { texto: string }) {
  const partes = texto.split(NOMES_MENCIONAVEIS);

  return (
    <p>
      {partes.map((parte, indice) =>
        EQUIPE.some((pessoa) => `@${pessoa.nome}` === parte) ? (
          <span key={indice} className="mencao">
            {parte}
          </span>
        ) : (
          parte
        )
      )}
    </p>
  );
}

export function ChatCaso({ inicial }: { inicial: Mensagem[] }) {
  const [mensagens, setMensagens] = useState(inicial);
  const [texto, setTexto] = useState("");
  const [consulta, setConsulta] = useState<string | null>(null);
  const [destacado, setDestacado] = useState(0);

  const campoRef = useRef<HTMLInputElement>(null);
  const corpoRef = useRef<HTMLDivElement>(null);
  const caretRef = useRef<number | null>(null);

  const sugestoes = useMemo(() => {
    if (consulta === null) return [];
    const termo = semAcento(consulta);
    return EQUIPE.filter((pessoa) =>
      [...pessoa.nome.split(" "), pessoa.papel].some((alvo) =>
        semAcento(alvo).startsWith(termo)
      )
    );
  }, [consulta]);

  const listaAberta = consulta !== null && sugestoes.length > 0;

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
    const cursor = evento.target.selectionStart ?? valor.length;
    const achado = CONSULTA_MENCAO.exec(valor.slice(0, cursor));

    setTexto(valor);
    setConsulta(achado ? achado[2] : null);
    setDestacado(0);
  }

  function marcar(pessoa: MembroEquipe) {
    const cursor = campoRef.current?.selectionStart ?? texto.length;
    const antes = texto
      .slice(0, cursor)
      .replace(CONSULTA_MENCAO, `$1@${pessoa.nome} `);

    setTexto(antes + texto.slice(cursor));
    caretRef.current = antes.length;
    setConsulta(null);
  }

  function enviar() {
    const limpo = texto.trim();
    if (!limpo) return;

    setMensagens((atual) => [
      ...atual,
      {
        id: `local-${atual.length}-${Date.now()}`,
        autora: ESCRITORIO.usuario,
        papel: ESCRITORIO.papel,
        hora: horaAgora(),
        texto: limpo,
        propria: true,
      },
    ]);
    setTexto("");
    setConsulta(null);
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
      enviar();
    }
  }

  return (
    <section className="painel">
      <header className="painel-cabeca compacta">
        <div>
          <h3>Canal do caso</h3>
          <p>A conversa fica no processo, não no WhatsApp.</p>
        </div>
        <div className="equipe-canal">
          {EQUIPE.map((pessoa) => (
            <span key={pessoa.id} title={`${pessoa.nome} · ${pessoa.papel}`}>
              {pessoa.iniciais}
            </span>
          ))}
          <span className="eu" title={`${ESCRITORIO.usuario} · você`}>
            {ESCRITORIO.iniciais}
          </span>
        </div>
      </header>

      <div className="chat-corpo" ref={corpoRef}>
        {mensagens.map((mensagem) => (
          <article
            key={mensagem.id}
            className={[
              "balao",
              mensagem.ia ? "ia" : "",
              mensagem.propria ? "propria" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <header>
              <strong>{mensagem.autora}</strong>
              <span>
                {mensagem.papel} · {mensagem.hora}
              </span>
            </header>
            <TextoMensagem texto={mensagem.texto} />
          </article>
        ))}
      </div>

      <div className="compositor">
        {listaAberta && (
          <ul className="sugestoes" role="listbox">
            {sugestoes.map((pessoa, indice) => (
              <li key={pessoa.id}>
                <button
                  type="button"
                  className={indice === destacado ? "ativa" : undefined}
                  onMouseEnter={() => setDestacado(indice)}
                  onMouseDown={(evento) => {
                    evento.preventDefault();
                    marcar(pessoa);
                  }}
                >
                  <span className="sugestao-selo">{pessoa.iniciais}</span>
                  <span>
                    <strong>{pessoa.nome}</strong>
                    <small>{pessoa.papel}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <input
          ref={campoRef}
          value={texto}
          onChange={aoDigitar}
          onKeyDown={aoTeclar}
          placeholder="Escreva no canal do caso. Use @ para marcar alguém."
          aria-label="Nova mensagem no canal do caso"
        />
        <button
          className="botao-enviar"
          type="button"
          onClick={enviar}
          disabled={texto.trim().length === 0}
        >
          Enviar
        </button>
      </div>
    </section>
  );
}
