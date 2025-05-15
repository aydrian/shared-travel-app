import { createRouter } from "@/lib/create-app";
import { HTTPException } from "hono/http-exception";
import { withTripAuth } from "@/middlewares/with-trip-auth";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { getGlobalRoles, type Role } from "@/lib/global-roles";
import { DefaultParticipantService, type ParticipantService } from "@/services/participant-service";

const tripParamSchema = z.object({
  tripId: z.string()
});

const participantParamSchema = z.object({
  tripId: z.string(),
  userId: z.string()
});

// Dynamically create the role enum from global roles
const roleNames = getGlobalRoles().map((role) => role.name) as Role["name"][];
const roleEnum = z.enum(roleNames as [Role["name"], ...Role["name"][]]);

const updateRoleSchema = z.object({
  role: roleEnum
});

const addParticipantSchema = z.object({
  user_id: z.string(),
  role_id: z.string()
});

const router = createRouter()
  .post(
    "/",
    zValidator("param", tripParamSchema),
    zValidator("json", addParticipantSchema),
    withTripAuth(["Organizer"]),
    async (c) => {
      const db = c.get("db");
      const { tripId } = c.req.valid("param");
      const { user_id, role_id } = c.req.valid("json");

      try {
        const participantService: ParticipantService = new DefaultParticipantService(db);
        const participant = await participantService.addParticipant(tripId, user_id, role_id);

        return c.json(
          {
            message: "Participant added/updated successfully.",
            participant
          },
          201
        );
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
        const participantService: ParticipantService = new DefaultParticipantService(db);
        const participants = await participantService.getParticipants(tripId);

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
        const globalRoles = getGlobalRoles();
        const newRole = globalRoles.find((r: Role) => r.name === role);

        if (!newRole) {
          throw new HTTPException(400, { message: "Invalid role" });
        }

        const participantService: ParticipantService = new DefaultParticipantService(db);
        const updatedParticipant = await participantService.updateParticipantRole(tripId, userId, newRole.id);

        return c.json(
          {
            message: "Participant role updated successfully.",
            participant: updatedParticipant
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
        const participantService: ParticipantService = new DefaultParticipantService(db);
        await participantService.removeParticipant(tripId, userId);

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