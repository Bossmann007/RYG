import { useEffect, useState } from "react";
import { RecursoAba, listarAba } from "../api";
import { Documento } from "../tipos";
import { Carregando } from "./Carregando";
import { PainelDocumentos } from "./PaineisCaso";

type Props = {
  titulo: string;
  texto: string;
  casoId: string;
  processNumber: string;
  recurso: RecursoAba;
};

export function PainelAcervo({
  titulo,
  texto,
  casoId,
  processNumber,
  recurso,
}: Props) {
  const [itens, setItens] = useState<Documento[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    setItens(null);
    setErro(null);

    listarAba(recurso, { casoId, processNumber })
      .then((lista) => {
        if (!cancelado) {
          setItens(lista);
        }
      })
      .catch((falha: unknown) => {
        if (!cancelado) {
          setItens([]);
          setErro(falha instanceof Error ? falha.message : "Acervo indisponível.");
        }
      });

    return () => {
      cancelado = true;
    };
  }, [casoId, processNumber, recurso]);

  if (erro) {
    return (
      <div className="vazio painel">
        <p>{erro}</p>
      </div>
    );
  }

  if (!itens) {
    return <Carregando texto="Lendo o acervo no banco." />;
  }

  return <PainelDocumentos titulo={titulo} texto={texto} itens={itens} />;
}
