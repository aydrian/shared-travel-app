import type { roles } from "@/db/trips-schema.sql";

export type Role = typeof roles.$inferSelect;

let globalRoles: Role[] = [];

export function setGlobalRoles(loadedRoles: Role[]) {
  globalRoles = loadedRoles;
}

export function getGlobalRoles(): Role[] {
  return globalRoles;
}
