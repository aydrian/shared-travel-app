import { createDb } from "@/db";
import { trips, tripRoles, roles } from "@/db/schema";
import type { Environment } from "@/env";
import { eq } from "drizzle-orm";

const currentYear = new Date().getFullYear();

const exampleTrips = [
  {
    name: "Summer Beach Getaway",
    destination: "Malibu, California",
    startDate: new Date(`${currentYear}-07-15`),
    endDate: new Date(`${currentYear}-07-22`),
    organizer: "bob123",
    participants: ["alice456"],
    viewers: ["trudy789"]
  },
  {
    name: "Mountain Hiking Adventure",
    destination: "Rocky Mountains, Colorado",
    startDate: new Date(`${currentYear}-08-10`),
    endDate: new Date(`${currentYear}-08-17`),
    organizer: "alice456",
    participants: ["bob123", "trudy789"],
    viewers: []
  },
  {
    name: "City Tour in Europe",
    destination: "Paris, France",
    startDate: new Date(`${currentYear}-09-05`),
    endDate: new Date(`${currentYear}-09-15`),
    organizer: "trudy789",
    participants: ["bob123"],
    viewers: ["alice456"]
  }
];

export async function seedTrips(env: Environment) {
  const db = createDb(env);

  console.log("Seeding trips...");

  for (const tripData of exampleTrips) {
    try {
      // Check if the trip already exists
      const existingTrip = await db
        .select()
        .from(trips)
        .where(eq(trips.name, tripData.name))
        .limit(1);

      if (existingTrip.length === 0) {
        // If the trip doesn't exist, insert it
        const [newTrip] = await db
          .insert(trips)
          .values({
            name: tripData.name,
            destination: tripData.destination,
            startDate: tripData.startDate,
            endDate: tripData.endDate,
            ownerId: tripData.organizer
          })
          .returning();

        console.log(`Trip "${tripData.name}" inserted successfully.`);

        // Assign roles
        const roleIds = await db.select().from(roles);
        const organizerRole = roleIds.find((r) => r.name === "Organizer");
        const participantRole = roleIds.find((r) => r.name === "Participant");
        const viewerRole = roleIds.find((r) => r.name === "Viewer");

        if (organizerRole && participantRole && viewerRole) {
          // Assign organizer
          await db.insert(tripRoles).values({
            tripId: newTrip.id,
            userId: tripData.organizer,
            roleId: organizerRole.id
          });

          // Assign participants
          for (const participantId of tripData.participants) {
            await db.insert(tripRoles).values({
              tripId: newTrip.id,
              userId: participantId,
              roleId: participantRole.id
            });
          }

          // Assign viewers
          for (const viewerId of tripData.viewers) {
            await db.insert(tripRoles).values({
              tripId: newTrip.id,
              userId: viewerId,
              roleId: viewerRole.id
            });
          }

          console.log(`Roles assigned for trip "${tripData.name}".`);
        } else {
          console.error("Could not find all required roles.");
        }
      } else {
        console.log(`Trip "${tripData.name}" already exists. Skipping.`);
      }
    } catch (error) {
      console.error(`Error processing trip "${tripData.name}":`, error);
    }
  }

  console.log("Trips seeding completed.");
}
