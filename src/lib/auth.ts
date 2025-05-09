import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createDb } from "@/db";
import { openAPI } from "better-auth/plugins";
import type { Environment } from "@/env";

export const createAuth = (env: Environment) => {
  const db = createDb(env); // create db per request
  return betterAuth({
    emailAndPassword: {
      enabled: true
    },
    database: drizzleAdapter(db, {
      provider: "pg"
    }),
    plugins: [openAPI()]
  });
};
