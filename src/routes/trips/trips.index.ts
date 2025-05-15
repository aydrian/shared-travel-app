import { createRouter } from "@/lib/create-app";
import { HTTPException } from "hono/http-exception";
import expenses from "./expenses";
import participants from "./participants";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { withAuth } from "@/middlewares/with-auth";
import { withTripAuth } from "@/middlewares/with-trip-auth";
import { DefaultTripService, type TripService } from "@/services/trip-service";

export const tripParamSchema = z.object({
  tripId: z.string()
});

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
  .get("/", withAuth, async (c) => {
    const user = c.get("user");
    const db = c.get("db");

    try {
      // Create trip service
      const tripService: TripService = new DefaultTripService(db);

      // biome-ignore lint/style/noNonNullAssertion: withAuth middleware ensures user is authenticated
      const userTrips = await tripService.getUserTrips(user!.id);

      return c.json(userTrips, 200);
    } catch (error) {
      console.error("Error fetching trips:", error);
      throw new HTTPException(500, { message: "Internal Server Error" });
    }
  })
  .post("/", withAuth, zValidator("json", createTripSchema), async (c) => {
    const user = c.get("user");
    const db = c.get("db");

    try {
      const tripData = c.req.valid("json");

      // Get the "Organizer" role
      const roles = c.get("roles");
      const organizerRole = roles.find((role) => role.name === "Organizer");

      if (!organizerRole) {
        throw new HTTPException(500, { message: "Organizer role not found" });
      }

      // Create trip service
      const tripService: TripService = new DefaultTripService(db);

      const newTrip = await tripService.createTrip(
        tripData,
        // biome-ignore lint/style/noNonNullAssertion: withAuth middleware ensures user is authenticated
        user!.id,
        organizerRole.id
      );

      return c.json(newTrip, 201);
    } catch (error) {
      console.error("Error creating trip:", error);
      throw new HTTPException(500, { message: "Internal Server Error" });
    }
  })
  .patch(
    "/:tripId",
    zValidator("param", tripParamSchema),
    withTripAuth(["Organizer"]),
    zValidator("json", updateTripSchema),
    async (c) => {
      const db = c.get("db");
      const { tripId } = c.req.valid("param");

      try {
        const updateData = c.req.valid("json");

        // Create trip service
        const tripService: TripService = new DefaultTripService(db);

        // Update the trip using the service
        const updatedTrip = await tripService.updateTrip(tripId, updateData);

        return c.json(updatedTrip, 200);
      } catch (error) {
        console.error("Error updating trip:", error);
        if (error instanceof HTTPException) {
          throw error;
        }
        throw new HTTPException(500, { message: "Internal Server Error" });
      }
    }
  )
  .delete(
    "/:tripId",
    zValidator("param", tripParamSchema),
    withTripAuth(["Organizer"]),
    async (c) => {
      const db = c.get("db");
      const { tripId } = c.req.valid("param");

      try {
        // Create trip service
        const tripService: TripService = new DefaultTripService(db);

        // Delete the trip using the service
        await tripService.deleteTrip(tripId);

        return c.body(null, 204);
      } catch (error) {
        console.error("Error deleting trip:", error);
        throw new HTTPException(500, { message: "Internal Server Error" });
      }
    }
  )
  .get(
    "/:tripId",
    zValidator("param", tripParamSchema),
    withTripAuth(["Organizer", "Participant", "Viewer"]),
    async (c) => {
      const db = c.get("db");
      const { tripId } = c.req.valid("param");

      try {
        // Create trip service
        const tripService: TripService = new DefaultTripService(db);

        // Get roles from context
        const roles = c.get("roles");

        // Get trip details using the service
        const tripDetails = await tripService.getTripDetails(tripId, roles);

        return c.json(tripDetails, 200);
      } catch (error) {
        console.error("Error fetching trip details:", error);
        throw new HTTPException(500, { message: "Internal Server Error" });
      }
    }
  )
  .route("/:tripId/expenses", expenses)
  .route("/:tripId/participants", participants);

export default router;
