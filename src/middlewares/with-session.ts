import type { MiddlewareHandler } from "hono";
import type { AppBindings } from "@/lib/types";

const withSession: MiddlewareHandler<AppBindings> = async (c, next) => {
  console.log("Setting up session middleware...", c.req.raw.headers);
  const auth = c.get("auth");
  const userSession = await auth.api.getSession({ headers: c.req.raw.headers });
  console.log("User Session:", userSession);

  const { user, session } = userSession ?? { user: null, session: null };
  c.set("user", user);
  c.set("session", session);

  await next();
};

export default withSession;
