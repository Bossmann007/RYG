import { Caso, ROTULO_STATUS } from "../tipos";
import { AnelChance } from "./AnelChance";

type Props = {
  caso: Caso;
  onAbrir: (id: string) => void;
};

export function CartaoCaso({ caso, onAbrir }: Props) {
  return (
    <button className="cartao" type="button" onClick={() => onAbrir(caso.id)}>
      <div className="cartao-topo">
        <span className={`selo status-${caso.status}`}>{ROTULO_STATUS[caso.status]}</span>
        <span className="cartao-area">{caso.subtema}</span>
      </div>

      <h3>{caso.titulo}</h3>
      <p className="cartao-resumo">{caso.resumo}</p>

      <div className="cartao-base">
        <div>
          <p className="cartao-cliente">{caso.cliente}</p>
          <p className="cartao-meta">{caso.processNumber}</p>
          <p className="cartao-meta">{caso.atualizacao}</p>
        </div>
        <AnelChance valor={caso.chance} tamanho={76} />
      </div>
    </button>
  );
}
