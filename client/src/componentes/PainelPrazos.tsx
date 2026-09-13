import { useMemo, useState } from "react";
import { diasRestantes, formatarDataIso, hidratarPrazos } from "../prazos-escritorio";
import {
  Caso,
  Prazo,
  PrazoStatus,
  ROTULO_CALENDARIO,
  ROTULO_FONTE,
  ROTULO_PRAZO_KIND,
  ROTULO_PRAZO_STATUS,
} from "../tipos";

const FILTROS: Array<PrazoStatus | "todos"> = [
  "todos",
  "a_vencer",
  "vencido",
  "aberto",
  "cumprido",
  "suspenso",
];

export function PainelPrazos({ caso }: { caso: Caso }) {
  const hidratado = useMemo(() => hidratarPrazos(caso), [caso]);
  const [filtro, setFiltro] = useState<PrazoStatus | "todos">("todos");

  const itens = useMemo(() => {
    return hidratado.prazos
      .filter((item) => filtro === "todos" || item.status === filtro)
      .slice()
      .sort((a, b) => pesoStatus(a.status) - pesoStatus(b.status) || a.dueAt.localeCompare(b.dueAt));
  }, [filtro, hidratado.prazos]);

  const resumo = useMemo(() => {
    return hidratado.prazos.reduce(
      (acc, item) => {
        acc[item.status] += 1;
        return acc;
      },
      { aberto: 0, a_vencer: 0, vencido: 0, cumprido: 0, suspenso: 0 }
    );
  }, [hidratado.prazos]);

  return (
    <section className="painel">
      <header className="painel-cabeca">
        <h3>Prazos</h3>
        <p>
          Agenda do escritório. O andamento público, se existir, só dispara o
          relógio — o vencimento mora aqui.
        </p>
      </header>

      <div className="prazo-resumo">
        <article className="prazo-kpi vencido">
          <strong>{resumo.vencido}</strong>
          <span>vencidos</span>
        </article>
        <article className="prazo-kpi a_vencer">
          <strong>{resumo.a_vencer}</strong>
          <span>a vencer</span>
        </article>
        <article className="prazo-kpi aberto">
          <strong>{resumo.aberto}</strong>
          <span>abertos</span>
        </article>
        <article className="prazo-kpi cumprido">
          <strong>{resumo.cumprido}</strong>
          <span>cumpridos</span>
        </article>
      </div>

      <div className="chips prazo-chips">
        {FILTROS.map((item) => (
          <button
            key={item}
            type="button"
            className={filtro === item ? "chip ativa" : "chip"}
            onClick={() => setFiltro(item)}
          >
            {item === "todos" ? "Todos" : ROTULO_PRAZO_STATUS[item]}
          </button>
        ))}
      </div>

      {itens.length === 0 ? (
        <div className="vazio">
          <p>Nenhum prazo neste recorte.</p>
        </div>
      ) : (
        <ol className="lista-prazos">
          {itens.map((item) => (
            <CartaoPrazo key={item.id} prazo={item} />
          ))}
        </ol>
      )}
    </section>
  );
}

function CartaoPrazo({ prazo }: { prazo: Prazo }) {
  const dias = diasRestantes(prazo.dueAt);
  const relogio =
    prazo.status === "cumprido"
      ? "Protocolado"
      : prazo.status === "suspenso"
        ? "Em suspensão"
        : dias < 0
          ? `${Math.abs(dias)} dia${Math.abs(dias) === 1 ? "" : "s"} em atraso`
          : dias === 0
            ? "Vence hoje"
            : `${dias} dia${dias === 1 ? "" : "s"}`;

  return (
    <li className={`cartao-prazo status-${prazo.status}`}>
      <div className="prazo-faixa" aria-hidden />
      <div className="prazo-corpo">
        <div className="selos">
          <span className={`selo prazo-${prazo.status}`}>{ROTULO_PRAZO_STATUS[prazo.status]}</span>
          <span className="selo neutro">{ROTULO_PRAZO_KIND[prazo.kind]}</span>
          <span className={`selo fonte-${prazo.gatilhoFonte}`}>
            {ROTULO_FONTE[prazo.gatilhoFonte]}
          </span>
        </div>
        <strong>{prazo.title}</strong>
        <p>{prazo.trigger}</p>
        {prazo.notes ? <p>{prazo.notes}</p> : null}
        <p className="prazo-meta">
          {prazo.owner} · {prazo.days} {ROTULO_CALENDARIO[prazo.calendar]}
        </p>
      </div>
      <div className="prazo-quando">
        <span>{formatarDataIso(prazo.dueAt)}</span>
        <b>{relogio}</b>
      </div>
    </li>
  );
}

function pesoStatus(status: PrazoStatus): number {
  switch (status) {
    case "vencido":
      return 0;
    case "a_vencer":
      return 1;
    case "aberto":
      return 2;
    case "suspenso":
      return 3;
    case "cumprido":
      return 4;
    default: {
      const neverStatus: never = status;
      return neverStatus;
    }
  }
}
