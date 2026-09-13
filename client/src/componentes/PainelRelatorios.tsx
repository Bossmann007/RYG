import { useMemo, useState } from "react";
import { baixarPdf } from "../lib/pdf";
import { hidratarPrazos } from "../prazos-escritorio";
import {
  CATALOGO_RELATORIOS,
  montarRelatorio,
  nomeArquivoRelatorio,
  RelatorioId,
} from "../relatorios";
import { Caso } from "../tipos";

export function PainelRelatorios({ caso }: { caso: Caso }) {
  const hidratado = useMemo(() => hidratarPrazos(caso), [caso]);
  const [ativo, setAtivo] = useState<RelatorioId>("memoria");
  const [exportando, setExportando] = useState<RelatorioId | null>(null);

  const documento = useMemo(
    () => montarRelatorio(hidratado, ativo),
    [ativo, hidratado]
  );

  function exportar(id: RelatorioId) {
    setExportando(id);
    try {
      baixarPdf(nomeArquivoRelatorio(hidratado, id), montarRelatorio(hidratado, id));
    } finally {
      window.setTimeout(() => setExportando(null), 400);
    }
  }

  return (
    <section className="painel">
      <header className="painel-cabeca">
        <h3>Relatórios</h3>
        <p>
          Cinco peças internas, cada uma com PDF próprio. Papel timbrado do
          escritório — não passa pelo gateway.
        </p>
      </header>

      <div className="grade-relatorios">
        {CATALOGO_RELATORIOS.map((item) => (
          <article
            key={item.id}
            className={ativo === item.id ? "cartao-relatorio ativo" : "cartao-relatorio"}
          >
            <button type="button" onClick={() => setAtivo(item.id)}>
              <p className="olho">{item.destinatario}</p>
              <strong>{item.titulo}</strong>
              <p>{item.texto}</p>
            </button>
            <button
              type="button"
              className="botao-pdf"
              onClick={() => exportar(item.id)}
              disabled={exportando === item.id}
            >
              {exportando === item.id ? "Gerando…" : "Exportar PDF"}
            </button>
          </article>
        ))}
      </div>

      <article className="folha" aria-label={documento.titulo}>
        <header className="folha-cabeca">
          <div>
            <p className="olho">Vilela &amp; Prado</p>
            <h4>{documento.titulo}</h4>
          </div>
          <span>Uso interno</span>
        </header>
        <p className="folha-sub">{documento.subtitulo}</p>
        <ul className="folha-meta">
          {documento.meta.map((linha) => (
            <li key={linha}>{linha}</li>
          ))}
        </ul>
        <p className="folha-aviso">{documento.aviso}</p>
        {documento.blocos.map((bloco, indice) => (
          <section key={`${bloco.olho || bloco.titulo || "bloco"}-${indice}`} className="folha-bloco">
            {bloco.olho ? <p className="olho">{bloco.olho}</p> : null}
            {bloco.titulo ? <h5>{bloco.titulo}</h5> : null}
            {bloco.linhas.map((linha) => (
              <p key={linha}>{linha}</p>
            ))}
          </section>
        ))}
        <footer className="folha-rodape">{documento.rodape}</footer>
      </article>
    </section>
  );
}
