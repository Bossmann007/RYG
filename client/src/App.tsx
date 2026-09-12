import { useState } from "react";
import { BarraTopo } from "./componentes/BarraTopo";
import { buscarCaso } from "./dados";
import { DetalheCaso } from "./paginas/DetalheCaso";
import { ListaCasos } from "./paginas/ListaCasos";
import { TelaApp } from "./tipos";

export function App() {
  const [tela, setTela] = useState<TelaApp>({ tipo: "casos" });
  const caso = tela.tipo === "caso" ? buscarCaso(tela.id) : undefined;

  return (
    <div className="shell">
      <BarraTopo onInicio={() => setTela({ tipo: "casos" })} />
      <main>
        {tela.tipo === "casos" && (
          <ListaCasos onAbrir={(id) => setTela({ tipo: "caso", id })} />
        )}
        {tela.tipo === "caso" && caso && (
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
