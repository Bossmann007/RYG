import { Jurisprudencia, ResultadoPesquisa, ROTULO_ALINHAMENTO } from "../tipos";

type Props = {
  resultado: ResultadoPesquisa;
  onVoltar: () => void;
};

function linha(rotulo: string, valor: string | null | undefined) {
  return (
    <tr>
      <th>{rotulo}</th>
      <td>{valor || "—"}</td>
    </tr>
  );
}

function FichaJuris({ item }: { item: Jurisprudencia }) {
  return (
    <article className="bloco">
      <div className="selos">
        <span className={`selo ${item.alignment}`}>
          {ROTULO_ALINHAMENTO[item.alignment]}
        </span>
        {item.citeStatus === "unavailable" && (
          <span className="selo unknown">Cite indisponível</span>
        )}
      </div>

      <table className="ficha">
        <tbody>
          {linha("Numeração processual", item.processNumber)}
          {linha("Numeração do acórdão", item.acordaoNumber)}
          {linha("Tribunal", item.court)}
          {linha("Órgão julgador", item.chamber)}
          {linha("Relator(a)", item.reporter)}
          {linha("Comarca", item.district)}
          {linha("Classe processual", item.caseClass)}
          {linha("Assunto", item.subjects?.join(" · "))}
          {linha("Julgamento", item.judgmentDate)}
          {linha("Publicação", item.publicationDate)}
          {linha("Tipo de decisão", item.decisionType)}
          {linha("Voto", item.voteSummary || "Sem voto na fonte.")}
        </tbody>
      </table>

      <p className="titulo-secao" style={{ fontSize: 13, marginBottom: 8 }}>
        Ementa
      </p>
      <div className="ementa">
        {item.ementaSnippet ||
          "Ementa ausente na fonte."}
      </div>
    </article>
  );
}

export function Resultados({ resultado, onVoltar }: Props) {
  const { process, jurisprudences, dissidioReport, chanceReport } = resultado;

  return (
    <section>
      <div className="resultado-topo">
        <h2>Resultado da pesquisa</h2>
        <button className="botao secundario" type="button" onClick={onVoltar}>
          Nova pesquisa
        </button>
      </div>

      <article className="bloco">
        <h3 className="titulo-secao">Processo consultado</h3>
        <table className="ficha">
          <tbody>
            {linha("Numeração processual", process.processNumber)}
            {linha("Tribunal", process.court)}
            {linha("Órgão julgador", process.chamber)}
            {linha("Classe processual", process.caseClass)}
            {linha("Assunto", process.subjects.join(" · "))}
            {linha("Unidade", process.courtUnit)}
            {linha("Tese", process.thesis)}
            {process.importedFile
              ? linha("Documento importado", process.importedFile.name)
              : null}
          </tbody>
        </table>
        <p>{process.summary}</p>
        <p>
          <strong>Partes: </strong>
          {process.parties
            .map((parte) => `${parte.papel}: ${parte.nome}`)
            .join(" · ")}
        </p>
      </article>

      <h3 className="titulo-secao">Jurisprudências encontradas</h3>
      {jurisprudences.map((item) => (
        <FichaJuris key={item.id} item={item} />
      ))}

      <article className="bloco">
        <h3 className="titulo-secao">Dissídio entre câmaras</h3>
        <p>{dissidioReport.narrative}</p>
        <table className="tabela">
          <thead>
            <tr>
              <th>Tribunal</th>
              <th>Órgão julgador</th>
              <th>Orientação</th>
              <th>Versus o caso</th>
              <th>Nota</th>
            </tr>
          </thead>
          <tbody>
            {dissidioReport.conflicts.map((linhaItem) => (
              <tr key={`${linhaItem.court}-${linhaItem.chamber}`}>
                <td>{linhaItem.court}</td>
                <td>{linhaItem.chamber}</td>
                <td>{linhaItem.orientationLabel}</td>
                <td>{ROTULO_ALINHAMENTO[linhaItem.vsProcessChamber]}</td>
                <td>{linhaItem.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>

      <article className="bloco">
        <h3 className="titulo-secao">Chance e blindagem</h3>
        <p className="pontuacao">{chanceReport.score}/100</p>
        <p style={{ textAlign: "center" }}>
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
