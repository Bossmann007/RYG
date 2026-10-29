export const HONORARIO_KINDS = ["contratado"] as const;

export type HonorarioKind = (typeof HONORARIO_KINDS)[number];

export type HonorarioLancamento = {
  id: string;
  officeId: string;
  casoId: string;
  kind: HonorarioKind;
  amountCentavos: number;
  createdBy: string;
  createdAt: string;
};

export function isHonorarioKind(value: unknown): value is HonorarioKind {
  return (
    typeof value === "string" &&
    (HONORARIO_KINDS as readonly string[]).includes(value)
  );
}
