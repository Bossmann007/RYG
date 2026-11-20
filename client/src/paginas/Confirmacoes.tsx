import { useCallback, useEffect, useState } from "react";
import { confirmarPendenciaPa, listarPendenciasPa, PendenciaPa } from "../api";

type Props = {
  onVoltar: () => void;
};

const ROTULO_TOOL: Record<string, string> = {
  enviar_whatsapp: "Enviar WhatsApp",
  exportar_caso: "Exportar caso",
};

export function Confirmacoes({ onVoltar }: Props) {
  const [pendencias, setPendencias] = useState<PendenciaPa[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      setPendencias(await listarPendenciasPa());
    } catch (falha: unknown) {
      setPendencias(null);
      setErro(falha instanceof Error ? falha.message : "Confirmações indisponíveis.");
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function confirmar(desafio: string) {
    setErro(null);
    setConfirmando(desafio);
    try {
      await confirmarPendenciaPa(desafio);
    } catch (falha: unknown) {
      setErro(falha instanceof Error ? falha.message : "Confirmação recusada.");
    } finally {
      setConfirmando(null);
      await carregar();
    }
  }

  return (
    <section className="catalogo">
      <header className="detalhe-topo">
        <button className="voltar" type="button" onClick={onVoltar}>
          Casos
        </button>
        <div>
          <h2>Confirmações</h2>
          <p>Ações irreversíveis propostas pelo PA. Uma pessoa confirma aqui.</p>
        </div>
      </header>
      {erro && <p className="vazio">{erro}</p>}
      {pendencias && pendencias.length === 0 && <p className="vazio">Nada aguardando confirmação.</p>}
      {pendencias && pendencias.length > 0 && (
        <ul>
          {pendencias.map((p) => (
            <li key={p.desafio}>
              <span>
                {ROTULO_TOOL[p.tool] ?? p.tool}
                {p.caseId ? ` · caso ${p.caseId}` : ""}
              </span>{" "}
              <button type="button" disabled={confirmando !== null} onClick={() => void confirmar(p.desafio)}>
                Confirmar
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
