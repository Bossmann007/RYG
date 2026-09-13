import { ReactNode, useState } from "react";
import { GavetaJuris } from "../componentes/GavetaJuris";
import {
  IconeContrato,
  IconeConversa,
  IconeGrafico,
  IconeHistorico,
  IconeJuris,
  IconeMartelo,
  IconeModelo,
  IconePeca,
  IconePessoa,
  IconePrazo,
  IconeRelatorio,
  IconeResultado,
  IconeTese,
  IconeVisao,
  IconeVoltar,
} from "../componentes/Icones";
import { ChatCaso } from "../componentes/ChatCaso";
import {
  PainelDocumentos,
  PainelHistorico,
  PainelJurisprudencia,
  PainelJurimetria,
  PainelResultados,
  PainelTeses,
  PainelVisao,
} from "../componentes/PaineisCaso";
import { PainelPrazos } from "../componentes/PainelPrazos";
import { PainelRelatorios } from "../componentes/PainelRelatorios";
import { AbaCaso, Caso, Jurisprudencia, ROTULO_STATUS } from "../tipos";

type Props = {
  caso: Caso;
  onVoltar: () => void;
};

type ItemMenu = {
  id: AbaCaso;
  rotulo: string;
  grupo: string;
  icone: ReactNode;
};

const MENU: ItemMenu[] = [
  { id: "visao", rotulo: "Visão", grupo: "Caso", icone: <IconeVisao /> },
  { id: "historico", rotulo: "Histórico", grupo: "Caso", icone: <IconeHistorico /> },
  { id: "prazos", rotulo: "Prazos", grupo: "Caso", icone: <IconePrazo /> },
  { id: "conversas", rotulo: "Conversas", grupo: "Caso", icone: <IconeConversa /> },
  { id: "peticoes", rotulo: "Petições", grupo: "Acervo", icone: <IconePeca /> },
  { id: "contratos", rotulo: "Contratos", grupo: "Acervo", icone: <IconeContrato /> },
  { id: "documentos", rotulo: "Clientes", grupo: "Acervo", icone: <IconePessoa /> },
  { id: "decisoes", rotulo: "Decisões", grupo: "Acervo", icone: <IconeMartelo /> },
  { id: "modelos", rotulo: "Modelos", grupo: "Acervo", icone: <IconeModelo /> },
  { id: "teses", rotulo: "Teses", grupo: "Estratégia", icone: <IconeTese /> },
  { id: "resultados", rotulo: "Resultados", grupo: "Estratégia", icone: <IconeResultado /> },
  { id: "jurisprudencia", rotulo: "Jurisprudência", grupo: "Estratégia", icone: <IconeJuris /> },
  { id: "jurimetria", rotulo: "Jurimetria", grupo: "Estratégia", icone: <IconeGrafico /> },
  { id: "relatorios", rotulo: "Relatórios", grupo: "Estratégia", icone: <IconeRelatorio /> },
];

export function DetalheCaso({ caso, onVoltar }: Props) {
  const [aba, setAba] = useState<AbaCaso>("visao");
  const [juris, setJuris] = useState<Jurisprudencia | null>(null);

  const grupos = ["Caso", "Acervo", "Estratégia"];

  return (
    <section className="detalhe">
      <header className="detalhe-topo">
        <button className="voltar" type="button" onClick={onVoltar}>
          <IconeVoltar />
          Casos
        </button>
        <div>
          <div className="selos">
            <span className={`selo status-${caso.status}`}>
              {ROTULO_STATUS[caso.status]}
            </span>
            <span className="selo neutro">{caso.subtema}</span>
          </div>
          <h2>{caso.titulo}</h2>
          <p>
            {caso.processNumber} · {caso.chamber}
          </p>
        </div>
      </header>

      <div className="detalhe-corpo">
        <nav className="menu-caso" aria-label="Memória do caso">
          {grupos.map((grupo) => (
            <div key={grupo} className="menu-grupo">
              <p>{grupo}</p>
              {MENU.filter((item) => item.grupo === grupo).map((item) => (
                <button
                  key={item.id}
                  className={aba === item.id ? "ativa" : undefined}
                  type="button"
                  onClick={() => {
                    setAba(item.id);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  {item.icone}
                  {item.rotulo}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="detalhe-conteudo">
          {aba === "visao" && (
            <PainelVisao
              caso={caso}
              onAbrirJuris={setJuris}
              onVerTodas={() => setAba("jurisprudencia")}
            />
          )}
          {aba === "peticoes" && (
            <PainelDocumentos
              titulo="Petições e peças"
              texto="O que já foi protocolado neste caso."
              itens={caso.peticoes}
            />
          )}
          {aba === "contratos" && (
            <PainelDocumentos
              titulo="Contratos"
              texto="Instrumentos que sustentam o pedido."
              itens={caso.contratos}
            />
          )}
          {aba === "documentos" && (
            <PainelDocumentos
              titulo="Documentos do cliente"
              texto="Prova e qualificação, sem pasta perdida."
              itens={caso.documentos}
            />
          )}
          {aba === "decisoes" && (
            <PainelDocumentos
              titulo="Decisões e acórdãos"
              texto="O que o juízo já disse aqui."
              itens={caso.decisoes}
            />
          )}
          {aba === "modelos" && (
            <PainelDocumentos
              titulo="Modelos e pareceres"
              texto="Peças do escritório reaproveitáveis."
              itens={caso.modelos}
            />
          )}
          {aba === "historico" && <PainelHistorico caso={caso} />}
          {aba === "prazos" && <PainelPrazos caso={caso} />}
          {aba === "teses" && <PainelTeses caso={caso} />}
          {aba === "resultados" && <PainelResultados caso={caso} />}
          {aba === "conversas" && <ChatCaso inicial={caso.conversas} />}
          {aba === "jurisprudencia" && (
            <PainelJurisprudencia caso={caso} onAbrir={setJuris} />
          )}
          {aba === "jurimetria" && <PainelJurimetria caso={caso} />}
          {aba === "relatorios" && <PainelRelatorios caso={caso} />}
        </div>
      </div>

      {juris && <GavetaJuris item={juris} onFechar={() => setJuris(null)} />}
    </section>
  );
}
