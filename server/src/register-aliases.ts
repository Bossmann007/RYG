import { join } from "path";

/* eslint-disable @typescript-eslint/no-var-requires */
const moduleAlias = require("module-alias");

const base = __dirname;

moduleAlias.addAliases({
  "@common": join(base, "common"),
  "@config": join(base, "config"),
  "@models": join(base, "models"),
  "@plugins": join(base, "plugins"),
  "@modules": join(base, "modules"),
});
