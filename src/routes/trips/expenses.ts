import { createRouter } from "@/lib/create-app";
import { withTripAuth } from "@/middlewares/with-trip-auth";
import { zValidator } from "@hono/zod-validator";
import { expenses } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { tripParamSchema } from "./trips.index";

const createExpenseSchema = z.object({
  description: z.string().min(1),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/) // Validate as string with up to 2 decimal places
});

const updateExpenseSchema = z.object({
  description: z.string().min(1).optional(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional()
});

const expenseParamSchema = z.object({
  tripId: z.string().uuid(),
  expenseId: z.string().uuid()
});

const router = createRouter()
  .get(
    "/",
    zValidator("param", tripParamSchema),
    withTripAuth(["Organizer", "Participant", "Viewer"]),
    async (c) => {
      const db = c.get("db");
      const { tripId } = c.req.valid("param");

      try {
        const tripExpenses = await db
          .select({
            expense_id: expenses.id,
            description: expenses.description,
            amount: expenses.amount,
            created_by: expenses.createdBy,
            created_at: expenses.createdAt
          })
          .from(expenses)
          .where(eq(expenses.tripId, tripId));

        return c.json({ expenses: tripExpenses }, 200);
      } catch (error) {
        console.error("Error fetching expenses:", error);
        throw new HTTPException(500, { message: "Internal Server Error" });
      }
    }
  )
  .post(
    "/",
    zValidator("param", tripParamSchema),
    withTripAuth(["Organizer", "Participant"]),
    zValidator("json", createExpenseSchema),
    async (c) => {
      const db = c.get("db");
      const user = c.get("user");
      const { tripId } = c.req.valid("param");
      const { description, amount } = c.req.valid("json");

      try {
        const [newExpense] = await db
          .insert(expenses)
          .values({
            tripId,
            description,
            amount,
            // biome-ignore lint/style/noNonNullAssertion: Determined not null in withTripAuth middleware
            createdBy: user!.id
          })
          .returning();

        return c.json(
          {
            expense_id: newExpense.id,
            description: newExpense.description,
            amount: newExpense.amount,
            created_by: newExpense.createdBy,
            created_at: newExpense.createdAt
          },
          201
        );
      } catch (error) {
        console.error("Error adding new expense:", error);
        throw new HTTPException(500, { message: "Internal Server Error" });
      }
    }
  )
  .patch(
    "/:expenseId",
    zValidator("param", expenseParamSchema),
    withTripAuth(["Organizer", "Participant"]),
    zValidator("json", updateExpenseSchema),
    async (c) => {
      const db = c.get("db");
      const { tripId, expenseId } = c.req.valid("param");
      const updateData = c.req.valid("json");

      try {
        // Check if the expense exists and belongs to the trip
        const existingExpense = await db
          .select()
          .from(expenses)
          .where(and(eq(expenses.id, expenseId), eq(expenses.tripId, tripId)))
          .limit(1);

        if (existingExpense.length === 0) {
          throw new HTTPException(404, { message: "Expense not found" });
        }

        // Update the expense
        const [updatedExpense] = await db
          .update(expenses)
          .set(updateData)
          .where(eq(expenses.id, expenseId))
          .returning({
            expense_id: expenses.id,
            description: expenses.description,
            amount: expenses.amount
          });

        return c.json(updatedExpense, 200);
      } catch (error) {
        console.error("Error updating expense:", error);
        if (error instanceof HTTPException) {
          throw error;
        }
        throw new HTTPException(500, { message: "Internal Server Error" });
      }
    }
  )
  .delete(
    "/:expenseId",
    zValidator("param", expenseParamSchema),
    withTripAuth(["Organizer", "Participant"]),
    async (c) => {
      const db = c.get("db");
      const { tripId, expenseId } = c.req.valid("param");

      try {
        // Check if the expense exists and belongs to the trip
        const existingExpense = await db
          .select()
          .from(expenses)
          .where(and(eq(expenses.id, expenseId), eq(expenses.tripId, tripId)))
          .limit(1);

        if (existingExpense.length === 0) {
          throw new HTTPException(404, { message: "Expense not found" });
        }

        // Delete the expense
        await db
          .delete(expenses)
          .where(eq(expenses.id, expenseId));

        return c.body(null, 204);
      } catch (error) {
        console.error("Error deleting expense:", error);
        if (error instanceof HTTPException) {
          throw error;
        }
        throw new HTTPException(500, { message: "Internal Server Error" });
      }
    }
  );

export default router;