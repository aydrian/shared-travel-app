import { createRouter } from "@/lib/create-app";
import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import {
  DefaultExpenseService,
  type ExpenseService
} from "@/services/expense-service";
import { withOsoAuth } from "@/middlewares/with-oso-auth";

const createExpenseSchema = z.object({
  description: z.string().min(1),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/) // Validate as string with up to 2 decimal places
});

const updateExpenseSchema = z.object({
  description: z.string().min(1).optional(),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .optional()
});

const tripParamSchema = z.object({
  tripId: z.string()
});

const expenseParamSchema = z.object({
  tripId: z.string(),
  expenseId: z.string()
});

const shareExpenseSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1)
});

const router = createRouter()
  .get(
    "/",
    zValidator("param", tripParamSchema),
    withOsoAuth("Trip", "expense.list"),
    async (c) => {
      const db = c.get("db");
      const oso = c.get("oso");
      const { tripId } = c.req.valid("param");

      try {
        const expenseService: ExpenseService = new DefaultExpenseService(
          db,
          oso
        );
        const tripExpenses = await expenseService.getExpenses(tripId);

        return c.json({ expenses: tripExpenses }, 200);
      } catch (error) {
        console.error("Error fetching expenses:", error);
        throw new HTTPException(500, { message: "Internal Server Error" });
      }
    }
  )
  .get(
    "/:expenseId",
    zValidator("param", expenseParamSchema),
    withOsoAuth("Expense", "view"),
    async (c) => {
      const db = c.get("db");
      const oso = c.get("oso");
      const { tripId, expenseId } = c.req.valid("param");

      try {
        const expenseService: ExpenseService = new DefaultExpenseService(
          db,
          oso
        );
        const tripExpenses = await expenseService.getExpenses(tripId);
        const expense = tripExpenses.find(e => e.expense_id === expenseId);

        if (!expense) {
          throw new HTTPException(404, { message: "Expense not found" });
        }

        return c.json(expense, 200);
      } catch (error) {
        console.error("Error fetching expense:", error);
        if (error instanceof HTTPException) {
          throw error;
        }
        throw new HTTPException(500, { message: "Internal Server Error" });
      }
    }
  )
  .post(
    "/",
    zValidator("param", tripParamSchema),
    withOsoAuth("Trip", "expense.create"),
    zValidator("json", createExpenseSchema),
    async (c) => {
      const db = c.get("db");
      const oso = c.get("oso");
      const user = c.get("user");
      const { tripId } = c.req.valid("param");
      const expenseData = c.req.valid("json");

      try {
        const expenseService: ExpenseService = new DefaultExpenseService(
          db,
          oso
        );

        const newExpense = await expenseService.createExpense(
          tripId,
          // biome-ignore lint/style/noNonNullAssertion: Determined not null in withAuth middleware
          user!.id,
          expenseData
        );

        return c.json(newExpense, 201);
      } catch (error) {
        console.error("Error adding new expense:", error);
        throw new HTTPException(500, { message: "Internal Server Error" });
      }
    }
  )
  .patch(
    "/:expenseId",
    zValidator("param", expenseParamSchema),
    withOsoAuth("Expense", "manage"),
    zValidator("json", updateExpenseSchema),
    async (c) => {
      const db = c.get("db");
      const oso = c.get("oso");
      const { tripId, expenseId } = c.req.valid("param");
      const updateData = c.req.valid("json");

      try {
        const expenseService: ExpenseService = new DefaultExpenseService(
          db,
          oso
        );
        const updatedExpense = await expenseService.updateExpense(
          tripId,
          expenseId,
          updateData
        );

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
    withOsoAuth("Expense", "manage"),
    async (c) => {
      const db = c.get("db");
      const oso = c.get("oso");
      const { tripId, expenseId } = c.req.valid("param");

      try {
        const expenseService: ExpenseService = new DefaultExpenseService(
          db,
          oso
        );
        await expenseService.deleteExpense(tripId, expenseId);

        return c.body(null, 204);
      } catch (error) {
        console.error("Error deleting expense:", error);
        if (error instanceof HTTPException) {
          throw error;
        }
        throw new HTTPException(500, { message: "Internal Server Error" });
      }
    }
  )
  .post(
    "/:expenseId/share",
    zValidator("param", expenseParamSchema),
    withOsoAuth("Expense", "share"),
    zValidator("json", shareExpenseSchema),
    async (c) => {
      const db = c.get("db");
      const oso = c.get("oso");
      const { expenseId } = c.req.valid("param");
      const { userIds } = c.req.valid("json");

      try {
        const expenseService: ExpenseService = new DefaultExpenseService(
          db,
          oso
        );
        await expenseService.shareExpense(expenseId, userIds);

        return c.json({ message: "Expense shared successfully" }, 200);
      } catch (error) {
        console.error("Error sharing expense:", error);
        if (error instanceof HTTPException) {
          throw error;
        }
        throw new HTTPException(500, { message: "Internal Server Error" });
      }
    }
  )
  .delete(
    "/:expenseId/share",
    zValidator("param", expenseParamSchema),
    withOsoAuth("Expense", "share"),
    zValidator("json", shareExpenseSchema),
    async (c) => {
      const db = c.get("db");
      const oso = c.get("oso");
      const { expenseId } = c.req.valid("param");
      const { userIds } = c.req.valid("json");

      try {
        const expenseService: ExpenseService = new DefaultExpenseService(
          db,
          oso
        );
        await expenseService.unshareExpense(expenseId, userIds);

        return c.json({ message: "Expense unshared successfully" }, 200);
      } catch (error) {
        console.error("Error unsharing expense:", error);
        if (error instanceof HTTPException) {
          throw error;
        }
        throw new HTTPException(500, { message: "Internal Server Error" });
      }
    }
  )
  .get(
    "/:expenseId/shares",
    zValidator("param", expenseParamSchema),
    withOsoAuth("Expense", "view"),
    async (c) => {
      const db = c.get("db");
      const oso = c.get("oso");
      const { expenseId } = c.req.valid("param");

      try {
        const expenseService: ExpenseService = new DefaultExpenseService(
          db,
          oso
        );
        const sharedWith = await expenseService.getExpenseShares(expenseId);

        return c.json({ sharedWith }, 200);
      } catch (error) {
        console.error("Error getting expense shares:", error);
        if (error instanceof HTTPException) {
          throw error;
        }
        throw new HTTPException(500, { message: "Internal Server Error" });
      }
    }
  );

export default router;
