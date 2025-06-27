import { describe, expect, it, vi, beforeEach, beforeAll } from "vitest";
import { env } from "cloudflare:test";
import { testClient } from "hono/testing";
import app from "@/app";
import * as authModule from "@/lib/auth";
import {
  createTestExpense,
  mockContext,
  setupTestData,
  signInWithTestUser
} from "../testSetup";

// Mock the getAuth function to return the authInstance
vi.spyOn(authModule, "getAuth").mockReturnValue(
  authModule.getAuth(mockContext)
);

describe("Expense Routes Authorization", () => {
  const client = testClient(app, env);
  let testTrip: Awaited<ReturnType<typeof setupTestData>>["testTrip"];
  let testUsers: Awaited<ReturnType<typeof setupTestData>>["testUsers"];
  let testExpenseId: string;

  beforeAll(async () => {
    const setupData = await setupTestData();
    testTrip = setupData.testTrip;
    testUsers = setupData.testUsers;

    // Create a test expense using the expense service
    const newExpense = await createTestExpense(
      testTrip.id,
      testUsers.organizer.id
    );
    testExpenseId = newExpense.expense_id;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /trips/:tripId/expenses", () => {
    it("should allow organizers to list expenses", async () => {
      const { headers } = await signInWithTestUser(testUsers.organizer);

      const res = await client.api.trips[":tripId"].expenses.$get(
        {
          param: { tripId: testTrip.id }
        },
        { headers: { Cookie: headers.get("cookie") || "" } }
      );

      expect(res.status).toBe(200);
    });

    it("should allow participants to list expenses", async () => {
      const { headers } = await signInWithTestUser(testUsers.participant);

      const res = await client.api.trips[":tripId"].expenses.$get(
        {
          param: { tripId: testTrip.id }
        },
        { headers: { Cookie: headers.get("cookie") || "" } }
      );

      expect(res.status).toBe(200);
    });

    it("should allow viewers to list expenses", async () => {
      const { headers } = await signInWithTestUser(testUsers.viewer);

      const res = await client.api.trips[":tripId"].expenses.$get(
        {
          param: { tripId: testTrip.id }
        },
        { headers: { Cookie: headers.get("cookie") || "" } }
      );

      expect(res.status).toBe(200);
    });
  });

  describe("POST /trips/:tripId/expenses", () => {
    const newExpenseData = {
      description: "New Expense",
      amount: "50.00"
    };

    it("should allow organizers to add an expense", async () => {
      const { headers } = await signInWithTestUser(testUsers.organizer);

      const res = await client.api.trips[":tripId"].expenses.$post(
        {
          param: { tripId: testTrip.id },
          json: newExpenseData
        },
        { headers: { Cookie: headers.get("cookie") || "" } }
      );

      expect(res.status).toBe(201);
    });

    it("should allow participants to add an expense", async () => {
      const { headers } = await signInWithTestUser(testUsers.participant);

      const res = await client.api.trips[":tripId"].expenses.$post(
        {
          param: { tripId: testTrip.id },
          json: newExpenseData
        },
        { headers: { Cookie: headers.get("cookie") || "" } }
      );

      expect(res.status).toBe(201);
    });

    it("should deny viewers from adding an expense", async () => {
      const { headers } = await signInWithTestUser(testUsers.viewer);

      const res = await client.api.trips[":tripId"].expenses.$post(
        {
          param: { tripId: testTrip.id },
          json: newExpenseData
        },
        { headers: { Cookie: headers.get("cookie") || "" } }
      );

      expect(res.status).toBe(403);
    });
  });

  describe("PATCH /trips/:tripId/expenses/:expenseId", () => {
    const updateExpenseData = {
      description: "Updated Expense",
      amount: "75.00"
    };

    it("should allow organizers to update an expense", async () => {
      const { headers } = await signInWithTestUser(testUsers.organizer);

      const res = await client.api.trips[":tripId"].expenses[
        ":expenseId"
      ].$patch(
        {
          param: { tripId: testTrip.id, expenseId: testExpenseId },
          json: updateExpenseData
        },
        { headers: { Cookie: headers.get("cookie") || "" } }
      );

      expect(res.status).toBe(200);
    });

    it("should deny participants from updating expenses they don't own", async () => {
      // testExpenseId was created by organizer, so participant can't edit it
      const { headers } = await signInWithTestUser(testUsers.participant);

      const res = await client.api.trips[":tripId"].expenses[
        ":expenseId"
      ].$patch(
        {
          param: { tripId: testTrip.id, expenseId: testExpenseId },
          json: updateExpenseData
        },
        { headers: { Cookie: headers.get("cookie") || "" } }
      );

      expect(res.status).toBe(403);
    });

    it("should deny viewers from updating an expense", async () => {
      const { headers } = await signInWithTestUser(testUsers.viewer);

      const res = await client.api.trips[":tripId"].expenses[
        ":expenseId"
      ].$patch(
        {
          param: { tripId: testTrip.id, expenseId: testExpenseId },
          json: updateExpenseData
        },
        { headers: { Cookie: headers.get("cookie") || "" } }
      );

      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /trips/:tripId/expenses/:expenseId", () => {
    let deleteExpense: Awaited<ReturnType<typeof createTestExpense>>;
    beforeEach(async () => {
      deleteExpense = await createTestExpense(
        testTrip.id,
        testUsers.organizer.id
      );
    });
    it("should allow organizers to delete an expense", async () => {
      const { headers } = await signInWithTestUser(testUsers.organizer);

      const res = await client.api.trips[":tripId"].expenses[
        ":expenseId"
      ].$delete(
        {
          param: { tripId: testTrip.id, expenseId: deleteExpense.expense_id }
        },
        { headers: { Cookie: headers.get("cookie") || "" } }
      );

      expect(res.status).toBe(204);
    });

    it("should deny participants from deleting expenses they don't own", async () => {
      // deleteExpense was created by organizer, so participant can't delete it
      const { headers } = await signInWithTestUser(testUsers.participant);

      const res = await client.api.trips[":tripId"].expenses[
        ":expenseId"
      ].$delete(
        {
          param: { tripId: testTrip.id, expenseId: deleteExpense.expense_id }
        },
        { headers: { Cookie: headers.get("cookie") || "" } }
      );

      expect(res.status).toBe(403);
    });

    it("should deny viewers from deleting an expense", async () => {
      const { headers } = await signInWithTestUser(testUsers.viewer);

      const res = await client.api.trips[":tripId"].expenses[
        ":expenseId"
      ].$delete(
        {
          param: { tripId: testTrip.id, expenseId: deleteExpense.expense_id }
        },
        { headers: { Cookie: headers.get("cookie") || "" } }
      );

      expect(res.status).toBe(403);
    });
  });

  describe("Expense Sharing Authorization (ReBAC)", () => {
    let sharedExpenseId: string;
    let privateExpenseId: string;

    beforeEach(async () => {
      // Create an expense owned by participant (bob)
      const sharedExpense = await createTestExpense(
        testTrip.id,
        testUsers.participant.id
      );
      sharedExpenseId = sharedExpense.expense_id;

      // Create an expense owned by organizer (alice) 
      const privateExpense = await createTestExpense(
        testTrip.id,
        testUsers.organizer.id
      );
      privateExpenseId = privateExpense.expense_id;
    });

    describe("GET /trips/:tripId/expenses/:expenseId (individual expense access)", () => {
      it("should allow expense owner to view their own expense", async () => {
        const { headers } = await signInWithTestUser(testUsers.participant);

        const res = await client.api.trips[":tripId"].expenses[
          ":expenseId"
        ].$get(
          {
            param: { tripId: testTrip.id, expenseId: sharedExpenseId }
          },
          { headers: { Cookie: headers.get("cookie") || "" } }
        );

        expect(res.status).toBe(200);
      });

      it("should allow organizers to view any expense", async () => {
        const { headers } = await signInWithTestUser(testUsers.organizer);

        const res = await client.api.trips[":tripId"].expenses[
          ":expenseId"
        ].$get(
          {
            param: { tripId: testTrip.id, expenseId: sharedExpenseId }
          },
          { headers: { Cookie: headers.get("cookie") || "" } }
        );

        expect(res.status).toBe(200);
      });

      it("should deny non-owners from viewing private expenses", async () => {
        const { headers } = await signInWithTestUser(testUsers.viewer);

        const res = await client.api.trips[":tripId"].expenses[
          ":expenseId"
        ].$get(
          {
            param: { tripId: testTrip.id, expenseId: privateExpenseId }
          },
          { headers: { Cookie: headers.get("cookie") || "" } }
        );

        expect(res.status).toBe(403);
      });
    });

    describe("POST /trips/:tripId/expenses/:expenseId/share", () => {
      it("should allow expense owner to share their expense", async () => {
        const { headers } = await signInWithTestUser(testUsers.participant);

        const res = await client.api.trips[":tripId"].expenses[
          ":expenseId"
        ].share.$post(
          {
            param: { tripId: testTrip.id, expenseId: sharedExpenseId },
            json: { userIds: [testUsers.viewer.id] }
          },
          { headers: { Cookie: headers.get("cookie") || "" } }
        );

        expect(res.status).toBe(200);
      });

      it("should allow organizers to share any expense", async () => {
        const { headers } = await signInWithTestUser(testUsers.organizer);

        const res = await client.api.trips[":tripId"].expenses[
          ":expenseId"
        ].share.$post(
          {
            param: { tripId: testTrip.id, expenseId: sharedExpenseId },
            json: { userIds: [testUsers.viewer.id] }
          },
          { headers: { Cookie: headers.get("cookie") || "" } }
        );

        expect(res.status).toBe(200);
      });

      it("should deny non-owners from sharing expenses", async () => {
        const { headers } = await signInWithTestUser(testUsers.viewer);

        const res = await client.api.trips[":tripId"].expenses[
          ":expenseId"
        ].share.$post(
          {
            param: { tripId: testTrip.id, expenseId: sharedExpenseId },
            json: { userIds: [testUsers.organizer.id] }
          },
          { headers: { Cookie: headers.get("cookie") || "" } }
        );

        expect(res.status).toBe(403);
      });
    });

    describe("Shared Access Test Flow", () => {
      it("should allow shared users to view expense but not edit", async () => {
        // Step 1: Owner shares expense with viewer
        const { headers: ownerHeaders } = await signInWithTestUser(testUsers.participant);
        
        const shareRes = await client.api.trips[":tripId"].expenses[
          ":expenseId"
        ].share.$post(
          {
            param: { tripId: testTrip.id, expenseId: sharedExpenseId },
            json: { userIds: [testUsers.viewer.id] }
          },
          { headers: { Cookie: ownerHeaders.get("cookie") || "" } }
        );
        expect(shareRes.status).toBe(200);

        // Step 2: Shared user can view the expense
        const { headers: viewerHeaders } = await signInWithTestUser(testUsers.viewer);
        
        const viewRes = await client.api.trips[":tripId"].expenses[
          ":expenseId"
        ].$get(
          {
            param: { tripId: testTrip.id, expenseId: sharedExpenseId }
          },
          { headers: { Cookie: viewerHeaders.get("cookie") || "" } }
        );
        expect(viewRes.status).toBe(200);

        // Step 3: Shared user cannot edit the expense
        const editRes = await client.api.trips[":tripId"].expenses[
          ":expenseId"
        ].$patch(
          {
            param: { tripId: testTrip.id, expenseId: sharedExpenseId },
            json: { description: "Hacked expense" }
          },
          { headers: { Cookie: viewerHeaders.get("cookie") || "" } }
        );
        expect(editRes.status).toBe(403);
      });

      it("should remove access when unshared", async () => {
        // Step 1: Share expense
        const { headers: ownerHeaders } = await signInWithTestUser(testUsers.participant);
        
        await client.api.trips[":tripId"].expenses[":expenseId"].share.$post(
          {
            param: { tripId: testTrip.id, expenseId: sharedExpenseId },
            json: { userIds: [testUsers.viewer.id] }
          },
          { headers: { Cookie: ownerHeaders.get("cookie") || "" } }
        );

        // Step 2: Verify shared user can access
        const { headers: viewerHeaders } = await signInWithTestUser(testUsers.viewer);
        
        const viewRes1 = await client.api.trips[":tripId"].expenses[
          ":expenseId"
        ].$get(
          {
            param: { tripId: testTrip.id, expenseId: sharedExpenseId }
          },
          { headers: { Cookie: viewerHeaders.get("cookie") || "" } }
        );
        expect(viewRes1.status).toBe(200);

        // Step 3: Unshare expense
        const unshareRes = await client.api.trips[":tripId"].expenses[
          ":expenseId"
        ].share.$delete(
          {
            param: { tripId: testTrip.id, expenseId: sharedExpenseId },
            json: { userIds: [testUsers.viewer.id] }
          },
          { headers: { Cookie: ownerHeaders.get("cookie") || "" } }
        );
        expect(unshareRes.status).toBe(200);

        // Step 4: Verify shared user can no longer access
        const viewRes2 = await client.api.trips[":tripId"].expenses[
          ":expenseId"
        ].$get(
          {
            param: { tripId: testTrip.id, expenseId: sharedExpenseId }
          },
          { headers: { Cookie: viewerHeaders.get("cookie") || "" } }
        );
        expect(viewRes2.status).toBe(403);
      });
    });

    describe("GET /trips/:tripId/expenses/:expenseId/shares", () => {
      it("should return shared users for expense owners", async () => {
        // Share expense first
        const { headers: ownerHeaders } = await signInWithTestUser(testUsers.participant);
        
        await client.api.trips[":tripId"].expenses[":expenseId"].share.$post(
          {
            param: { tripId: testTrip.id, expenseId: sharedExpenseId },
            json: { userIds: [testUsers.viewer.id] }
          },
          { headers: { Cookie: ownerHeaders.get("cookie") || "" } }
        );

        // Get shares
        const res = await client.api.trips[":tripId"].expenses[
          ":expenseId"
        ].shares.$get(
          {
            param: { tripId: testTrip.id, expenseId: sharedExpenseId }
          },
          { headers: { Cookie: ownerHeaders.get("cookie") || "" } }
        );

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.sharedWith).toContain(testUsers.viewer.id);
      });

      it("should allow shared users to see who else has access", async () => {
        // Share expense first
        const { headers: ownerHeaders } = await signInWithTestUser(testUsers.participant);
        
        await client.api.trips[":tripId"].expenses[":expenseId"].share.$post(
          {
            param: { tripId: testTrip.id, expenseId: sharedExpenseId },
            json: { userIds: [testUsers.viewer.id] }
          },
          { headers: { Cookie: ownerHeaders.get("cookie") || "" } }
        );

        // Shared user gets shares
        const { headers: viewerHeaders } = await signInWithTestUser(testUsers.viewer);
        
        const res = await client.api.trips[":tripId"].expenses[
          ":expenseId"
        ].shares.$get(
          {
            param: { tripId: testTrip.id, expenseId: sharedExpenseId }
          },
          { headers: { Cookie: viewerHeaders.get("cookie") || "" } }
        );

        expect(res.status).toBe(200);
      });
    });
  });
});
