import { createDb } from "@/db";
import { user } from "@/db/schema";
import type { Environment } from "@/env";
import { eq } from "drizzle-orm";

const exampleUsers = [
  {
    id: "bob123",
    name: "Bob Smith",
    email: "bob@example.com",
    emailVerified: true,
    image: "https://example.com/bob.jpg",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "alice456",
    name: "Alice Johnson",
    email: "alice@example.com",
    emailVerified: true,
    image: "https://example.com/alice.jpg",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "trudy789",
    name: "Trudy Williams",
    email: "trudy@example.com",
    emailVerified: true,
    image: "https://example.com/trudy.jpg",
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export async function seedUsers(env: Environment) {
  const db = createDb(env);

  console.log("Seeding users...");

  for (const userData of exampleUsers) {
    try {
      // Check if the user already exists
      const existingUser = await db
        .select()
        .from(user)
        .where(eq(user.email, userData.email))
        .limit(1);

      if (existingUser.length === 0) {
        // If the user doesn't exist, insert it
        await db.insert(user).values(userData);
        console.log(`User "${userData.name}" inserted successfully.`);
      } else {
        console.log(`User "${userData.name}" already exists. Skipping.`);
      }
    } catch (error) {
      console.error(`Error processing user "${userData.name}":`, error);
    }
  }

  console.log("Users seeding completed.");
}