import { describe, expect, it, vi, beforeEach, beforeAll } from "vitest";
import { env } from "cloudflare:test";
import { testClient } from "hono/testing";
import app from "@/app";
import * as authModule from "@/lib/auth";
import {
  testRoles,
  mockContext,
  setupTestData,
  signInWithTestUser
} from "../testSetup";

// Mock the getAuth function to return the authInstance
vi.spyOn(authModule, "getAuth").mockReturnValue(
  authModule.getAuth(mockContext)
);

describe("Participant Routes Authorization", () => {
  const client = testClient(app, env);
  let testTrip: Awaited<ReturnType<typeof setupTestData>>["testTrip"];
  let testUsers: Awaited<ReturnType<typeof setupTestData>>["testUsers"];

  beforeAll(async () => {
    const setupData = await setupTestData();
    testTrip = setupData.testTrip;
    testUsers = setupData.testUsers;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /trips/:tripId/participants", () => {
    let newParticipantData: { user_id: string; role_id: string };

    beforeAll(() => {
      newParticipantData = {
        user_id: testUsers.participant.id,
        role_id: testRoles.participant
      };
    });

    it("should allow organizers to add a participant", async () => {
      const { headers } = await signInWithTestUser(testUsers.organizer);

      const res = await client.api.trips[":tripId"].participants.$post(
        {
          param: { tripId: testTrip.id },
          json: newParticipantData
        },
        { headers: { Cookie: headers.get("cookie") || "" } }
      );

      expect(res.status).toBe(201);
    });

    it("should deny participants from adding a participant", async () => {
      const { headers } = await signInWithTestUser(testUsers.participant);

      const res = await client.api.trips[":tripId"].participants.$post(
        {
          param: { tripId: testTrip.id },
          json: newParticipantData
        },
        { headers: { Cookie: headers.get("cookie") || "" } }
      );

      expect(res.status).toBe(403);
    });

    it("should deny viewers from adding a participant", async () => {
      const { headers } = await signInWithTestUser(testUsers.viewer);

      const res = await client.api.trips[":tripId"].participants.$post(
        {
          param: { tripId: testTrip.id },
          json: newParticipantData
        },
        { headers: { Cookie: headers.get("cookie") || "" } }
      );

      expect(res.status).toBe(403);
    });
  });

  describe("GET /trips/:tripId/participants", () => {
    it("should allow organizers to list participants", async () => {
      const { headers } = await signInWithTestUser(testUsers.organizer);

      const res = await client.api.trips[":tripId"].participants.$get(
        {
          param: { tripId: testTrip.id }
        },
        { headers: { Cookie: headers.get("cookie") || "" } }
      );

      expect(res.status).toBe(200);
    });

    it("should allow participants to list participants", async () => {
      const { headers } = await signInWithTestUser(testUsers.participant);

      const res = await client.api.trips[":tripId"].participants.$get(
        {
          param: { tripId: testTrip.id }
        },
        { headers: { Cookie: headers.get("cookie") || "" } }
      );

      expect(res.status).toBe(200);
    });

    it("should allow viewers to list participants", async () => {
      const { headers } = await signInWithTestUser(testUsers.viewer);

      const res = await client.api.trips[":tripId"].participants.$get(
        {
          param: { tripId: testTrip.id }
        },
        { headers: { Cookie: headers.get("cookie") || "" } }
      );

      expect(res.status).toBe(200);
    });
  });

  describe("PATCH /trips/:tripId/participants/:userId", () => {
    const updateRoleData = {
      role_id: testRoles.viewer
    };

    it("should allow organizers to update a participant's role", async () => {
      const { headers } = await signInWithTestUser(testUsers.organizer);

      const res = await client.api.trips[":tripId"].participants[
        ":userId"
      ].$patch(
        {
          param: { tripId: testTrip.id, userId: testUsers.participant.id },
          json: updateRoleData
        },
        { headers: { Cookie: headers.get("cookie") || "" } }
      );

      expect(res.status).toBe(200);
    });

    it("should deny participants from updating a participant's role", async () => {
      const { headers } = await signInWithTestUser(testUsers.participant);

      const res = await client.api.trips[":tripId"].participants[
        ":userId"
      ].$patch(
        {
          param: { tripId: testTrip.id, userId: testUsers.participant.id },
          json: updateRoleData
        },
        { headers: { Cookie: headers.get("cookie") || "" } }
      );

      expect(res.status).toBe(403);
    });

    it("should deny viewers from updating a participant's role", async () => {
      const { headers } = await signInWithTestUser(testUsers.viewer);

      const res = await client.api.trips[":tripId"].participants[
        ":userId"
      ].$patch(
        {
          param: { tripId: testTrip.id, userId: testUsers.participant.id },
          json: updateRoleData
        },
        { headers: { Cookie: headers.get("cookie") || "" } }
      );

      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /trips/:tripId/participants/:userId", () => {
    it("should allow organizers to remove a participant", async () => {
      const { headers } = await signInWithTestUser(testUsers.organizer);

      const res = await client.api.trips[":tripId"].participants[
        ":userId"
      ].$delete(
        {
          param: { tripId: testTrip.id, userId: testUsers.viewer.id }
        },
        { headers: { Cookie: headers.get("cookie") || "" } }
      );

      expect(res.status).toBe(204);
    });

    it("should deny participants from removing a participant", async () => {
      const { headers } = await signInWithTestUser(testUsers.participant);

      const res = await client.api.trips[":tripId"].participants[
        ":userId"
      ].$delete(
        {
          param: { tripId: testTrip.id, userId: testUsers.viewer.id }
        },
        { headers: { Cookie: headers.get("cookie") || "" } }
      );

      expect(res.status).toBe(403);
    });

    it("should deny viewers from removing a participant", async () => {
      const { headers } = await signInWithTestUser(testUsers.viewer);

      const res = await client.api.trips[":tripId"].participants[
        ":userId"
      ].$delete(
        {
          param: { tripId: testTrip.id, userId: testUsers.participant.id }
        },
        { headers: { Cookie: headers.get("cookie") || "" } }
      );

      expect(res.status).toBe(403);
    });
  });
});
