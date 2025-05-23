import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI } from "better-auth/plugins";
import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import type { Context } from "hono";

import { ORIGINS } from "@/config/constants";

import * as schema from "@/db/auth-schema.sql";
import type { AppBindings } from "@/lib/types";

let authInstance: ReturnType<typeof betterAuth>;

export const getAuth = (c: Context<AppBindings>) => {
  if (!authInstance) {
    authInstance = betterAuth({
      advanced: {
        defaultCookieAttributes: {
          httpOnly: true,
          sameSite: "lax",
          partitioned: true
        }
      },
      trustedOrigins: ORIGINS,
      emailAndPassword: {
        enabled: true
      },
      database: drizzleAdapter(
        drizzleD1(c.env.DB, {
          schema: {
            ...schema
          }
        }),
        {
          provider: "sqlite",
          usePlural: true
        }
      ),
      plugins: [openAPI(), bearer()]
    });
  }
  return authInstance;
};
