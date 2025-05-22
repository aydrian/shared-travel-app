import {
  defineWorkersConfig,
  readD1Migrations
} from "@cloudflare/vitest-pool-workers/config";
import path from "node:path";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineWorkersConfig(async () => {
  // Read all migrations in the `migrations` directory
  const migrationsPath = path.join(__dirname, "src/db/migrations");
  const migrations = await readD1Migrations(migrationsPath);

  return {
    test: {
      deps: {
        optimizer: {
          ssr: {
            enabled: true,
            include: [
              "@noble/hashes",
              "@noble/hashes/**",
              "@paralleldrive/cuid2",
              "@paralleldrive/cuid2/**",
              "oso-cloud"
            ]
          }
        }
      },
      setupFiles: ["./tests/apply-migrations.ts"],
      globals: true,
      poolOptions: {
        workers: {
          singleWorker: true,
          isolatedStorage: false,
          wrangler: {
            configPath: "./wrangler.jsonc"
          },
          miniflare: {
            // Add a test-only binding for migrations, so we can apply them in a
            // setup file
            compatibilityFlags: ["nodejs_compat"],
            compatibilityDate: "2025-04-24",
            d1Databases: ["DB"],
            bindings: { TEST_MIGRATIONS: migrations }
          }
        }
      }
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src")
      }
    },
    plugins: [nodePolyfills({ include: ["https", "http", "url"] })],
    define: {
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV)
    }
  };
});
