type Props = {
  valor: number;
  tamanho?: number;
};

export function AnelChance({ valor, tamanho = 112 }: Props) {
  const raio = 42;
  const circunferencia = 2 * Math.PI * raio;
  const offset = circunferencia - (Math.min(100, Math.max(0, valor)) / 100) * circunferencia;

  return (
    <svg
      className="anel"
      width={tamanho}
      height={tamanho}
      viewBox="0 0 100 100"
      aria-label={`Chance de êxito ${valor}%`}
    >
      <circle className="anel-trilha" cx="50" cy="50" r={raio} />
      <circle
        className="anel-valor"
        cx="50"
        cy="50"
        r={raio}
        strokeDasharray={circunferencia}
        strokeDashoffset={offset}
      />
      <text className="anel-numero" x="50" y="48">
        {valor}%
      </text>
      <text className="anel-legenda" x="50" y="62">
        êxito
      </text>
    </svg>
  );
}
