import { useState } from "react";
import { fraseOficial } from "../texto";
import { Jurisprudencia, ROTULO_ALINHAMENTO, ROTULO_RELACAO, ROTULO_STATUS } from "../tipos";
import { SeloCitacao, SeloFonte, ementaExibida } from "./SelosPolitica";

function itensUnicos(itens: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const bruto of itens || []) {
    const t = fraseOficial(bruto);
    const key = t.toLocaleLowerCase("pt-BR");
    if (!t || seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

type AbaGaveta = "essencial" | "fortalecer" | "blindar" | "contrapor";

type Props = {
  item: Jurisprudencia;
  onFechar: () => void;
};

const ABAS: { id: AbaGaveta; rotulo: string; legenda: string }[] = [
  { id: "essencial", rotulo: "O essencial", legenda: "O que a ementa oficial decidiu." },
  { id: "fortalecer", rotulo: "Fortalecer", legenda: "Como usar o dispositivo a favor." },
  { id: "blindar", rotulo: "Blindar", legenda: "Onde o julgado pode ser usado contra você." },
  { id: "contrapor", rotulo: "Quebrar", legenda: "Como limitar o alcance deste acórdão." },
];

export function GavetaJuris({ item, onFechar }: Props) {
  const [aba, setAba] = useState<AbaGaveta>("essencial");
  const bloco = item[aba];
  const linhas = itensUnicos(bloco.itens);
  const ehPrecedenteTema = item.relacao === "precedente_tema";

  return (
    <div className="gaveta-fundo" onClick={onFechar} role="presentation">
      <aside
        className="gaveta"
        role="dialog"
        aria-label="Jurisprudência"
        onClick={(evento) => evento.stopPropagation()}
      >
        <div className="gaveta-topo">
          <div className="selos">
            <span className={`selo alinhamento-${item.alignment}`}>
              {ROTULO_ALINHAMENTO[item.alignment]}
            </span>
            <span className={`selo status-${item.status}`}>
              {ROTULO_STATUS[item.status]}
            </span>
            <SeloCitacao item={item} />
            <SeloFonte fonte={item.fonte || "acervo_interno"} />
            {ehPrecedenteTema && (
              <span className="selo relacao-tema">{ROTULO_RELACAO.precedente_tema}</span>
            )}
          </div>
          <button className="botao-texto" type="button" onClick={onFechar}>
            Fechar
          </button>
        </div>

        <h3>{item.acordao}</h3>
        <p className="gaveta-meta">
          {item.chamber} · {item.reporter}
        </p>
        <p className="gaveta-meta">{item.processNumber}</p>
        <p className="ementa">{ementaExibida(item)}</p>
        {ehPrecedenteTema && item.citavel && (
          <p className="aviso-tema">
            Ementa oficial do TJPR sobre o mesmo tema deste processo.
          </p>
        )}

        {item.pontos.length > 0 && (
          <div className="pontos">
            {item.pontos.map((ponto) => (
              <span key={ponto} className="chip">
                {fraseOficial(ponto)}
              </span>
            ))}
          </div>
        )}

        <div className="abas-gaveta">
          {ABAS.map((itemAba) => (
            <button
              key={itemAba.id}
              className={aba === itemAba.id ? "aba ativa" : "aba"}
              type="button"
              onClick={() => setAba(itemAba.id)}
            >
              {itemAba.rotulo}
            </button>
          ))}
        </div>

        <p className="gaveta-legenda">{ABAS.find((itemAba) => itemAba.id === aba)?.legenda}</p>
        {bloco.resumo ? <p className="bloco-resumo">{fraseOficial(bloco.resumo)}</p> : null}

        <ul className="lista-limpa">
          {linhas.map((linha) => (
            <li key={linha}>{linha}</li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
