import { useEffect, useState } from "react";
import { obterCaso } from "./api";
import { BarraTopo } from "./componentes/BarraTopo";
import { Carregando } from "./componentes/Carregando";
import { Confirmacoes } from "./paginas/Confirmacoes";
import { Consulta } from "./paginas/Consulta";
import { ContatoDpo } from "./paginas/ContatoDpo";
import { CatalogoBancario } from "./paginas/CatalogoBancario";
import { DetalheCaso } from "./paginas/DetalheCaso";
import { ListaCasos } from "./paginas/ListaCasos";
import { Notas } from "./paginas/Notas";
import { Workspace } from "./paginas/Workspace";
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
      <BarraTopo
        onInicio={() => setTela({ tipo: "casos" })}
        onCatalogo={() => setTela({ tipo: "catalogo" })}
        onWorkspace={() => setTela({ tipo: "workspace" })}
        onNotas={() => setTela({ tipo: "notas" })}
        onConsulta={() => setTela({ tipo: "consulta" })}
        onConfirmacoes={() => setTela({ tipo: "confirmacoes" })}
        onContatoDpo={() => setTela({ tipo: "contato-dpo" })}
      />
      <main>
        {tela.tipo === "casos" && (
          <ListaCasos onAbrir={(id) => setTela({ tipo: "caso", id })} />
        )}
        {tela.tipo === "catalogo" && (
          <CatalogoBancario onVoltar={() => setTela({ tipo: "casos" })} />
        )}
        {tela.tipo === "workspace" && (
          <Workspace onVoltar={() => setTela({ tipo: "casos" })} />
        )}
        {tela.tipo === "notas" && (
          <Notas onVoltar={() => setTela({ tipo: "casos" })} />
        )}
        {tela.tipo === "consulta" && (
          <Consulta onVoltar={() => setTela({ tipo: "casos" })} />
        )}
        {tela.tipo === "confirmacoes" && (
          <Confirmacoes onVoltar={() => setTela({ tipo: "casos" })} />
        )}
        {tela.tipo === "contato-dpo" && (
          <ContatoDpo onVoltar={() => setTela({ tipo: "casos" })} />
        )}
        {tela.tipo === "caso" && carregando && (
          <Carregando texto="Abrindo o caso no acervo." />
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
