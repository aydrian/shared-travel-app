import { env } from "cloudflare:test";
import * as authModule from "@/lib/auth";
import { getTestInstance } from "@better-auth-kit/tests";
import type { Context } from "hono";
import type { AppBindings } from "@/lib/types";
import { getDB } from "@/db";
import { DefaultTripService, type TripService } from "@/services/trip-service";
import {
  DefaultParticipantService,
  type ParticipantService
} from "@/services/participant-service";

// Use hardcoded role IDs from the migration
const organizerRoleId = "org_role";
const participantRoleId = "part_role";
const viewerRoleId = "view_role";

export const testOrganizerUser = {
  name: "Olivia Organizer",
  email: "olivia@example.com",
  password: "password123",
  role: "Organizer",
  id: ""
};

export const testParticipantUser = {
  name: "Paul Participant",
  email: "paul@example.com",
  password: "password456",
  role: "Participant",
  id: ""
};

export const testViewerUser = {
  name: "Vicky Viewer",
  email: "vicky@example.com",
  password: "password789",
  role: "Viewer",
  id: ""
};

// Create a mock context to pass to getAuth
const mockContext = {
  env: {
    DB: env.DB
  }
} as Context<AppBindings>;

// Get the actual auth instance
const authInstance = authModule.getAuth(mockContext);

// Create a test instance of Better Auth using the actual auth instance
const { client: authClient, signInWithUser } = await getTestInstance(
  authInstance
);

export { authClient, signInWithUser, mockContext };

export async function setupTestData() {
  const organizerSignup = await authClient.signUp.email({
    name: testOrganizerUser.name,
    email: testOrganizerUser.email,
    password: testOrganizerUser.password
  });
  testOrganizerUser.id = organizerSignup.data?.user.id ?? "";

  const participantSignup = await authClient.signUp.email({
    name: testParticipantUser.name,
    email: testParticipantUser.email,
    password: testParticipantUser.password
  });
  testParticipantUser.id = participantSignup.data?.user.id ?? "";

  const viewerSignup = await authClient.signUp.email({
    name: testViewerUser.name,
    email: testViewerUser.email,
    password: testViewerUser.password
  });
  testViewerUser.id = viewerSignup.data?.user.id ?? "";

  const db = getDB(mockContext);

  // Create services
  const tripService: TripService = new DefaultTripService(db);
  const participantService: ParticipantService = new DefaultParticipantService(
    db
  );

  // Create a new trip using TripService
  const testTrip = await createTestTrip(
    testOrganizerUser,
    testParticipantUser,
    testViewerUser
  );

  return testTrip;
}

export async function createTestTrip(
  organizer: { id: string },
  participant: { id: string },
  viewer: { id: string }
) {
  const db = getDB(mockContext);

  // Create services
  const tripService: TripService = new DefaultTripService(db);
  const participantService: ParticipantService = new DefaultParticipantService(
    db
  );

  // Create a new trip using TripService
  const testTrip = await tripService.createTrip(
    {
      name: "Test Trip",
      destination: "Test Destination",
      startDate: "2023-07-01T00:00:00Z",
      endDate: "2023-07-07T00:00:00Z"
    },
    organizer.id,
    organizerRoleId
  );

  // Add participants using ParticipantService
  await participantService.addParticipant(
    testTrip.id,
    participant.id,
    participantRoleId
  );
  await participantService.addParticipant(
    testTrip.id,
    participant.id,
    viewerRoleId
  );
  await participantService.addParticipant(testTrip.id, viewer.id, viewerRoleId);

  return testTrip;
}

export async function signInWithOrganizer() {
  return signInWithUser(testOrganizerUser.email, testOrganizerUser.password);
}

export async function signInWithParticipant() {
  return signInWithUser(
    testParticipantUser.email,
    testParticipantUser.password
  );
}

export async function signInWithViewer() {
  return signInWithUser(testViewerUser.email, testViewerUser.password);
}
