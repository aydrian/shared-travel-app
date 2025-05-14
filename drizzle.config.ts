import type { Config } from "drizzle-kit";

export default {
  out: "./src/db/migrations",
  schema: "./src/db/**.sql.ts",
  dialect: "sqlite",
  driver: "d1-http"
} satisfies Config;
