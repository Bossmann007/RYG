import { useEffect, useState } from "react";
import { listarAba } from "../api";
import { fraseOficial } from "../texto";
import { Documento } from "../tipos";
import { Carregando } from "./Carregando";

type Props = {
  casoId: string;
  processNumber: string;
};

export function PainelModelos({ casoId, processNumber }: Props) {
  const [itens, setItens] = useState<Documento[] | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    setItens(null);
    setErro(null);
    listarAba("modelos", { casoId, processNumber })
      .then((lista) => {
        if (!cancelado) setItens(lista);
      })
      .catch((falha: unknown) => {
        if (!cancelado) {
          setItens([]);
          setErro(falha instanceof Error ? falha.message : "Modelos indisponíveis.");
        }
      });
    return () => {
      cancelado = true;
    };
  }, [casoId, processNumber]);

  async function copiar(item: Documento) {
    const texto = item.corpo || item.resumo;
    if (!texto) return;
    await navigator.clipboard.writeText(texto);
    setCopiado(item.id);
    window.setTimeout(() => setCopiado((atual) => (atual === item.id ? null : atual)), 1600);
  }

  if (erro) {
    return (
      <div className="vazio painel">
        <p>{erro}</p>
      </div>
    );
  }

  if (!itens) {
    return <Carregando texto="Abrindo os modelos do escritório." />;
  }

  if (!itens.length) {
    return (
      <div className="vazio painel">
        <p>Nenhum modelo no acervo deste caso.</p>
      </div>
    );
  }

  return (
    <section className="painel">
      <header className="painel-cabeca">
        <h3>Modelos para escrever</h3>
        <p>Pareceres, petições e declarações do escritório. Abra e copie o texto.</p>
      </header>
      <p className="contagem">
        {itens.length} {itens.length === 1 ? "modelo" : "modelos"}
      </p>
      <ul className="lista-modelos">
        {itens.map((item) => {
          const expandido = aberto === item.id;
          const corpo = item.corpo || item.resumo;
          return (
            <li key={item.id} className={expandido ? "aberta" : undefined}>
              <div className="modelo-topo">
                <div>
                  <span className="selo neutro">{item.tipo || "Modelo"}</span>
                  <strong>{fraseOficial(item.titulo)}</strong>
                  <p>{fraseOficial(item.resumo)}</p>
                </div>
                <div className="modelo-acoes">
                  <button className="chip" type="button" onClick={() => copiar(item)}>
                    {copiado === item.id ? "Copiado" : "Copiar"}
                  </button>
                  <button
                    className="chip"
                    type="button"
                    onClick={() => setAberto(expandido ? null : item.id)}
                  >
                    {expandido ? "Fechar" : "Abrir texto"}
                  </button>
                </div>
              </div>
              {expandido && corpo ? <pre className="modelo-corpo">{corpo}</pre> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
