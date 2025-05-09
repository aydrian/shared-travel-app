import { createDb } from "@/db";
import { roles } from "@/db/schema";
import type { Environment } from "@/env";
import { eq } from "drizzle-orm";

const exampleRoles = [
  { name: "Organizer" },
  { name: "Participant" },
  { name: "Viewer" }
];

export async function seedRoles(env: Environment) {
  const db = createDb(env);

  console.log("Seeding roles...");

  for (const role of exampleRoles) {
    try {
      // Check if the role already exists
      const existingRole = await db
        .select()
        .from(roles)
        .where(eq(roles.name, role.name))
        .limit(1);

      if (existingRole.length === 0) {
        // If the role doesn't exist, insert it
        await db.insert(roles).values(role);
        console.log(`Role "${role.name}" inserted successfully.`);
      } else {
        console.log(`Role "${role.name}" already exists. Skipping.`);
      }
    } catch (error) {
      console.error(`Error processing role "${role.name}":`, error);
    }
  }

  console.log("Roles seeding completed.");
}
