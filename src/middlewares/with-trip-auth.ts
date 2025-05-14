import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { eq, and } from "drizzle-orm";
import { tripRoles, roles } from "@/db/trips-schema.sql";
import type { AppBindings } from "@/lib/types";
import type { Role } from "@/lib/global-roles";

export const withTripAuth = (
  allowedRoles: Role["name"][]
): MiddlewareHandler<AppBindings> => {
  return async (c, next) => {
    const user = c.get("user");
    const db = c.get("db");
    const tripId = c.req.param("tripId");

    if (!user) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    if (!tripId) {
      throw new HTTPException(400, { message: "Trip ID is required" });
    }

    try {
      const globalRoles = c.get("roles");
      const allowedRoleIds = globalRoles
        .filter((role) => allowedRoles.includes(role.name))
        .map((role) => role.id);

      const userRoles = await db
        .select({
          id: tripRoles.roleId,
          name: roles.name
        })
        .from(tripRoles)
        .innerJoin(roles, eq(tripRoles.roleId, roles.id))
        .where(and(eq(tripRoles.tripId, tripId), eq(tripRoles.userId, user.id)))
        .limit(1);

      if (userRoles.length === 0 || !allowedRoleIds.includes(userRoles[0].id)) {
        throw new HTTPException(403, {
          message:
            "Forbidden: User does not have the required role for this action"
        });
      }

      // Add the user's role to the context for potential use in the route handler
      c.set("userTripRole", userRoles[0]);

      await next();
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      console.error("Error in trip authorization:", error);
      throw new HTTPException(500, { message: "Internal Server Error" });
    }
  };
};
