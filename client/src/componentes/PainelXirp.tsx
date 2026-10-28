import { useEffect, useState } from "react";
import { listarXirpRuns, type XirpRun } from "../api";

type Props = {
  casoId: string;
};

const ROTULO_CITE: Record<XirpRun["citeStatus"], string> = {
  cited: "Com referências",
  silent: "Sem referências",
  mixed: "Misto",
};

export function PainelXirp({ casoId }: Props) {
  const [runs, setRuns] = useState<XirpRun[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    setRuns(null);
    setErro(null);
    listarXirpRuns(casoId)
      .then((lista) => {
        if (vivo) setRuns(lista);
      })
      .catch((falha: unknown) => {
        if (vivo) {
          setErro(falha instanceof Error ? falha.message : "Falha ao ler Xirp.");
        }
      });
    return () => {
      vivo = false;
    };
  }, [casoId]);

  return (
    <section>
      <header className="painel-cabeca">
        <h3>Xirp</h3>
        <p>
          Respostas SafeDTO liberadas pelo MCP do hub. O advogado pergunta no
          Claude ou Cursor; o painel só mostra o que já passou pelo firewall.
        </p>
      </header>

      {erro && <p className="vazio">{erro}</p>}
      {!erro && runs === null && <p className="vazio">Carregando releases…</p>}
      {!erro && runs && runs.length === 0 && (
        <p className="vazio">
          Nenhuma release ligada a este caso ainda. Conecte o cliente MCP em
          POST /api/mcp e chame uma ferramenta com o número do processo.
        </p>
      )}

      {runs && runs.length > 0 && (
        <ul className="lista-juris">
          {runs.map((run) => (
            <li key={run.id}>
              <div className="selos">
                <span className="selo neutro">{run.toolName}</span>
                <span className="selo neutro">{ROTULO_CITE[run.citeStatus]}</span>
                <span className="selo neutro">{run.releaseId}</span>
              </div>
              <p>{run.summary}</p>
              <span>
                {new Date(run.createdAt).toLocaleString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                })}{" "}
                · {run.referenceCount} ref.
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
