import { createRouter } from "@/lib/create-app";
import { HTTPException } from "hono/http-exception";
import expenses from "./expenses";
import participants from "./participants";
import { eq, and } from "drizzle-orm";
import { trips, tripRoles, roles } from "@/db/schema";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { withTripAuth } from "@/middlewares/with-trip-auth";

const createTripSchema = z.object({
  name: z.string().min(1, "Name is required"),
  destination: z.string().min(1, "Destination is required"),
  startDate: z.string().datetime(),
  endDate: z.string().datetime()
});

const updateTripSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  destination: z.string().min(1, "Destination is required").optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

const router = createRouter()
  .basePath("/api/trips")
  .get("/", async (c) => {
    const user = c.get("user");
    const db = c.get("db");

    try {
      if (!user) {
        throw new HTTPException(401, { message: "Unauthorized" });
      }

      const userTrips = await db
        .select({
          id: trips.id,
          name: trips.name,
          destination: trips.destination,
          startDate: trips.startDate,
          endDate: trips.endDate,
          ownerId: trips.ownerId,
          createdAt: trips.createdAt,
          roleId: tripRoles.roleId,
          roleName: roles.name
        })
        .from(tripRoles)
        .innerJoin(trips, eq(tripRoles.tripId, trips.id))
        .innerJoin(roles, eq(tripRoles.roleId, roles.id))
        .where(eq(tripRoles.userId, user.id));

      return c.json(userTrips, 200);
    } catch (error) {
      console.error("Error fetching trips:", error);
      throw new HTTPException(500, { message: "Internal Server Error" });
    }
  })
  .post("/", zValidator("json", createTripSchema), async (c) => {
    const user = c.get("user");
    const db = c.get("db");

    if (!user) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    try {
      const { name, destination, startDate, endDate } = c.req.valid("json");

      // Create new trip
      const [newTrip] = await db
        .insert(trips)
        .values({
          name,
          destination,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          ownerId: user.id
        })
        .returning();

      // Get the "Organizer" role
      const roles = c.get("roles");
      const organizerRole = roles.find((role) => role.name === "Organizer");

      if (!organizerRole) {
        throw new HTTPException(500, { message: "Organizer role not found" });
      }

      // Assign the user the "Organizer" role for this trip
      await db.insert(tripRoles).values({
        tripId: newTrip.id,
        userId: user.id,
        roleId: organizerRole.id
      });

      return c.json(newTrip, 201);
    } catch (error) {
      console.error("Error creating trip:", error);
      throw new HTTPException(500, { message: "Internal Server Error" });
    }
  })
  .patch("/:tripId", withTripAuth(["Organizer"]), zValidator("json", updateTripSchema), async (c) => {
    const db = c.get("db");
    const tripId = c.req.param("tripId");

    try {
      const updateData = c.req.valid("json");

      // Prepare an object for the database update
      const updateValues: Partial<typeof trips.$inferInsert> = {};

      // Convert date strings to Date objects if they exist
      if (updateData.name) updateValues.name = updateData.name;
      if (updateData.destination) updateValues.destination = updateData.destination;
      if (updateData.startDate) updateValues.startDate = new Date(updateData.startDate);
      if (updateData.endDate) updateValues.endDate = new Date(updateData.endDate);

      // Update the trip
      const [updatedTrip] = await db
        .update(trips)
        .set(updateValues)
        .where(eq(trips.id, tripId))
        .returning();

      if (!updatedTrip) {
        throw new HTTPException(404, { message: "Trip not found" });
      }

      return c.json(updatedTrip, 200);
    } catch (error) {
      console.error("Error updating trip:", error);
      if (error instanceof HTTPException) {
        throw error;
      }
      throw new HTTPException(500, { message: "Internal Server Error" });
    }
  })
  .delete("/:tripId", withTripAuth(["Organizer"]), async (c) => {
    const db = c.get("db");
    const tripId = c.req.param("tripId");

    try {
      // Delete the trip
      const deletedTrip = await db
        .delete(trips)
        .where(eq(trips.id, tripId))
        .returning();

      if (deletedTrip.length === 0) {
        throw new HTTPException(404, { message: "Trip not found" });
      }

      return c.body(null, 204);
    } catch (error) {
      console.error("Error deleting trip:", error);
      throw new HTTPException(500, { message: "Internal Server Error" });
    }
  })
  .get("/:tripId", withTripAuth(["Organizer", "Participant", "Viewer"]), async (c) => {
    const db = c.get("db");
    const tripId = c.req.param("tripId");

    try {
      // Fetch trip details
      const tripDetails = await db
        .select({
          id: trips.id,
          name: trips.name,
          destination: trips.destination,
          startDate: trips.startDate,
          endDate: trips.endDate,
          ownerId: trips.ownerId,
          createdAt: trips.createdAt,
          roleId: tripRoles.roleId
        })
        .from(trips)
        .innerJoin(tripRoles, eq(trips.id, tripRoles.tripId))
        .where(eq(trips.id, tripId))
        .limit(1);

      if (tripDetails.length === 0) {
        throw new HTTPException(404, { message: "Trip not found" });
      }

      // Get user role name from cached roles
      const roles = c.get("roles");
      const userRole = roles.find((role) => role.id === tripDetails[0].roleId);

      return c.json({ ...tripDetails[0], userRole: userRole?.name }, 200);
    } catch (error) {
      console.error("Error fetching trip details:", error);
      throw new HTTPException(500, { message: "Internal Server Error" });
    }
  })
  .route("/:tripId/expenses", expenses)
  .route("/:tripId/participants", participants);

export default router;