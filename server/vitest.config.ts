import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
  resolve: {
    alias: {
      "@common": path.resolve(__dirname, "src/common"),
      "@config": path.resolve(__dirname, "src/config"),
      "@models": path.resolve(__dirname, "src/models"),
      "@plugins": path.resolve(__dirname, "src/plugins"),
      "@modules": path.resolve(__dirname, "src/modules"),
    },
  },
});
