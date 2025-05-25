import { createRouter } from "@/lib/create-app";
import { HTTPException } from "hono/http-exception";
import expenses from "./expenses";
import participants from "./participants";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { DefaultTripService, type TripService } from "@/services/trip-service";
import { withOsoAuth } from "@/middlewares/with-oso-auth";

const tripParamSchema = z.object({
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
  .get("/", withOsoAuth("Organization", "trip.list"), async (c) => {
    const user = c.get("user");
    const db = c.get("db");
    const oso = c.get("oso");

    try {
      // Create trip service
      const tripService: TripService = new DefaultTripService(db, oso);

      // biome-ignore lint/style/noNonNullAssertion: withAuth middleware ensures user is authenticated
      const userTrips = await tripService.getUserTrips(user!.id);

      return c.json(userTrips, 200);
    } catch (error) {
      console.error("Error fetching trips:", error);
      throw new HTTPException(500, { message: "Internal Server Error" });
    }
  })
  .post(
    "/",
    withOsoAuth("Organization", "trip.create"),
    zValidator("json", createTripSchema),
    async (c) => {
      const user = c.get("user");
      const db = c.get("db");
      const oso = c.get("oso");

      try {
        const tripData = c.req.valid("json");

        // Get the "Organizer" role
        const roles = c.get("roles");
        const organizerRole = roles.find((role) => role.name === "organizer");

        if (!organizerRole) {
          throw new HTTPException(500, { message: "Organizer role not found" });
        }

        // Create trip service
        const tripService: TripService = new DefaultTripService(db, oso);

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
    }
  )
  .patch(
    "/:tripId",
    zValidator("param", tripParamSchema),
    withOsoAuth("Trip", "manage"),
    zValidator("json", updateTripSchema),
    async (c) => {
      const db = c.get("db");
      const oso = c.get("oso");
      const { tripId } = c.req.valid("param");

      try {
        const updateData = c.req.valid("json");

        // Create trip service
        const tripService: TripService = new DefaultTripService(db, oso);

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
    withOsoAuth("Trip", "manage"),
    async (c) => {
      const db = c.get("db");
      const oso = c.get("oso");
      const { tripId } = c.req.valid("param");

      try {
        // Create trip service
        const tripService: TripService = new DefaultTripService(db, oso);

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
    withOsoAuth("Trip", "view"),
    async (c) => {
      const db = c.get("db");
      const oso = c.get("oso");
      const { tripId } = c.req.valid("param");

      try {
        // Create trip service
        const tripService: TripService = new DefaultTripService(db, oso);

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
