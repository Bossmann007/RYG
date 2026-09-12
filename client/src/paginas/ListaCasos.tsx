import { useMemo, useState } from "react";
import { CartaoCaso } from "../componentes/CartaoCaso";
import { IconeBusca } from "../componentes/Icones";
import { CASOS } from "../dados";
import { ROTULO_STATUS, STATUS_PROCESSO, StatusProcesso } from "../tipos";

type Props = {
  onAbrir: (id: string) => void;
};

export function ListaCasos({ onAbrir }: Props) {
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<StatusProcesso | "todos">("todos");

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return CASOS.filter((caso) => {
      const texto = [
        caso.titulo,
        caso.tema,
        caso.resumo,
        caso.tese,
        caso.cliente,
        caso.subtema,
        caso.processNumber,
        caso.status,
        ROTULO_STATUS[caso.status],
      ]
        .join(" ")
        .toLowerCase();

      const bateBusca = termo.length === 0 || texto.includes(termo);
      const bateStatus = status === "todos" || caso.status === status;
      return bateBusca && bateStatus;
    });
  }, [busca, status]);

  return (
    <section className="lista-casos">
      <div className="lista-intro">
        <p className="olho">Workspace do escritório · Direito bancário</p>
        <h2>Os casos, sem ruído.</h2>
        <p>
          Busque pelo tema. Filtre pelo andamento. Entre só no que importa.
        </p>
      </div>

      <div className="filtros">
        <label className="busca">
          <IconeBusca />
          <input
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Buscar por tema, cliente, tese ou número"
          />
        </label>

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

      <p className="contagem">
        {filtrados.length} {filtrados.length === 1 ? "caso" : "casos"}
      </p>

      {filtrados.length === 0 ? (
        <div className="vazio">
          <p>Nada com esse recorte.</p>
          <p>Tente outro tema ou limpe o filtro.</p>
        </div>
      ) : (
        <div className="grade-casos">
          {filtrados.map((caso) => (
            <CartaoCaso key={caso.id} caso={caso} onAbrir={onAbrir} />
          ))}
        </div>
      )}
    </section>
  );
}
