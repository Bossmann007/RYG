import { useMemo, useState } from "react";
import { AnelChance } from "./AnelChance";
import {
  Alinhamento,
  Caso,
  Documento,
  Jurisprudencia,
  ROTULO_ALINHAMENTO,
  ROTULO_RELACAO,
  ROTULO_STATUS,
  STATUS_PROCESSO,
  StatusProcesso,
  chanceIndisponivel,
} from "../tipos";
import { fraseOficial } from "../texto";
import { SeloCitacao, SeloFonte, SeloTese, ementaExibida } from "./SelosPolitica";

type PropsLista = {
  titulo: string;
  texto: string;
  itens: Documento[];
};

export function PainelDocumentos({ titulo, texto, itens }: PropsLista) {
  if (itens.length === 0) {
    return (
      <div className="vazio painel">
        <p>Nada neste acervo ainda.</p>
      </div>
    );
  }

  return (
    <section className="painel">
      <header className="painel-cabeca">
        <h3>{titulo}</h3>
        <p>{texto}</p>
      </header>
      <p className="contagem">
        {itens.length} {itens.length === 1 ? "documento" : "documentos"}
      </p>
      <ul className="lista-docs">
        {itens.map((item) => (
          <li key={item.id}>
            <div>
              <strong>{fraseOficial(item.titulo)}</strong>
              {item.resumo ? <p>{fraseOficial(item.resumo)}</p> : null}
              {item.origem ? <p className="doc-origem">{item.origem}</p> : null}
            </div>
            <span>
              {[item.tipo, item.data].filter(Boolean).join(" · ")}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PainelVisao({
  caso,
  onAbrirJuris,
  onVerTodas,
}: {
  caso: Caso;
  onAbrirJuris: (item: Jurisprudencia) => void;
  onVerTodas: () => void;
}) {
  return (
    <section className="painel visao">
      <div className="visao-grid">
        <article className="cartao-suave chance-box">
          {chanceIndisponivel(caso) ? (
            <div className="chance-vazia">
              <p className="olho">Índice descritivo</p>
              <p className="chance-vazia-texto">Sem índice descritivo neste caso.</p>
            </div>
          ) : (
            <>
              <AnelChance valor={caso.chance} tamanho={120} />
              <div>
                <div className="selos">
                  <SeloFonte fonte={caso.fontes?.chance || "tjpr"} />
                </div>
                <p className="olho">{caso.chance}% · {caso.chanceRotulo}</p>
                <p>{caso.chanceTexto}</p>
              </div>
            </>
          )}
        </article>

        <article className="cartao-suave votos-box">
          <p className="olho">Neste recorte do TJPR</p>
          {caso.votos.for + caso.votos.against + caso.votos.diverge === 0 ? (
            <p className="votos-vazio-texto">Sem votos catalogados neste recorte.</p>
          ) : (
            <div className="votos">
              <div className="voto for">
                <strong>{caso.votos.for}</strong>
                <span>a favor</span>
              </div>
              <div className="voto against">
                <strong>{caso.votos.against}</strong>
                <span>contra</span>
              </div>
              <div className="voto diverge">
                <strong>{caso.votos.diverge}</strong>
                <span>divergente</span>
              </div>
            </div>
          )}
        </article>
      </div>

      <article className="cartao-suave">
        <p className="olho">Tese do caso</p>
        <div className="selos">
          <SeloFonte fonte={caso.fontes?.tese || "acervo_interno"} />
        </div>
        <p className="tese-destaque">{fraseOficial(caso.tese)}</p>
        <p className="partes">
          {caso.partes.map((parte) => `${parte.papel}: ${parte.nome}`).join("  ·  ")}
        </p>
      </article>

      <header className="painel-cabeca compacta">
        <div>
          <h3>Julgados que pesam</h3>
          <p>Abra um para se blindar ou fortalecer o argumento.</p>
        </div>
        <button className="botao-texto" type="button" onClick={onVerTodas}>
          Ver todas
        </button>
      </header>
      <ul className="lista-juris">
        {caso.jurisprudencias.slice(0, 3).map((item) => (
          <li key={item.id}>
            <button type="button" onClick={() => onAbrirJuris(item)}>
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
              <strong>{item.acordao}</strong>
              <p>
                {item.chamber} · {item.date}
              </p>
              <p>{ementaExibida(item)}</p>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PainelHistorico({ caso }: { caso: Caso }) {
  return (
    <section className="painel">
      <header className="painel-cabeca">
        <h3>Histórico</h3>
        <p>Só o que mudou o rumo.</p>
      </header>
      <ol className="linha-tempo">
        {caso.historico.map((item) => (
          <li key={`${item.data}-${item.titulo}`}>
            <span>{item.data}</span>
            <strong>{fraseOficial(item.titulo)}</strong>
            <p>{fraseOficial(item.detalhe)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function PainelTeses({ caso }: { caso: Caso }) {
  return (
    <section className="painel">
      <header className="painel-cabeca">
        <h3>Teses</h3>
        <p>O que o escritório já está usando aqui.</p>
      </header>
      <ul className="lista-docs">
        {caso.teses.map((tese) => (
          <li key={tese.id}>
            <div>
              <strong>{fraseOficial(tese.titulo)}</strong>
              <p>{fraseOficial(tese.uso)}</p>
            </div>
            <div className="selos">
              <SeloTese tese={tese} />
              <span className={`selo forca-${tese.forca}`}>força {tese.forca}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PainelResultados({ caso }: { caso: Caso }) {
  return (
    <section className="painel">
      <header className="painel-cabeca">
        <h3>Resultados</h3>
        <p>O que já funcionou neste escritório.</p>
      </header>
      <ul className="lista-docs">
        {caso.resultados.map((item) => (
          <li key={item.id}>
            <div>
              <strong>{fraseOficial(item.titulo)}</strong>
              <p>{fraseOficial(item.desfecho)}</p>
              <p>{fraseOficial(item.aprendizado)}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PainelJurimetria({ caso }: { caso: Caso }) {
  const total = caso.votos.for + caso.votos.against + caso.votos.diverge;
  const amostraValida = caso.jurimetria.amostra > 0;
  const porAlinhamento = {
    for: caso.jurisprudencias.filter((item) => item.alignment === "for" && item.ementa),
    against: caso.jurisprudencias.filter((item) => item.alignment === "against" && item.ementa),
    diverge: caso.jurisprudencias.filter((item) => item.alignment === "diverge" && item.ementa),
  };

  return (
    <section className="painel">
      <header className="painel-cabeca">
        <h3>Jurimetria</h3>
        <p>
          {amostraValida
            ? `${caso.jurimetria.amostra} acórdãos oficiais neste recorte.`
            : "Leitura das ementas oficiais deste caso."}
        </p>
        <SeloFonte fonte={caso.fontes?.jurimetria || "tjpr"} />
      </header>

      {total === 0 ? (
        <div className="vazio jurimetria-vazio">
          <p>Sem votos catalogados neste recorte.</p>
        </div>
      ) : (
        <div className="barras">
          {(["for", "against", "diverge"] as const).map((chave) => {
            const valor = caso.votos[chave];
            const porcento = total ? Math.round((valor / total) * 100) : 0;
            return (
              <div key={chave} className="barra-linha">
                <span>{ROTULO_ALINHAMENTO[chave]}</span>
                <div className="barra">
                  <i className={chave} style={{ width: `${porcento}%` }} />
                </div>
                <b>
                  {valor} · {porcento}%
                </b>
              </div>
            );
          })}
        </div>
      )}

      {(["against", "diverge", "for"] as const).map((chave) => {
        const itens = porAlinhamento[chave];
        if (!itens.length) {
          return null;
        }
        return (
          <div key={chave} className="voto-motivo">
            <p className="olho">{ROTULO_ALINHAMENTO[chave]} — por quê</p>
            {itens.map((item) => (
              <article key={item.id} className={`cartao-suave voto-card ${chave}`}>
                <p className="voto-card-meta">
                  {item.chamber} · {item.date}
                </p>
                <p>{fraseOficial(item.essencial.resumo || ementaExibida(item))}</p>
              </article>
            ))}
          </div>
        );
      })}

      {caso.jurimetria.padrao ? (
        <article className="cartao-suave">
          <p className="olho">Leitura do recorte</p>
          <p>{fraseOficial(caso.jurimetria.padrao)}</p>
        </article>
      ) : null}
      {caso.jurimetria.interno ? (
        <article className="cartao-suave">
          <p className="olho">O que as ementas oficiais dizem</p>
          <p>{fraseOficial(caso.jurimetria.interno)}</p>
        </article>
      ) : null}

      {caso.dissidios.length > 0 && (
        <div className="dissidios">
          {caso.dissidios.map((item) => (
            <article key={item.camara} className="cartao-suave">
              <div className="selos">
                <span className={`selo alinhamento-${item.versus}`}>
                  {ROTULO_ALINHAMENTO[item.versus]}
                </span>
              </div>
              <strong>{item.camara}</strong>
              <p>{fraseOficial(item.orientacao)}</p>
              <p>{fraseOficial(item.nota)}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function PainelJurisprudencia({
  caso,
  onAbrir,
}: {
  caso: Caso;
  onAbrir: (item: Jurisprudencia) => void;
}) {
  const [alinhamento, setAlinhamento] = useState<Alinhamento | "todos">("todos");
  const [status, setStatus] = useState<StatusProcesso | "todos">("todos");

  const itens = useMemo(() => {
    return caso.jurisprudencias.filter((item) => {
      const bateAlinho = alinhamento === "todos" || item.alignment === alinhamento;
      const bateStatus = status === "todos" || item.status === status;
      return bateAlinho && bateStatus;
    });
  }, [alinhamento, caso.jurisprudencias, status]);

  return (
    <section className="painel">
      <header className="painel-cabeca">
        <h3>Jurisprudência</h3>
        <p>Clique para ler só o que pesa — a favor, contra ou divergente.</p>
      </header>

      <div className="filtros internos">
        <div className="chips">
          {(["todos", "for", "against", "diverge"] as const).map((item) => (
            <button
              key={item}
              type="button"
              className={alinhamento === item ? "chip ativa" : "chip"}
              onClick={() => setAlinhamento(item)}
            >
              {item === "todos" ? "Todas" : ROTULO_ALINHAMENTO[item]}
            </button>
          ))}
        </div>
        <label className="filtro">
          Andamento
          <select
            value={status}
            onChange={(evento) =>
              setStatus(evento.target.value as StatusProcesso | "todos")
            }
          >
            <option value="todos">Todos</option>
            {STATUS_PROCESSO.map((item) => (
              <option key={item} value={item}>
                {ROTULO_STATUS[item]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {itens.length === 0 ? (
        <div className="vazio">
          <p>Nenhum julgado encontrado com esses filtros.</p>
          <p className="vazio-dica">Tente remover filtros ou aguarde novos precedentes.</p>
        </div>
      ) : (
        <ul className="lista-juris">
          {itens.map((item) => (
            <li key={item.id}>
              <button type="button" onClick={() => onAbrir(item)}>
                <div className="selos">
                  <span className={`selo alinhamento-${item.alignment}`}>
                    {ROTULO_ALINHAMENTO[item.alignment]}
                  </span>
                  <span className={`selo status-${item.status}`}>
                    {ROTULO_STATUS[item.status]}
                  </span>
                  <SeloCitacao item={item} />
                  <SeloFonte fonte={item.fonte || "acervo_interno"} />
                  {item.relacao === "precedente_tema" && (
                    <span className="selo relacao-tema">{ROTULO_RELACAO.precedente_tema}</span>
                  )}
                </div>
                <strong>{item.acordao}</strong>
                <p>
                  {item.chamber} · {item.date}
                </p>
                <p>{ementaExibida(item)}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
