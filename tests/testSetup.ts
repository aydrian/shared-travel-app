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
import { DefaultExpenseService } from "@/services/expense-service";

// Use hardcoded role IDs from the migration
export const testRoles = {
  organizer: "org_role",
  participant: "part_role",
  viewer: "view_role"
};

const testUserData = {
  organizer: {
    name: "Olivia Organizer",
    email: "olivia@example.com",
    password: "password123"
  },
  participant: {
    name: "Paul Participant",
    email: "paul@example.com",
    password: "password456"
  },
  viewer: {
    name: "Vicky Viewer",
    email: "vicky@example.com",
    password: "password789"
  }
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
  const testUsers = {
    organizer: await createTestUser(testUserData.organizer),
    participant: await createTestUser(testUserData.participant),
    viewer: await createTestUser(testUserData.viewer)
  };

  // Create a new trip using TripService
  const testTrip = await createTestTrip(
    testUsers.organizer,
    testUsers.participant,
    testUsers.viewer
  );

  return { testTrip, testUsers };
}

type TestUser = {
  id: string;
  name: string;
  email: string;
  password: string;
};

export async function createTestUser({
  name,
  email,
  password
}: {
  name: string;
  email: string;
  password: string;
}): Promise<TestUser> {
  try {
    // Attempt to sign in silently
    const signInRes = await authClient.signIn.email({ email, password });

    // If sign-in is successful, the user already exists
    if (signInRes.data?.user) {
      const { id, name, email } = signInRes.data.user;
      return { id, name, email, password };
    }
  } catch (error) {
    // Ignore the error, as it likely means the user doesn't exist
  }

  // If sign-in fails or throws an error, create a new user
  const signUpRes = await authClient.signUp.email({
    name,
    email,
    password
  });

  if (!signUpRes.data?.user) {
    throw new Error(`Failed to create user: ${email}`);
  }

  const { id, name: createdName, email: createdEmail } = signUpRes.data.user;
  return { id, name: createdName, email: createdEmail, password };
}

export async function signInWithTestUser(user: TestUser) {
  return signInWithUser(user.email, user.password);
}

export async function createTestTrip(
  organizer: { id: string } & Record<string, unknown>,
  participant: { id: string } & Record<string, unknown>,
  viewer: { id: string } & Record<string, unknown>
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
    testRoles.organizer
  );

  // Add participants using ParticipantService
  await participantService.addParticipant(
    testTrip.id,
    participant.id,
    testRoles.participant
  );
  await participantService.addParticipant(
    testTrip.id,
    viewer.id,
    testRoles.viewer
  );

  return testTrip;
}

export async function createTestExpense(tripId: string, participantId: string) {
  const db = getDB(mockContext);
  const expenseService = new DefaultExpenseService(db);
  const newExpense = await expenseService.createExpense(tripId, participantId, {
    description: "Test Expense",
    amount: "100.00"
  });
  return newExpense;
}