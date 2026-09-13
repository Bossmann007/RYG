import { useEffect, useMemo, useState } from "react";
import { listarCasos } from "../api";
import { CartaoCaso } from "../componentes/CartaoCaso";
import { Carregando } from "../componentes/Carregando";
import { IconeBusca } from "../componentes/Icones";
import { Caso, ROTULO_STATUS, STATUS_PROCESSO, StatusProcesso } from "../tipos";

type Props = {
  onAbrir: (id: string) => void;
};

export function ListaCasos({ onAbrir }: Props) {
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<StatusProcesso | "todos">("todos");
  const [casos, setCasos] = useState<Caso[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let cancelado = false;

    listarCasos()
      .then((lista) => {
        if (!cancelado) {
          setCasos(lista);
          setErro(null);
        }
      })
      .catch((falha: unknown) => {
        if (!cancelado) {
          setCasos([]);
          setErro(falha instanceof Error ? falha.message : "Acervo indisponível.");
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

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return casos.filter((caso) => {
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
  }, [busca, casos, status]);

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
        {carregando
          ? "Lendo o acervo…"
          : `${filtrados.length} ${filtrados.length === 1 ? "caso" : "casos"}`}
      </p>

      {erro ? (
        <div className="vazio">
          <p>{erro}</p>
          <p>Suba o Nest com DB_* apontando para o TiDB.</p>
        </div>
      ) : carregando ? (
        <Carregando texto="Carregando casos do acervo interno." />
      ) : filtrados.length === 0 ? (
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
