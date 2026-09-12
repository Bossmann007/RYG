export type OrientacaoCamara = "rejeita_revisao" | "aceita_revisao";

export type ParteProcesso = {
  papel: string;
  nome: string;
};

export type AndamentoProcesso = {
  data: string;
  descricao: string;
};

export type ArquivoImportado = {
  name: string;
};

export type Processo = {
  processNumber: string;
  court: string;
  courtUnit: string;
  caseClass: string;
  subjects: string[];
  chamber: string;
  organ: string;
  degree: string;
  distributionDate: string;
  parties: ParteProcesso[];
  movements: AndamentoProcesso[];
  thesis: string;
  summary: string;
  chamberOrientation: OrientacaoCamara;
  importedFile?: ArquivoImportado;
};
