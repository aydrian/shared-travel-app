import {
  defineWorkersConfig,
  readD1Migrations
} from "@cloudflare/vitest-pool-workers/config";
import path from "node:path";

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
          singleWorker: false,
          isolatedStorage: true,
          wrangler: {
            configPath: "./wrangler.jsonc"
          },
          miniflare: {
            // Add a test-only binding for migrations, so we can apply them in a
            // setup file
            bindings: { TEST_MIGRATIONS: migrations, NODE_ENV: "test" }
          }
        }
      }
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src")
      }
    }
  };
});
