import { expenses } from "@/db/trips-schema.sql";
import { eq, and } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import type { DrizzleClient } from "@/lib/types";
import type { OsoClientType } from "@/lib/authz";

export interface Expense {
  expense_id: string;
  description: string;
  amount: string;
  created_by: string;
  shared_with: string[];
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
  shareExpense(expenseId: string, userIds: string[]): Promise<void>;
  unshareExpense(expenseId: string, userIds: string[]): Promise<void>;
  getExpenseShares(expenseId: string): Promise<string[]>;
}

export class DefaultExpenseService implements ExpenseService {
  constructor(private db: DrizzleClient, private oso: OsoClientType) {}

  async getExpenses(tripId: string): Promise<Expense[]> {
    try {
      const tripExpenses = await this.db
        .select({
          expense_id: expenses.id,
          description: expenses.description,
          amount: expenses.amount,
          created_by: expenses.createdBy,
          shared_with: expenses.sharedWith,
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

      // Set up Oso relations
      await this.oso.batch(async (tx) => {
        // Set trip relation
        await tx.insert([
          "has_relation",
          { type: "Expense", id: newExpense.id },
          "trip",
          { type: "Trip", id: tripId }
        ]);
        
        // Set owner relation
        await tx.insert([
          "has_role",
          { type: "User", id: userId },
          { type: "String", id: "owner" },
          { type: "Expense", id: newExpense.id }
        ]);
      });

      return {
        expense_id: newExpense.id,
        description: newExpense.description,
        amount: newExpense.amount,
        created_by: newExpense.createdBy,
        shared_with: newExpense.sharedWith,
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
          shared_with: expenses.sharedWith,
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

      // Clean up all Oso facts for this expense
      await this.oso.batch(async (tx) => {
        // Delete trip relation
        await tx.delete([
          "has_relation",
          { type: "Expense", id: expenseId },
          "trip",
          { type: "Trip", id: tripId }
        ]);
        
        // Delete all ownership and sharing relations
        await tx.delete([
          "has_role",
          null,
          null,
          { type: "Expense", id: expenseId }
        ]);
        
        await tx.delete([
          "has_relation",
          { type: "Expense", id: expenseId },
          "shared_with",
          null
        ]);
      });
    } catch (error) {
      console.error("Error deleting expense:", error);
      if (error instanceof HTTPException) {
        throw error;
      }
      throw new HTTPException(500, { message: "Internal Server Error" });
    }
  }

  async shareExpense(expenseId: string, userIds: string[]): Promise<void> {
    try {
      // Get current shared users
      const [expense] = await this.db
        .select({ sharedWith: expenses.sharedWith })
        .from(expenses)
        .where(eq(expenses.id, expenseId))
        .limit(1);

      if (!expense) {
        throw new HTTPException(404, { message: "Expense not found" });
      }

      // Merge new users with existing shared users
      const currentShared = expense.sharedWith || [];
      const updatedShared = [...new Set([...currentShared, ...userIds])];

      // Update database
      await this.db
        .update(expenses)
        .set({ sharedWith: updatedShared })
        .where(eq(expenses.id, expenseId));

      // Add Oso relations for new users only
      const newUsers = userIds.filter(userId => !currentShared.includes(userId));
      if (newUsers.length > 0) {
        await this.oso.batch(async (tx) => {
          for (const userId of newUsers) {
            await tx.insert([
              "has_relation",
              { type: "Expense", id: expenseId },
              "shared_with",
              { type: "User", id: userId }
            ]);
          }
        });
      }
    } catch (error) {
      console.error("Error sharing expense:", error);
      if (error instanceof HTTPException) {
        throw error;
      }
      throw new HTTPException(500, { message: "Internal Server Error" });
    }
  }

  async unshareExpense(expenseId: string, userIds: string[]): Promise<void> {
    try {
      // Get current shared users
      const [expense] = await this.db
        .select({ sharedWith: expenses.sharedWith })
        .from(expenses)
        .where(eq(expenses.id, expenseId))
        .limit(1);

      if (!expense) {
        throw new HTTPException(404, { message: "Expense not found" });
      }

      // Remove users from shared list
      const currentShared = expense.sharedWith || [];
      const updatedShared = currentShared.filter(userId => !userIds.includes(userId));

      // Update database
      await this.db
        .update(expenses)
        .set({ sharedWith: updatedShared })
        .where(eq(expenses.id, expenseId));

      // Remove Oso relations
      await this.oso.batch(async (tx) => {
        for (const userId of userIds) {
          await tx.delete([
            "has_relation",
            { type: "Expense", id: expenseId },
            "shared_with",
            { type: "User", id: userId }
          ]);
        }
      });
    } catch (error) {
      console.error("Error unsharing expense:", error);
      if (error instanceof HTTPException) {
        throw error;
      }
      throw new HTTPException(500, { message: "Internal Server Error" });
    }
  }

  async getExpenseShares(expenseId: string): Promise<string[]> {
    try {
      const [expense] = await this.db
        .select({ sharedWith: expenses.sharedWith })
        .from(expenses)
        .where(eq(expenses.id, expenseId))
        .limit(1);

      if (!expense) {
        throw new HTTPException(404, { message: "Expense not found" });
      }

      return expense.sharedWith || [];
    } catch (error) {
      console.error("Error getting expense shares:", error);
      throw new HTTPException(500, { message: "Internal Server Error" });
    }
  }
}
