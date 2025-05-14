import { seedRoles } from "./roles";
import { seedUsers } from "./users";
import { seedTrips } from "./trips";
import env from "@/env-runtime";

async function main() {
  await seedRoles(env);
  // await seedUsers(env);
  // await seedTrips(env);
  // Add other seed functions here as needed
}

main().catch(console.error);
