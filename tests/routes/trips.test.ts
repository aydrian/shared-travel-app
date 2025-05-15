import { describe, expect, it, vi, beforeEach, beforeAll } from "vitest";
import { env } from "cloudflare:test";
import { testClient } from "hono/testing";
import app from "@/app";
import * as authModule from "@/lib/auth";
import {
  testOrganizerUser,
  testParticipantUser,
  testViewerUser,
  signInWithOrganizer,
  signInWithParticipant,
  signInWithViewer,
  mockContext,
  setupTestData,
  createTestTrip
} from "../testSetup";

// Mock the getAuth function to return the authInstance
vi.spyOn(authModule, "getAuth").mockReturnValue(
  authModule.getAuth(mockContext)
);

describe("Trip Routes Authorization", () => {
  const client = testClient(app, env);

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  let testTrip: any;

  const updateData = { name: "Updated Trip" };
  const createData = {
    name: "New Trip",
    destination: "New York",
    startDate: "2023-01-01T00:00:00Z",
    endDate: "2023-01-07T00:00:00Z"
  };

  beforeAll(async () => {
    testTrip = await setupTestData();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /trips", () => {
    it("should allow authenticated users to list trips", async () => {
      const { headers } = await signInWithOrganizer();

      const res = await client.api.trips.$get(
        {},
        { headers: { Cookie: headers.get("cookie") || "" } }
      );

      expect(res.status).toBe(200);
      const responseBody = await res.json();
      expect(Array.isArray(responseBody)).toBe(true);
    });

    it("should deny unauthenticated users from listing trips", async () => {
      const res = await client.api.trips.$get();

      expect(res.status).toBe(401);
    });
  });

  describe("POST /trips", () => {
    it("should allow authenticated users to create a trip", async () => {
      const { headers } = await signInWithOrganizer();

      const res = await client.api.trips.$post(
        {
          json: createData
        },
        { headers: { Cookie: headers.get("cookie") || "" } }
      );

      expect(res.status).toBe(201);
      const responseBody = await res.json();
      expect(responseBody).toHaveProperty("id");
    });

    it("should deny unauthenticated users from creating a trip", async () => {
      const res = await client.api.trips.$post({
        json: createData
      });

      expect(res.status).toBe(401);
    });
  });

  describe("PATCH /trips/:tripId", () => {
    it("should allow organizers to update a trip", async () => {
      const { headers } = await signInWithOrganizer();

      const res = await client.api.trips[":tripId"].$patch(
        {
          param: { tripId: testTrip.id },
          json: updateData
        },
        { headers: { Cookie: headers.get("cookie") || "" } }
      );

      expect(res.status).toBe(200);
    });

    it("should deny participants from updating a trip", async () => {
      const { headers } = await signInWithParticipant();

      const res = await client.api.trips[":tripId"].$patch(
        {
          param: { tripId: testTrip.id },
          json: updateData
        },
        { headers: { Cookie: headers.get("cookie") || "" } }
      );

      expect(res.status).toBe(403);
    });

    it("should deny viewers from updating a trip", async () => {
      const { headers } = await signInWithViewer();

      const res = await client.api.trips[":tripId"].$patch(
        {
          param: { tripId: testTrip.id },
          json: updateData
        },
        { headers: { Cookie: headers.get("cookie") || "" } }
      );

      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /trips/:tripId", () => {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    let deleteTestTrip: any;

    beforeEach(async () => {
      // Create a new trip for deletion test
      deleteTestTrip = await createTestTrip(
        testOrganizerUser,
        testParticipantUser,
        testViewerUser
      );
    });
    it("should allow organizers to delete a trip", async () => {
      const { headers } = await signInWithOrganizer();

      const res = await client.api.trips[":tripId"].$delete(
        {
          param: { tripId: deleteTestTrip.id }
        },
        { headers: { Cookie: headers.get("cookie") || "" } }
      );

      expect(res.status).toBe(204);
    });

    it("should deny participants from deleting a trip", async () => {
      const { headers } = await signInWithParticipant();

      const res = await client.api.trips[":tripId"].$delete(
        {
          param: { tripId: deleteTestTrip.id }
        },
        { headers: { Cookie: headers.get("cookie") || "" } }
      );

      expect(res.status).toBe(403);
    });

    it("should deny viewers from deleting a trip", async () => {
      const { headers } = await signInWithViewer();

      const res = await client.api.trips[":tripId"].$delete(
        {
          param: { tripId: deleteTestTrip.id }
        },
        { headers: { Cookie: headers.get("cookie") || "" } }
      );

      expect(res.status).toBe(403);
    });
  });

  describe("GET /trips/:tripId", () => {
    it("should allow organizers to view trip details", async () => {
      const { headers } = await signInWithOrganizer();

      const res = await client.api.trips[":tripId"].$get(
        {
          param: { tripId: testTrip.id }
        },
        { headers: { Cookie: headers.get("cookie") || "" } }
      );

      expect(res.status).toBe(200);
    });

    it("should allow participants to view trip details", async () => {
      const { headers } = await signInWithParticipant();

      const res = await client.api.trips[":tripId"].$get(
        {
          param: { tripId: testTrip.id }
        },
        { headers: { Cookie: headers.get("cookie") || "" } }
      );

      expect(res.status).toBe(200);
    });

    it("should allow viewers to view trip details", async () => {
      const { headers } = await signInWithViewer();

      const res = await client.api.trips[":tripId"].$get(
        {
          param: { tripId: testTrip.id }
        },
        { headers: { Cookie: headers.get("cookie") || "" } }
      );

      expect(res.status).toBe(200);
    });

    it("should deny unauthorized users from viewing trip details", async () => {
      const res = await client.api.trips[":tripId"].$get({
        param: { tripId: testTrip.id }
      });

      expect(res.status).toBe(401);
    });
  });
});
