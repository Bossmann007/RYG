import { SetMetadata } from "@nestjs/common";

export const PERMITE_CREDENCIAL_PA_KEY = "permiteCredencialPa";
/** Marks the only handlers a model credential (`pas_`) may reach. */
export const PermiteCredencialPa = () => SetMetadata(PERMITE_CREDENCIAL_PA_KEY, true);
