import { useState, useMemo } from "react";
import { Jurisprudencia, ROTULO_ALINHAMENTO, ROTULO_RELACAO, ROTULO_STATUS } from "../tipos";
import { SeloCitacao, SeloFonte, ementaExibida } from "./SelosPolitica";

type AbaGaveta = "essencial" | "fortalecer" | "blindar" | "contrapor";

function isMostlyUpperCase(text: string): boolean {
  const letters = text.replace(/[^a-zA-ZÀ-ÿ]/g, "");
  if (letters.length === 0) return false;
  const upper = letters.replace(/[^A-ZÀ-ÖØ-Þ]/g, "").length;
  return upper / letters.length > 0.7;
}

function textoCard(text: string): string {
  if (!isMostlyUpperCase(text)) return text;
  const lower = text.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

type Props = {
  item: Jurisprudencia;
  onFechar: () => void;
};

const ABAS: { id: AbaGaveta; rotulo: string; legenda: string }[] = [
  { id: "essencial", rotulo: "O essencial", legenda: "O que decidiu o julgamento." },
  { id: "fortalecer", rotulo: "Fortalecer", legenda: "Como usar isso a seu favor." },
  { id: "blindar", rotulo: "Blindar", legenda: "Onde você pode ser atacado." },
  { id: "contrapor", rotulo: "Quebrar", legenda: "Como derrubar esse argumento." },
];

const FALLBACK_BLOCO: Record<AbaGaveta, { resumo: string; itens: string[] }> = {
  essencial: {
    resumo: "Análise detalhada ainda não disponível para este julgado.",
    itens: ["Consulte a ementa oficial para os fundamentos da decisão."],
  },
  fortalecer: {
    resumo: "Pontos de fortalecimento ainda não mapeados.",
    itens: ["Analise a ementa para identificar argumentos favoráveis."],
  },
  blindar: {
    resumo: "Pontos de vulnerabilidade ainda não mapeados.",
    itens: ["Revise a fundamentação para antecipar contra-argumentos."],
  },
  contrapor: {
    resumo: "Estratégias de contraposição ainda não disponíveis.",
    itens: ["Identifique divergências doutrinárias ou fáticas aplicáveis."],
  },
};

function blocoComFallback(bloco: { resumo: string; itens: string[] }, aba: AbaGaveta) {
  const temConteudo = bloco.resumo.trim() || bloco.itens.length > 0;
  return temConteudo ? bloco : FALLBACK_BLOCO[aba];
}

export function GavetaJuris({ item, onFechar }: Props) {
  const [aba, setAba] = useState<AbaGaveta>("essencial");

  const blocoOriginal = item[aba];
  const bloco = blocoComFallback(blocoOriginal, aba);
  const legenda = ABAS.find((itemAba) => itemAba.id === aba)?.legenda;
  const ehPrecedenteTema = item.relacao === "precedente_tema";

  const itensUnicos = useMemo(() => {
    const vistos = new Set<string>();
    return bloco.itens.filter((linha) => {
      const normalizado = linha.trim().toLowerCase();
      if (vistos.has(normalizado)) return false;
      vistos.add(normalizado);
      return true;
    });
  }, [bloco.itens]);

  return (
    <div className="gaveta-fundo" onClick={onFechar} role="presentation">
      <aside
        className="gaveta"
        role="dialog"
        aria-label="Jurisprudência"
        onClick={(evento) => evento.stopPropagation()}
      >
        <div className="gaveta-topo">
          <div className="selos">
            <span className={`selo alinhamento-${item.alignment}`}>
              {ROTULO_ALINHAMENTO[item.alignment]}
            </span>
            <span className={`selo status-${item.status}`}>
              {ROTULO_STATUS[item.status]}
            </span>
            <SeloCitacao item={item} />
            <SeloFonte fonte={item.fonte || "acervo_interno"} />
            {ehPrecedenteTema && (
              <span className="selo relacao-tema">{ROTULO_RELACAO.precedente_tema}</span>
            )}
          </div>
          <button className="botao-texto" type="button" onClick={onFechar}>
            Fechar
          </button>
        </div>

        <h3>{item.acordao}</h3>
        <p className="gaveta-meta">
          {item.chamber} · {item.reporter}
        </p>
        <p className="gaveta-meta">{item.processNumber}</p>
        <p className="ementa">{ementaExibida(item)}</p>
        {!item.citavel && (
          <p className="aviso-nao-citavel">
            Notas abaixo são acervo interno. Não são julgamento oficial.
          </p>
        )}
        {ehPrecedenteTema && item.citavel && (
          <p className="aviso-tema">
            Precedente relacionado por tema. Ementa oficial do TJPR, mas não é o mesmo processo.
          </p>
        )}

        <div className="pontos">
          {item.pontos.map((ponto) => (
            <span key={ponto} className="chip">
              {ponto}
            </span>
          ))}
        </div>

        <div className="abas-gaveta">
          {ABAS.map((itemAba) => (
            <button
              key={itemAba.id}
              className={aba === itemAba.id ? "aba ativa" : "aba"}
              type="button"
              onClick={() => setAba(itemAba.id)}
            >
              {itemAba.rotulo}
            </button>
          ))}
        </div>

        <p className="gaveta-legenda">{legenda}</p>
        <p className="bloco-resumo">{textoCard(bloco.resumo)}</p>

        <ul className="lista-limpa">
          {itensUnicos.map((linha) => (
            <li key={linha}>{textoCard(linha)}</li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
