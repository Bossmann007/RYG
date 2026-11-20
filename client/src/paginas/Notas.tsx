import { FormEvent, useEffect, useState } from "react";
import {
  WikiNote,
  WikiNotePointer,
  carregarWikiLoad,
  criarWikiNote,
  obterWikiNote,
  publicarWikiNote,
} from "../api";

type Props = {
  onVoltar: () => void;
};

export function Notas({ onVoltar }: Props) {
  const [notas, setNotas] = useState<WikiNotePointer[]>([]);
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [titulo, setTitulo] = useState("");
  const [corpo, setCorpo] = useState("");
  const [confirmarPublicacao, setConfirmarPublicacao] = useState(false);
  const [docPublicadoId, setDocPublicadoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  async function carregarLista() {
    const pack = await carregarWikiLoad();
    setNotas(pack.notes);
    return pack.notes;
  }

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    setErro(null);
    carregarLista()
      .then((lista) => {
        if (!cancelado) {
          setNotas(lista);
        }
      })
      .catch((falha: unknown) => {
        if (!cancelado) {
          setErro(falha instanceof Error ? falha.message : "Notas indisponíveis.");
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

  async function abrirNota(id: string) {
    setErro(null);
    setConfirmarPublicacao(false);
    setDocPublicadoId(null);
    try {
      const note: WikiNote = await obterWikiNote(id);
      setSelecionada(note.id);
      setTitulo(note.title);
      setCorpo(note.body);
    } catch (falha: unknown) {
      setErro(falha instanceof Error ? falha.message : "Nota indisponível.");
    }
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    try {
      const note = await criarWikiNote(titulo, corpo);
      const lista = await carregarLista();
      setNotas(lista);
      setSelecionada(note.id);
      setConfirmarPublicacao(false);
      setDocPublicadoId(null);
    } catch (falha: unknown) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível salvar.");
    }
  }

  async function confirmarPublicar() {
    if (!selecionada) {
      return;
    }
    setErro(null);
    try {
      const doc = await publicarWikiNote(selecionada);
      setDocPublicadoId(doc.id);
      setConfirmarPublicacao(false);
    } catch (falha: unknown) {
      setErro(falha instanceof Error ? falha.message : "Publicação recusada.");
    }
  }

  function novaNota() {
    setSelecionada(null);
    setTitulo("");
    setCorpo("");
    setConfirmarPublicacao(false);
    setDocPublicadoId(null);
    setErro(null);
  }

  return (
    <section className="catalogo">
      <header className="detalhe-topo">
        <button className="voltar" type="button" onClick={onVoltar}>
          Casos
        </button>
        <div>
          <h2>Notas</h2>
          <p>Vault pessoal. Publicar no hardvault exige confirmação explícita.</p>
        </div>
      </header>

      {erro && <p className="vazio">{erro}</p>}
      {carregando && !erro && <p className="vazio">Carregando notas…</p>}
      {!carregando && !erro && notas.length === 0 && (
        <p className="vazio">Nenhuma nota ainda. Escreva e salve para criar.</p>
      )}

      {notas.length > 0 && (
        <ul>
          {notas.map((nota) => (
            <li key={nota.id}>
              <button
                className="voltar"
                type="button"
                onClick={() => void abrirNota(nota.id)}
              >
                {nota.title || nota.id}
                {selecionada === nota.id ? " · aberta" : ""}
              </button>
            </li>
          ))}
        </ul>
      )}

      <button className="voltar" type="button" onClick={novaNota}>
        Nova nota
      </button>

      <form onSubmit={salvar}>
        <label>
          Título
          <input
            value={titulo}
            onChange={(evento) => setTitulo(evento.target.value)}
            maxLength={255}
            required
          />
        </label>
        <label>
          Corpo (markdown como texto)
          <textarea
            value={corpo}
            onChange={(evento) => setCorpo(evento.target.value)}
            rows={12}
            required
          />
        </label>
        <button type="submit">Salvar</button>
      </form>

      {selecionada && (
        <div>
          {!confirmarPublicacao && (
            <button
              className="voltar"
              type="button"
              onClick={() => setConfirmarPublicacao(true)}
            >
              Publicar no hardvault
            </button>
          )}
          {confirmarPublicacao && (
            <button className="voltar" type="button" onClick={() => void confirmarPublicar()}>
              Confirmar publicação
            </button>
          )}
          {docPublicadoId && (
            <p className="vazio">Publicado no hardvault · doc {docPublicadoId}</p>
          )}
        </div>
      )}
    </section>
  );
}
