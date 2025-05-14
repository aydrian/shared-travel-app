import type { MiddlewareHandler } from "hono";
import type { AppBindings } from "@/lib/types";
import { getGlobalRoles, setGlobalRoles } from "@/lib/global-roles";
import { roles } from "@/db/trips-schema.sql";
import { getDB } from "@/db";

const withDatabase: MiddlewareHandler<AppBindings> = async (c, next) => {
  // Create and set the database client
  const db = getDB(c);
  c.set("db", db);

  // Check if global roles are empty
  let globalRoles = getGlobalRoles();
  if (globalRoles.length === 0) {
    // Load roles from the database
    const loadedRoles = await db.select().from(roles);
    setGlobalRoles(loadedRoles);
    globalRoles = loadedRoles;
  }

  // Set roles from global roles
  c.set("roles", globalRoles);

  await next();
};

export default withDatabase;
