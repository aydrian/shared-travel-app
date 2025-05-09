import type { MiddlewareHandler } from "hono";
import type { AppBindings } from "@/lib/types";
import { createDb } from "@/db";
import { getGlobalRoles } from "@/lib/global-roles";

const withDatabase: MiddlewareHandler<AppBindings> = async (c, next) => {
  // Create and set the database client
  const db = createDb(c.env);
  c.set("db", db);

  // Set roles from global roles
  c.set("roles", getGlobalRoles());

  await next();
};

export default withDatabase;