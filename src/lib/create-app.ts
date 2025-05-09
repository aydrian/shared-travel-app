import { Hono } from "hono";
import { requestId } from "hono/request-id";
import withSession from "@/middlewares/with-session";
import withDatabase from "@/middlewares/with-database";
import notFound from "@/middlewares/not-found";
import onError from "@/middlewares/on-error";
import authCors from "@/middlewares/auth-cors";
import { parseEnv } from "@/env";
import type { AppBindings } from "@/lib/types";
import { createDb } from "@/db";
import { roles } from "@/db/schema";
import { setGlobalRoles } from "@/lib/global-roles";

export function createRouter() {
  return new Hono<AppBindings>({
    strict: false
  });
}

export default async function createApp() {
  const app = createRouter();

  // Load roles when the app starts
  const db = createDb(parseEnv(process.env));
  const loadedRoles = await db.select().from(roles);
  setGlobalRoles(loadedRoles);

  app.use((c, next) => {
    c.env = parseEnv(Object.assign(c.env || {}, process.env));
    return next();
  });

  app.use("/api/auth/*", authCors);
  app.use("*", withDatabase);
  app.use("*", withSession);

  app.use(requestId());
  app.onError(onError);
  app.notFound(notFound);
  return app;
}
