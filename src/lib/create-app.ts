import { Hono } from "hono";
import { requestId } from "hono/request-id";
import withSession from "@/middlewares/with-session";
import withDatabase from "@/middlewares/with-database";
import notFound from "@/middlewares/not-found";
import onError from "@/middlewares/on-error";
import authCors from "@/middlewares/auth-cors";
import type { AppBindings } from "@/lib/types";
import { getAuth } from "./auth";

export function createRouter() {
  return new Hono<AppBindings>({
    strict: false
  });
}

export default function createApp() {
  const app = createRouter();

  app.use(async (c, next) => {
    const auth = getAuth(c);
    c.set("auth", auth);
    await next();
  });

  app.use("/api/auth/*", authCors);
  app.use("*", withSession);
  app.use("*", withDatabase);

  app.use(requestId());
  app.onError(onError);
  app.notFound(notFound);
  return app;
}
