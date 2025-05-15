import type { MiddlewareHandler } from "hono";
import type { AppBindings } from "@/lib/types";
import { getAuth } from "@/lib/auth";

const withSession: MiddlewareHandler<AppBindings> = async (c, next) => {
  const auth = getAuth(c);
  const userSession = await auth.api.getSession({ headers: c.req.raw.headers });

  const { user, session } = userSession ?? { user: null, session: null };
  c.set("user", user);
  c.set("session", session);

  await next();
};

export default withSession;
