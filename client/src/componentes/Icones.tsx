import { ReactNode } from "react";

type Props = { className?: string };

function Svg({ className, children }: Props & { children: ReactNode }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function IconeCasos(props: Props) {
  return (
    <Svg {...props}>
      <rect x="3" y="4" width="7" height="7" rx="1.6" />
      <rect x="14" y="4" width="7" height="7" rx="1.6" />
      <rect x="3" y="13" width="7" height="7" rx="1.6" />
      <rect x="14" y="13" width="7" height="7" rx="1.6" />
    </Svg>
  );
}

export function IconeBusca(props: Props) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </Svg>
  );
}

export function IconeVoltar(props: Props) {
  return (
    <Svg {...props}>
      <path d="M15 6l-6 6 6 6" />
    </Svg>
  );
}

export function IconeVisao(props: Props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v5l3 2" />
    </Svg>
  );
}

export function IconePeca(props: Props) {
  return (
    <Svg {...props}>
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M14 3v6h6" />
    </Svg>
  );
}

export function IconeContrato(props: Props) {
  return (
    <Svg {...props}>
      <path d="M8 7h8M8 12h8M8 17h5" />
      <rect x="4" y="3" width="16" height="18" rx="2" />
    </Svg>
  );
}

export function IconePessoa(props: Props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 19c1.2-3 3.6-4.5 7-4.5S17.8 16 19 19" />
    </Svg>
  );
}

export function IconeMartelo(props: Props) {
  return (
    <Svg {...props}>
      <path d="M14 4l6 6-3 1-4-4-1-3z" />
      <path d="M8 10l6 6" />
      <path d="M4 20l6-6" />
    </Svg>
  );
}

export function IconeModelo(props: Props) {
  return (
    <Svg {...props}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 9h8M8 12h8M8 15h5" />
    </Svg>
  );
}

export function IconeHistorico(props: Props) {
  return (
    <Svg {...props}>
      <path d="M4 13a8 8 0 1 0 2-5.3" />
      <path d="M4 4v5h5" />
      <path d="M12 8v5l3 2" />
    </Svg>
  );
}

export function IconeTese(props: Props) {
  return (
    <Svg {...props}>
      <path d="M12 3l2.2 4.6L19 8.2l-3.5 3.4.8 4.9L12 14.2 7.7 16.5l.8-4.9L5 8.2l4.8-.6L12 3z" />
    </Svg>
  );
}

export function IconeResultado(props: Props) {
  return (
    <Svg {...props}>
      <path d="M4 16l5-5 3 3 8-8" />
      <path d="M14 6h6v6" />
    </Svg>
  );
}

export function IconeConversa(props: Props) {
  return (
    <Svg {...props}>
      <path d="M5 5h14v10H8l-3 3V5z" />
    </Svg>
  );
}

export function IconeJuris(props: Props) {
  return (
    <Svg {...props}>
      <path d="M6 4h12v4H6z" />
      <path d="M8 8v12" />
      <path d="M16 8v12" />
      <path d="M6 20h12" />
    </Svg>
  );
}

export function IconeGrafico(props: Props) {
  return (
    <Svg {...props}>
      <path d="M4 20V6" />
      <path d="M4 20h16" />
      <path d="M8 16v-5" />
      <path d="M12 16V8" />
      <path d="M16 16v-8" />
    </Svg>
  );
}

export function IconePrazo(props: Props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="13" r="7" />
      <path d="M12 10v3l2 1.5" />
      <path d="M9 4h6" />
    </Svg>
  );
}

export function IconeRelatorio(props: Props) {
  return (
    <Svg {...props}>
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M14 3v6h6" />
      <path d="M9 13h6M9 17h4" />
    </Svg>
  );
}
