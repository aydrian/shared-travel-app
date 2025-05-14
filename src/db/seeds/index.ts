import { seedRoles } from "./roles";
import { seedUsers } from "./users";
import { seedTrips } from "./trips";

async function main() {
  await seedRoles();
  // await seedUsers();
  // await seedTrips();
  // Add other seed functions here as needed
}

main().catch(console.error);
