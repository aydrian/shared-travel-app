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

export async function seedTrips() {
  console.log("Seeding trips...");

  console.log("Trips seeding completed.");
}
