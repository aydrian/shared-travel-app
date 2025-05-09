import type { MiddlewareHandler } from "hono";
import { createAuth } from "@/lib/auth";
import type { AppBindings } from "@/lib/types";

const withSession: MiddlewareHandler<AppBindings> = async (c, next) => {
  const auth = createAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  c.set("user", session?.user ?? null);
  c.set("session", session?.session ?? null);

  await next();
};

export default withSession;
