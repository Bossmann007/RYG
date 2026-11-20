import { FormEvent, useState } from "react";
import { consultarLocal, RespostaConsulta } from "../api";

type Props = {
  onVoltar: () => void;
};

export function Consulta({ onVoltar }: Props) {
  const [q, setQ] = useState("");
  const [resultado, setResultado] = useState<RespostaConsulta | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      setResultado(await consultarLocal(q));
    } catch (falha: unknown) {
      setResultado(null);
      setErro(falha instanceof Error ? falha.message : "Consulta indisponível.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="catalogo">
      <header className="detalhe-topo">
        <button className="voltar" type="button" onClick={onVoltar}>
          Casos
        </button>
        <div>
          <h2>Consulta</h2>
          <p>Rascunho. Uma pessoa revisa antes de protocolar.</p>
        </div>
      </header>
      <form onSubmit={enviar}>
        <label>
          Pergunta
          <input value={q} onChange={(evento) => setQ(evento.target.value)} maxLength={500} />
        </label>
        <button type="submit" disabled={enviando || q.trim().length === 0}>
          Consultar
        </button>
      </form>
      {erro && <p className="vazio">{erro}</p>}
      {resultado && (
        <article>
          <p>{resultado.notice}</p>
          <p>{resultado.citeStatus === "cited" ? resultado.answer : "Sem trecho citável."}</p>
        </article>
      )}
    </section>
  );
}
