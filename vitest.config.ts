import { defineConfig } from "vitest/config";
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";
import path from "node:path";

export default defineConfig(
  defineWorkersConfig({
    test: {
      globals: true,
      poolOptions: {
        workers: {
          wrangler: { configPath: "./wrangler.jsonc" }
        }
      },
      env: {
        DATABASE_URL: "postgresql://user:password@localhost/database",
        BETTER_AUTH_SECRET: "secret-key",
        BETTER_AUTH_URL: "http://localhost:3000"
      }
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src")
      }
    }
  })
);
