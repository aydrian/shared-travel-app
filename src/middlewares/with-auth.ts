import type { MiddlewareHandler } from "hono";
import type { AppBindings } from "@/lib/types";
import { HTTPException } from "hono/http-exception";

export const withAuth: MiddlewareHandler<AppBindings> = async (c, next) => {
  const user = c.get("user");
  const session = c.get("session");
  console.log("User:", user);
  console.log("Session:", session);
  if (!user) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }
  await next();
};
