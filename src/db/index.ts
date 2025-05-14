import { type DrizzleD1Database, drizzle } from "drizzle-orm/d1";
import type { Context } from "hono";
import * as authSchema from "./auth-schema.sql";
import * as tripsSchema from "./trips-schema.sql";
import type { AppBindings } from "@/lib/types";

export const schema = { ...authSchema, ...tripsSchema };
export type DBSchema = typeof schema;

let dbInstance: DrizzleD1Database<DBSchema>;

export function getDB(c: Context<AppBindings>) {
  if (!dbInstance) {
    dbInstance = drizzle(c.env.DB, { schema });
  }
  return dbInstance;
}
