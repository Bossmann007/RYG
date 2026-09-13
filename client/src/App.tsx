import { useEffect, useState } from "react";
import { obterCaso } from "./api";
import { BarraTopo } from "./componentes/BarraTopo";
import { DetalheCaso } from "./paginas/DetalheCaso";
import { ListaCasos } from "./paginas/ListaCasos";
import { Caso, TelaApp } from "./tipos";

export function App() {
  const [tela, setTela] = useState<TelaApp>({ tipo: "casos" });
  const [caso, setCaso] = useState<Caso | undefined>();
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (tela.tipo !== "caso") {
      setCaso(undefined);
      setErro(null);
      setCarregando(false);
      return;
    }

    let cancelado = false;
    setCarregando(true);
    setErro(null);

    obterCaso(tela.id)
      .then((detalhe) => {
        if (!cancelado) {
          setCaso(detalhe);
        }
      })
      .catch((falha: unknown) => {
        if (!cancelado) {
          setCaso(undefined);
          setErro(falha instanceof Error ? falha.message : "Caso indisponível.");
        }
      })
      .finally(() => {
        if (!cancelado) {
          setCarregando(false);
        }
      });

    return () => {
      cancelado = true;
    };
  }, [tela]);

  return (
    <div className="shell">
      <BarraTopo onInicio={() => setTela({ tipo: "casos" })} />
      <main>
        {tela.tipo === "casos" && (
          <ListaCasos onAbrir={(id) => setTela({ tipo: "caso", id })} />
        )}
        {tela.tipo === "caso" && carregando && (
          <div className="vazio">
            <p>Abrindo o caso no acervo.</p>
          </div>
        )}
        {tela.tipo === "caso" && !carregando && erro && (
          <div className="vazio">
            <p>{erro}</p>
            <p>Volte à lista ou confira se o servidor está no TiDB.</p>
          </div>
        )}
        {tela.tipo === "caso" && !carregando && caso && (
          <DetalheCaso
            key={caso.id}
            caso={caso}
            onVoltar={() => setTela({ tipo: "casos" })}
          />
        )}
      </main>
    </div>
  );
}
