import { useState } from "react";
import { pesquisarProcesso } from "./api";
import { Inicio } from "./paginas/Inicio";
import { Resultados } from "./paginas/Resultados";
import { ResultadoPesquisa } from "./tipos";

export function App() {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState<ResultadoPesquisa | null>(null);

  async function pesquisar(numero: string, nomeArquivo?: string) {
    setErro("");
    setEnviando(true);
    setResultado(null);

    try {
      const dados = await pesquisarProcesso(numero, nomeArquivo);
      setResultado(dados);
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível concluir a pesquisa."
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <header className="topo">
        <h1>OpenLegalAI</h1>
        <p>Consulta de jurisprudência · dissídio de câmaras</p>
      </header>

      <main className="app">
        {enviando && !resultado && (
          <div className="bloco carregando">
            <h2 className="titulo-secao">Cruzando jurisprudências…</h2>
            <p>Comparando a câmara do caso com os votos encontrados.</p>
          </div>
        )}

        {!enviando && !resultado && (
          <Inicio enviando={enviando} erro={erro} onPesquisar={pesquisar} />
        )}

        {resultado && (
          <Resultados
            resultado={resultado}
            onVoltar={() => {
              setResultado(null);
              setErro("");
            }}
          />
        )}
      </main>
    </>
  );
}
