import path from "node:path";
import { defineConfig } from "vitest/config";

const rootDir = import.meta.dirname;

/**
 * Minimal Vitest setup (brief §48) -- no jsdom, no React Testing Library:
 * everything tested here is pure domain/AI logic, not components. The
 * `server-only` alias lets test files import the same domain/`src/lib/ai`
 * modules the app uses, unmodified -- see src/test/server-only-stub.ts for
 * why that's needed and safe.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "server-only": path.resolve(rootDir, "src/test/server-only-stub.ts"),
      "@": path.resolve(rootDir, "src"),
    },
  },
});
