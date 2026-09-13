import { Contrato } from "@models/contrato.model";

/**
 * Contratos da demo, extraidos do mock do front (client/src/dados.ts).
 *
 * Os ids sao prefixados pelo caso porque no mock eles se repetem: `c1` existe
 * em tarifas, consignado, veiculo e em todos os outros. Dentro de um array
 * aninhado por caso isso nunca doeu; numa tabela com chave primaria, doeria no
 * primeiro insert. O prefixo resolve antes de o banco existir.
 */
function contrato(
  casoId: string,
  seq: number,
  titulo: string,
  data: string,
  origem: string,
  resumo: string
): Contrato {
  return {
    id: `${casoId}-c${seq}`,
    casoId,
    titulo,
    tipo: "Contrato",
    data,
    origem,
    resumo,
  };
}

export const CONTRATOS: Contrato[] = [
  contrato(
    "tarifas",
    1,
    "Cédula de crédito bancário nº 88.421",
    "08/01/2023",
    "Cliente",
    "Instrumento original com tarifa de cadastro e tarifa de avaliação de bem."
  ),
  contrato(
    "tarifas",
    2,
    "Termo de adesão a seguro prestamista",
    "08/01/2023",
    "Cliente",
    "Seguro embutido na operação, sem assinatura separada."
  ),
  contrato(
    "tarifas",
    3,
    "Aditivo de renegociação",
    "14/11/2023",
    "Cliente",
    "Repactuação do saldo com nova cobrança de tarifa de cadastro."
  ),
  contrato(
    "consignado",
    1,
    "Contrato de consignado nº 55.201",
    "2024",
    "Banco",
    "Documento apresentado pelo banco, com assinatura questionada."
  ),
  contrato(
    "consignado",
    2,
    "Termo de autorização de desconto",
    "2024",
    "Banco",
    "Autorização sem reconhecimento de firma e sem testemunhas."
  ),
  contrato(
    "veiculo",
    1,
    "Cédula de crédito com alienação fiduciária",
    "15/04/2023",
    "Cliente",
    "48 parcelas fixas, com CET destacado apenas no rodapé."
  ),
  contrato(
    "veiculo",
    2,
    "Proposta de seguro do veículo",
    "15/04/2023",
    "Cliente",
    "Seguro incluído na mesma assinatura do financiamento."
  ),
  contrato(
    "veiculo",
    3,
    "Termo de garantia estendida",
    "15/04/2023",
    "Cliente",
    "Produto adicional cobrado sem contratação separada."
  ),
  contrato(
    "conta-salario",
    1,
    "Contrato de empréstimo pessoal",
    "2023",
    "Cliente",
    "Prevê débito em conta como forma de pagamento."
  ),
  contrato(
    "conta-salario",
    2,
    "Termo de abertura de conta salário",
    "2019",
    "Cliente",
    "Conta destinada exclusivamente ao recebimento de salário."
  ),
  contrato(
    "cartao",
    1,
    "Contrato de cartão de crédito",
    "2021",
    "Cliente",
    "Prevê rotativo e parcelamento automático da fatura."
  ),
  contrato(
    "cartao",
    2,
    "Primeiro termo de renegociação",
    "2023",
    "Banco",
    "Incorporou encargos ao principal sem discriminar valores."
  ),
  contrato(
    "cartao",
    3,
    "Segundo termo de renegociação",
    "2023",
    "Banco",
    "Nova incorporação de encargos sobre o saldo já renegociado."
  ),
  contrato(
    "busca-apreensao",
    1,
    "Contrato de financiamento com alienação fiduciária",
    "2021",
    "Cliente",
    "48 parcelas, garantia sobre o caminhão."
  ),
  contrato(
    "busca-apreensao",
    2,
    "Termo de vistoria do veículo",
    "2021",
    "Cliente",
    "Estado do bem na entrega."
  ),
  contrato(
    "pix",
    1,
    "Contrato de conta empresarial",
    "2020",
    "Cliente",
    "Prevê limites de transação e sistema de segurança do banco."
  ),
  contrato(
    "pix",
    2,
    "Termo de adesão ao internet banking",
    "2020",
    "Cliente",
    "Define autenticação em dois fatores como padrão."
  ),
  contrato(
    "rural",
    1,
    "Cédula de crédito rural nº 12.774",
    "2020",
    "Cliente",
    "Operação de custeio de safra com garantia de penhor."
  ),
  contrato(
    "rural",
    2,
    "Apólice do seguro prestamista",
    "2020",
    "Banco",
    "Emitida no mesmo ato, sem proposta autônoma."
  ),
  contrato(
    "rural",
    3,
    "Termo de avaliação da safra",
    "2020",
    "Banco",
    "Serviço cobrado sem relatório correspondente."
  ),
];
