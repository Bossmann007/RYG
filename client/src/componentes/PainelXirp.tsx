import { useEffect, useState } from "react";
import { listarRunsXirp, RunXirp } from "../api";

const ROTULO_CITACAO: Record<RunXirp["citeStatus"], string> = {
  cited: "Citável",
  silent: "Sem citação",
  refused: "Recusada",
};

export function PainelXirp({ casoId }: { casoId: string }) {
  const [runs, setRuns] = useState<RunXirp[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    setRuns(null);
    setErro(null);
    listarRunsXirp(casoId)
      .then((lista) => {
        if (vivo) {
          setRuns(lista);
        }
      })
      .catch((falha: unknown) => {
        if (vivo) {
          setErro(falha instanceof Error ? falha.message : "Xirp indisponível.");
        }
      });
    return () => {
      vivo = false;
    };
  }, [casoId]);

  return (
    <section className="painel">
      <header className="painel-cabeca">
        <h3>Xirp</h3>
        <p>Chamadas do seu agente ao MCP do hub neste caso. Só metadado e o resumo SafeDTO.</p>
      </header>
      {erro ? <p>{erro}</p> : null}
      {runs && runs.length === 0 ? <p>Nenhuma chamada registrada para este caso.</p> : null}
      <ul className="lista-docs">
        {(runs ?? []).map((run) => (
          <li key={run.id}>
            <div>
              <strong>{run.toolName}</strong>
              <p>{run.summary}</p>
              <p>
                {run.releaseId ?? "sem release"} · {new Date(run.createdAt).toLocaleString("pt-BR")}
              </p>
            </div>
            <div className="selos">
              <span className="selo neutro">{ROTULO_CITACAO[run.citeStatus]}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
