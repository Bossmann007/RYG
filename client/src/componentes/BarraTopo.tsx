import { ESCRITORIO } from "../dados";

type Props = {
  onInicio: () => void;
  onCatalogo: () => void;
  onConversas: () => void;
};

export function BarraTopo({ onInicio, onCatalogo, onConversas }: Props) {
  return (
    <header className="topo">
      <button className="marca" type="button" onClick={onInicio}>
        <img className="marca-selo" src="/logo.png" alt="OpenLegalAI" />
        <span className="marca-texto">
          <strong>OpenLegalAI</strong>
          <small>O escritório passa a ter memória</small>
        </span>
      </button>

      <div className="topo-lado">
        <button className="voltar" type="button" onClick={onConversas}>
          Conversas
        </button>
        <button className="voltar" type="button" onClick={onCatalogo}>
          Backstage
        </button>
        <div className="escritorio">
          <span className="escritorio-nome">{ESCRITORIO.nome}</span>
          <span className="escritorio-meta">ambiente isolado</span>
        </div>
        <div className="avatar" title={`${ESCRITORIO.usuario} · ${ESCRITORIO.papel}`}>
          GV
        </div>
      </div>
    </header>
  );
}
