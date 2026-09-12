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
    <div className="app">
      <div className="faixa-demo">
        DEMO com fixtures fictícias. A API pública do DataJud (capa/andamento) e
        as ementas oficiais dos tribunais entram depois. Esta tela só prova o
        loop do produto: processo → jurisprudência → dissídio → chance/blindagem.
      </div>

      {enviando && !resultado && (
        <div className="cartao carregando">
          <h2>Cruzando jurisprudências…</h2>
          <p>Comparando a câmara do caso com os votos das fixtures.</p>
        </div>
      )}

      {!enviando && !resultado && (
        <>
          <header className="cabecalho">
            <div>
              <h1 className="marca">OpenLegalAI</h1>
              <p className="subtitulo">
                Dissídio entre câmaras + chance e blindagem
              </p>
            </div>
          </header>
          <Inicio enviando={enviando} erro={erro} onPesquisar={pesquisar} />
        </>
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
    </div>
  );
}
