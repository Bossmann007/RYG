type Props = {
  texto: string;
};

/** Sobreposição de carregamento: escurece a tela e centraliza o aviso. */
export function Carregando({ texto }: Props) {
  return (
    <div className="carregando-fundo" role="status" aria-live="polite">
      <div className="carregando-caixa">
        <span className="carregando-anel" aria-hidden="true">
          <i />
        </span>
        <p>{texto}</p>
      </div>
    </div>
  );
}
