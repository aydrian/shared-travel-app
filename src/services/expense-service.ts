import { expenses } from "@/db/trips-schema.sql";
import { eq, and } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import type { DrizzleClient } from "@/lib/types";

export interface Expense {
  expense_id: string;
  description: string;
  amount: string;
  created_by: string;
  created_at: Date;
}

export interface CreateExpenseData {
  description: string;
  amount: string;
}

export interface UpdateExpenseData {
  description?: string;
  amount?: string;
}

export interface ExpenseService {
  getExpenses(tripId: string): Promise<Expense[]>;
  createExpense(
    tripId: string,
    userId: string,
    expenseData: CreateExpenseData
  ): Promise<Expense>;
  updateExpense(
    tripId: string,
    expenseId: string,
    updateData: UpdateExpenseData
  ): Promise<Expense>;
  deleteExpense(tripId: string, expenseId: string): Promise<void>;
}

export class DefaultExpenseService implements ExpenseService {
  constructor(private db: DrizzleClient) {}

  async getExpenses(tripId: string): Promise<Expense[]> {
    try {
      const tripExpenses = await this.db
        .select({
          expense_id: expenses.id,
          description: expenses.description,
          amount: expenses.amount,
          created_by: expenses.createdBy,
          created_at: expenses.createdAt
        })
        .from(expenses)
        .where(eq(expenses.tripId, tripId));

      return tripExpenses;
    } catch (error) {
      console.error("Error fetching expenses:", error);
      throw new HTTPException(500, { message: "Internal Server Error" });
    }
  }

  async createExpense(
    tripId: string,
    userId: string,
    expenseData: CreateExpenseData
  ): Promise<Expense> {
    try {
      const [newExpense] = await this.db
        .insert(expenses)
        .values({
          tripId,
          description: expenseData.description,
          amount: expenseData.amount,
          createdBy: userId
        })
        .returning();

      return {
        expense_id: newExpense.id,
        description: newExpense.description,
        amount: newExpense.amount,
        created_by: newExpense.createdBy,
        created_at: newExpense.createdAt
      };
    } catch (error) {
      console.error("Error adding new expense:", error);
      throw new HTTPException(500, { message: "Internal Server Error" });
    }
  }

  async updateExpense(
    tripId: string,
    expenseId: string,
    updateData: UpdateExpenseData
  ): Promise<Expense> {
    try {
      // Check if the expense exists and belongs to the trip
      const existingExpense = await this.db
        .select()
        .from(expenses)
        .where(and(eq(expenses.id, expenseId), eq(expenses.tripId, tripId)))
        .limit(1);

      if (existingExpense.length === 0) {
        throw new HTTPException(404, { message: "Expense not found" });
      }

      // Update the expense
      const [updatedExpense] = await this.db
        .update(expenses)
        .set(updateData)
        .where(eq(expenses.id, expenseId))
        .returning({
          expense_id: expenses.id,
          description: expenses.description,
          amount: expenses.amount,
          created_by: expenses.createdBy,
          created_at: expenses.createdAt
        });

      return updatedExpense;
    } catch (error) {
      console.error("Error updating expense:", error);
      if (error instanceof HTTPException) {
        throw error;
      }
      throw new HTTPException(500, { message: "Internal Server Error" });
    }
  }

  async deleteExpense(tripId: string, expenseId: string): Promise<void> {
    try {
      // Check if the expense exists and belongs to the trip
      const existingExpense = await this.db
        .select()
        .from(expenses)
        .where(and(eq(expenses.id, expenseId), eq(expenses.tripId, tripId)))
        .limit(1);

      if (existingExpense.length === 0) {
        throw new HTTPException(404, { message: "Expense not found" });
      }

      // Delete the expense
      await this.db.delete(expenses).where(eq(expenses.id, expenseId));
    } catch (error) {
      console.error("Error deleting expense:", error);
      if (error instanceof HTTPException) {
        throw error;
      }
      throw new HTTPException(500, { message: "Internal Server Error" });
    }
  }
}
