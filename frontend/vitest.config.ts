import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    // Node-окружение: здесь тестируется только чистая логика
    // (read-state, read-batch). DOM/IO-хуки покрываются вручную (см. AGENTS.md).
    environment: "node",
    include: ["src/**/*.spec.ts"],
  },
});
