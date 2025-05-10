import { createRouter } from "@/lib/create-app";
import { HTTPException } from "hono/http-exception";
import { eq, and } from "drizzle-orm";
import { tripRoles, roles, user } from "@/db/schema";
import { withTripAuth } from "@/middlewares/with-trip-auth";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { getGlobalRoles, type Role } from "@/lib/global-roles";

const tripParamSchema = z.object({
  tripId: z.string().uuid()
});

const participantParamSchema = z.object({
  tripId: z.string().uuid(),
  userId: z.string().uuid()
});

// Dynamically create the role enum from global roles
const roleNames = getGlobalRoles().map((role) => role.name) as Role["name"][];
const roleEnum = z.enum(roleNames as [Role["name"], ...Role["name"][]]);

const updateRoleSchema = z.object({
  role: roleEnum
});

const addParticipantSchema = z.object({
  user_id: z.string().uuid(),
  role_id: z.string().uuid()
});

const router = createRouter()
  .post(
    "/",
    zValidator("param", tripParamSchema),
    zValidator("json", addParticipantSchema),
    withTripAuth(["Organizer"]),
    async (c) => {
      const db = c.get("db");
      const globalRoles = c.get("roles");
      const { tripId } = c.req.valid("param");
      const { user_id, role_id } = c.req.valid("json");

      try {
        // Check if the user exists
        const [existingUser] = await db
          .select()
          .from(user)
          .where(eq(user.id, user_id))
          .limit(1);

        if (!existingUser) {
          throw new HTTPException(404, { message: "User not found" });
        }

        // Check if the role exists in global roles
        const role = globalRoles.find((r: Role) => r.id === role_id);
        if (!role) {
          throw new HTTPException(400, { message: "Invalid role" });
        }

        // Check if the participant is already in the trip
        const [existingParticipant] = await db
          .select()
          .from(tripRoles)
          .where(
            and(eq(tripRoles.tripId, tripId), eq(tripRoles.userId, user_id))
          )
          .limit(1);

        let participant: { userId: string };
        let message: string;
        let statusCode: 200 | 201;

        if (existingParticipant) {
          // Update the existing participant's role
          [participant] = await db
            .update(tripRoles)
            .set({ roleId: role_id })
            .where(
              and(eq(tripRoles.tripId, tripId), eq(tripRoles.userId, user_id))
            )
            .returning({ userId: tripRoles.userId });
          message = "Participant role updated successfully.";
          statusCode = 200;
        } else {
          // Add the new participant
          [participant] = await db
            .insert(tripRoles)
            .values({
              tripId,
              userId: user_id,
              roleId: role_id
            })
            .returning({ userId: tripRoles.userId });
          message = "Participant added successfully.";
          statusCode = 201;
        }

        return c.json({
          message,
          participant: {
            user_id: participant.userId,
            role: role.name
          }
        }, statusCode);
      } catch (error) {
        console.error("Error adding/updating participant:", error);
        if (error instanceof HTTPException) {
          throw error;
        }
        throw new HTTPException(500, { message: "Internal Server Error" });
      }
    }
  )
  .get(
    "/",
    zValidator("param", tripParamSchema),
    withTripAuth(["Organizer", "Participant", "Viewer"]),
    async (c) => {
      const db = c.get("db");
      const { tripId } = c.req.valid("param");

      try {
        const participants = await db
          .select({
            user_id: user.id,
            name: user.name,
            email: user.email,
            role: roles.name
          })
          .from(tripRoles)
          .innerJoin(user, eq(tripRoles.userId, user.id))
          .innerJoin(roles, eq(tripRoles.roleId, roles.id))
          .where(eq(tripRoles.tripId, tripId));

        return c.json({ participants }, 200);
      } catch (error) {
        console.error("Error fetching participants:", error);
        throw new HTTPException(500, { message: "Internal Server Error" });
      }
    }
  )
  .patch(
    "/:userId",
    zValidator("param", participantParamSchema),
    zValidator("json", updateRoleSchema),
    withTripAuth(["Organizer"]),
    async (c) => {
      const db = c.get("db");
      const { tripId, userId } = c.req.valid("param");
      const { role } = c.req.valid("json");

      try {
        // Get the role ID for the new role
        const [newRole] = await db
          .select()
          .from(roles)
          .where(eq(roles.name, role));

        if (!newRole) {
          throw new HTTPException(400, { message: "Invalid role" });
        }

        // Update the participant's role
        const [updatedParticipant] = await db
          .update(tripRoles)
          .set({ roleId: newRole.id })
          .where(
            and(eq(tripRoles.tripId, tripId), eq(tripRoles.userId, userId))
          )
          .returning({ user_id: tripRoles.userId });

        if (!updatedParticipant) {
          throw new HTTPException(404, { message: "Participant not found" });
        }

        return c.json(
          {
            message: "Participant role updated successfully.",
            participant: {
              user_id: updatedParticipant.user_id,
              role: role
            }
          },
          200
        );
      } catch (error) {
        console.error("Error updating participant role:", error);
        if (error instanceof HTTPException) {
          throw error;
        }
        throw new HTTPException(500, { message: "Internal Server Error" });
      }
    }
  )
  .delete(
    "/:userId",
    zValidator("param", participantParamSchema),
    withTripAuth(["Organizer"]),
    async (c) => {
      const db = c.get("db");
      const { tripId, userId } = c.req.valid("param");

      try {
        // Delete the participant's role for this trip
        const [deletedParticipant] = await db
          .delete(tripRoles)
          .where(
            and(eq(tripRoles.tripId, tripId), eq(tripRoles.userId, userId))
          )
          .returning({ userId: tripRoles.userId });

        if (!deletedParticipant) {
          throw new HTTPException(404, { message: "Participant not found" });
        }

        // Return 204 No Content status code
        return c.body(null, 204);
      } catch (error) {
        console.error("Error removing participant:", error);
        if (error instanceof HTTPException) {
          throw error;
        }
        throw new HTTPException(500, { message: "Internal Server Error" });
      }
    }
  );

export default router;