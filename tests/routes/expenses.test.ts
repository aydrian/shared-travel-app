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

    it("should allow participants to update an expense", async () => {
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

      expect(res.status).toBe(200);
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

    it("should allow participants to delete an expense", async () => {
      const { headers } = await signInWithTestUser(testUsers.participant);

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
});
