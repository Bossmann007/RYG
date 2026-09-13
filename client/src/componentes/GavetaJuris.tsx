import { useState } from "react";
import { Jurisprudencia, ROTULO_ALINHAMENTO, ROTULO_STATUS } from "../tipos";
import { SeloCitacao, SeloFonte, ementaExibida } from "./SelosPolitica";

type AbaGaveta = "essencial" | "fortalecer" | "blindar" | "contrapor";

type Props = {
  item: Jurisprudencia;
  onFechar: () => void;
};

const ABAS: { id: AbaGaveta; rotulo: string; legenda: string }[] = [
  { id: "essencial", rotulo: "O essencial", legenda: "O que decidiu o julgamento." },
  { id: "fortalecer", rotulo: "Fortalecer", legenda: "Como usar isso a seu favor." },
  { id: "blindar", rotulo: "Blindar", legenda: "Onde você pode ser atacado." },
  { id: "contrapor", rotulo: "Quebrar", legenda: "Como derrubar esse argumento." },
];

export function GavetaJuris({ item, onFechar }: Props) {
  const [aba, setAba] = useState<AbaGaveta>("essencial");

  const bloco = item[aba];
  const legenda = ABAS.find((itemAba) => itemAba.id === aba)?.legenda;

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
        {!item.citavel && (
          <p className="aviso-nao-citavel">
            Notas abaixo são acervo interno. Não são julgamento oficial.
          </p>
        )}

        <div className="pontos">
          {item.pontos.map((ponto) => (
            <span key={ponto} className="chip">
              {ponto}
            </span>
          ))}
        </div>

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

        <p className="gaveta-legenda">{legenda}</p>
        <p className="bloco-resumo">{bloco.resumo}</p>

        <ul className="lista-limpa">
          {bloco.itens.map((linha) => (
            <li key={linha}>{linha}</li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
