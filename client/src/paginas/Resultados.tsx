import { ResultadoPesquisa, ROTULO_ALINHAMENTO } from "../tipos";

type Props = {
  resultado: ResultadoPesquisa;
  onVoltar: () => void;
};

export function Resultados({ resultado, onVoltar }: Props) {
  const { process, jurisprudences, dissidioReport, chanceReport } = resultado;

  return (
    <section>
      <div className="cabecalho">
        <div>
          <h1 className="marca">Resultado da pesquisa</h1>
          <p className="subtitulo">{process.processNumber}</p>
        </div>
        <button className="voltar" type="button" onClick={onVoltar}>
          Nova pesquisa
        </button>
      </div>

      <article className="cartao">
        <h2>Processo</h2>
        <div className="grade">
          <p>
            <strong>Tribunal:</strong> {process.court}
          </p>
          <p>
            <strong>Câmara:</strong> {process.chamber}
          </p>
          <p>
            <strong>Classe:</strong> {process.caseClass}
          </p>
          <p>
            <strong>Órgão:</strong> {process.organ}
          </p>
        </div>
        <p>
          <strong>Tese:</strong> {process.thesis}
        </p>
        <p>{process.summary}</p>
        {process.importedFile && (
          <p className="ajuda">
            Arquivo importado (metadado da demo): {process.importedFile.name}
          </p>
        )}
        <p>
          <strong>Partes:</strong>
        </p>
        <ul className="lista">
          {process.parties.map((parte) => (
            <li key={parte.nome}>
              {parte.papel}: {parte.nome}
            </li>
          ))}
        </ul>
      </article>

      <article className="cartao">
        <h2>Jurisprudências e votos</h2>
        <div className="juris">
          {jurisprudences.map((item) => (
            <article key={item.id}>
              <p>
                <span className={`selo ${item.alignment}`}>
                  {ROTULO_ALINHAMENTO[item.alignment]}
                </span>{" "}
                {item.citeStatus === "unavailable" && (
                  <span className="selo unknown">Cite indisponível</span>
                )}{" "}
                <strong>
                  {item.court} — {item.chamber}
                </strong>
              </p>
              <p className="ajuda">{item.organ}</p>
              <p>
                <strong>Voto:</strong>{" "}
                {item.voteSummary || "Sem voto na fonte."}
              </p>
              <p className="ementa">
                {item.ementaSnippet ||
                  "Ementa ausente — esta demo não inventa cite."}
              </p>
            </article>
          ))}
        </div>
      </article>

      <article className="cartao">
        <h2>Dissídio entre câmaras</h2>
        <p>{dissidioReport.narrative}</p>
        <table className="tabela">
          <thead>
            <tr>
              <th>Tribunal</th>
              <th>Câmara</th>
              <th>Orientação</th>
              <th>Versus o caso</th>
              <th>Nota</th>
            </tr>
          </thead>
          <tbody>
            {dissidioReport.conflicts.map((linha) => (
              <tr key={`${linha.court}-${linha.chamber}`}>
                <td>{linha.court}</td>
                <td>{linha.chamber}</td>
                <td>{linha.orientationLabel}</td>
                <td>{ROTULO_ALINHAMENTO[linha.vsProcessChamber]}</td>
                <td>{linha.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>

      <article className="cartao">
        <h2>Chance e blindagem</h2>
        <p className="pontuacao">{chanceReport.score}/100</p>
        <p>
          <strong>{chanceReport.label}</strong>
        </p>
        <p>{chanceReport.rationale}</p>
        <p>
          <strong>Blindagem</strong>
        </p>
        <ul className="lista">
          {chanceReport.blindagem.map((ponto) => (
            <li key={ponto}>{ponto}</li>
          ))}
        </ul>
      </article>
    </section>
  );
}
