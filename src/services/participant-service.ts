import { users } from "@/db/auth-schema.sql";
import { tripRoles, roles } from "@/db/trips-schema.sql";
import { eq, and } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import type { DrizzleClient } from "@/lib/types";
import type { Oso } from "oso-cloud";
import type { PolarTypes } from "@/lib/polarTypes";

export interface Participant {
  user_id: string;
  name: string;
  email: string;
  role: string;
}

export interface ParticipantService {
  getParticipants(tripId: string): Promise<Participant[]>;
  addParticipant(
    tripId: string,
    userId: string,
    roleId: string
  ): Promise<Participant>;
  updateParticipantRole(
    tripId: string,
    userId: string,
    roleId: string
  ): Promise<Participant>;
  removeParticipant(tripId: string, userId: string): Promise<void>;
}

export class DefaultParticipantService implements ParticipantService {
  constructor(private db: DrizzleClient, private oso: Oso<PolarTypes>) {}

  async getParticipants(tripId: string): Promise<Participant[]> {
    try {
      const participants = await this.db
        .select({
          user_id: users.id,
          name: users.name,
          email: users.email,
          role: roles.name
        })
        .from(tripRoles)
        .innerJoin(users, eq(tripRoles.userId, users.id))
        .innerJoin(roles, eq(tripRoles.roleId, roles.id))
        .where(eq(tripRoles.tripId, tripId));

      return participants;
    } catch (error) {
      console.error("Error fetching participants:", error);
      throw new HTTPException(500, { message: "Internal Server Error" });
    }
  }

  async addParticipant(
    tripId: string,
    userId: string,
    roleId: string
  ): Promise<Participant> {
    try {
      // Check if the user exists
      const [existingUser] = await this.db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!existingUser) {
        throw new HTTPException(404, { message: "User not found" });
      }

      // Check if the participant is already in the trip
      const [existingParticipant] = await this.db
        .select()
        .from(tripRoles)
        .where(and(eq(tripRoles.tripId, tripId), eq(tripRoles.userId, userId)))
        .limit(1);

      if (existingParticipant) {
        // Update the existing participant's role
        await this.db
          .update(tripRoles)
          .set({ roleId: roleId })
          .where(
            and(eq(tripRoles.tripId, tripId), eq(tripRoles.userId, userId))
          );
      } else {
        // Add the new participant
        await this.db.insert(tripRoles).values({
          tripId,
          userId,
          roleId
        });
      }

      // Fetch the updated participant information
      const [participant] = await this.db
        .select({
          user_id: users.id,
          name: users.name,
          email: users.email,
          role: roles.name
        })
        .from(tripRoles)
        .innerJoin(users, eq(tripRoles.userId, users.id))
        .innerJoin(roles, eq(tripRoles.roleId, roles.id))
        .where(and(eq(tripRoles.tripId, tripId), eq(tripRoles.userId, userId)))
        .limit(1);

      await this.oso.insert([
        "has_role",
        { type: "Trip", id: tripId },
        { type: "String", id: roleId },
        { type: "User", id: userId }
      ]);

      return participant;
    } catch (error) {
      console.error("Error adding/updating participant:", error);
      if (error instanceof HTTPException) {
        throw error;
      }
      throw new HTTPException(500, { message: "Internal Server Error" });
    }
  }

  async updateParticipantRole(
    tripId: string,
    userId: string,
    roleId: string
  ): Promise<Participant> {
    try {
      // Update the participant's role
      const [updatedParticipant] = await this.db
        .update(tripRoles)
        .set({ roleId: roleId })
        .where(and(eq(tripRoles.tripId, tripId), eq(tripRoles.userId, userId)))
        .returning({ user_id: tripRoles.userId });

      if (!updatedParticipant) {
        throw new HTTPException(404, { message: "Participant not found" });
      }

      // Fetch the updated participant information
      const [participant] = await this.db
        .select({
          user_id: users.id,
          name: users.name,
          email: users.email,
          role: roles.name
        })
        .from(tripRoles)
        .innerJoin(users, eq(tripRoles.userId, users.id))
        .innerJoin(roles, eq(tripRoles.roleId, roles.id))
        .where(and(eq(tripRoles.tripId, tripId), eq(tripRoles.userId, userId)))
        .limit(1);

      await this.oso.delete([
        "has_role",
        { type: "Trip", id: tripId },
        null,
        { type: "User", id: userId }
      ]);
      await this.oso.insert([
        "has_role",
        { type: "Trip", id: tripId },
        { type: "String", id: roleId },
        { type: "User", id: userId }
      ]);

      return participant;
    } catch (error) {
      console.error("Error updating participant role:", error);
      if (error instanceof HTTPException) {
        throw error;
      }
      throw new HTTPException(500, { message: "Internal Server Error" });
    }
  }

  async removeParticipant(tripId: string, userId: string): Promise<void> {
    try {
      // Delete the participant's role for this trip
      const [deletedParticipant] = await this.db
        .delete(tripRoles)
        .where(and(eq(tripRoles.tripId, tripId), eq(tripRoles.userId, userId)))
        .returning({ userId: tripRoles.userId });

      if (!deletedParticipant) {
        throw new HTTPException(404, { message: "Participant not found" });
      }

      await this.oso.delete([
        "has_role",
        { type: "Trip", id: tripId },
        null,
        { type: "User", id: userId }
      ]);
    } catch (error) {
      console.error("Error removing participant:", error);
      if (error instanceof HTTPException) {
        throw error;
      }
      throw new HTTPException(500, { message: "Internal Server Error" });
    }
  }
}
