# ReBAC Implementation Documentation

This document details the implementation of **Relationship-Based Access Control (ReBAC)** for expense sharing in the Shared Travel App, following Oso Cloud best practices.

## Table of Contents
- [Overview](#overview)
- [Business Requirements](#business-requirements)
- [Architecture](#architecture)
- [Implementation Details](#implementation-details)
- [Oso Best Practices](#oso-best-practices)
- [API Documentation](#api-documentation)
- [Testing Strategy](#testing-strategy)
- [Migration Guide](#migration-guide)
- [Usage Examples](#usage-examples)

## Overview

### What is ReBAC?
Relationship-Based Access Control (ReBAC) is an authorization model where permissions are derived from relationships between resources and users. Unlike traditional RBAC (Role-Based Access Control) which relies on roles assigned to users, ReBAC allows for fine-grained permissions based on direct relationships.

### Why ReBAC for Expense Sharing?
Our travel app evolved from a simple trip-based permission model to support individual expense sharing:

**Before (RBAC only):**
- Trip organizers could manage all expenses
- Trip participants could edit all expenses  
- Trip viewers could only view all expenses

**After (RBAC + ReBAC):**
- Trip organizers can still manage all expenses
- Expense owners can manage their own expenses
- Users can share specific expenses with others
- Shared users get view-only access to specific expenses

## Business Requirements

The ReBAC implementation addresses these user stories:

1. **Expense Privacy**: "As a trip participant, I want to keep some expenses private so that only I can see them"
2. **Selective Sharing**: "As an expense owner, I want to share specific expenses with specific people"
3. **View-Only Sharing**: "As a user, I want to see expenses shared with me but not edit them"
4. **Organizer Override**: "As a trip organizer, I want to maintain full control over all trip expenses"

## Architecture

### System Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Database      │    │   Oso Cloud      │    │   Application   │
│   (SQLite)      │◄──►│   (Policy)       │◄──►│   (API Layer)   │
│                 │    │                  │    │                 │
│ • expense data  │    │ • ownership      │    │ • route auth    │
│ • shared_with   │    │ • sharing facts  │    │ • business      │
│   JSON array    │    │ • permissions    │    │   logic         │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Key Components

1. **Database Layer**: SQLite with JSON array for shared user IDs
2. **Authorization Layer**: Oso Cloud with ReBAC policy
3. **Service Layer**: Dual writes pattern for data synchronization
4. **API Layer**: RESTful endpoints with fine-grained authorization

## Implementation Details

### 1. Database Schema Changes

We added a `sharedWith` JSON array field to the expenses table:

```typescript
// src/db/trips-schema.sql.ts
export const expenses = sqliteTable("expenses", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tripId: text("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  amount: text("amount").notNull(),
  createdBy: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sharedWith: text("shared_with", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default(sql`(json_array())`), // Empty array default
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
});
```

**Design Benefits:**
- ✅ **SQLite Native**: Uses SQLite's built-in JSON functions
- ✅ **Type Safe**: Drizzle provides compile-time type checking  
- ✅ **Efficient**: Single column vs separate junction table
- ✅ **Queryable**: Can use JSON operators for complex queries

### 2. Polar Policy Updates

We evolved the expense resource to support ownership and sharing:

```polar
# main.polar
resource Expense {
  roles = ["owner", "viewer"];
  permissions = ["manage", "view", "share"];
  relations = {
    trip: Trip,
    shared_with: User
  };

  # Owner permissions (expense creator)
  "owner" if "owner";
  "manage" if "owner";
  "view" if "owner";
  "share" if "owner";

  # Shared permissions
  "viewer" if "shared_with";
  "view" if "shared_with";

  # Trip organizers can manage any expense
  "manage" if "organizer" on "trip";
  "view" if "organizer" on "trip";
  "share" if "organizer" on "trip";

  # Inheritance
  "view" if "viewer";
}
```

**Key Features:**
- **Ownership Model**: Expense creators get "owner" role automatically
- **Sharing Relations**: `shared_with` relation connects expenses to users
- **Role Inheritance**: Trip organizers inherit full permissions
- **Permission Granularity**: Separate permissions for view, manage, and share

### 3. Service Layer Implementation

The `ExpenseService` implements Oso's dual writes pattern:

```typescript
// src/services/expense-service.ts
async createExpense(tripId: string, userId: string, expenseData: CreateExpenseData): Promise<Expense> {
  // 1. Write to database (source of truth)
  const [newExpense] = await this.db.insert(expenses).values({
    tripId,
    description: expenseData.description,
    amount: expenseData.amount,
    createdBy: userId
  }).returning();

  // 2. Sync facts to Oso Cloud
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

  return newExpense;
}
```

**Sharing Implementation:**
```typescript
async shareExpense(expenseId: string, userIds: string[]): Promise<void> {
  // 1. Update database JSON array
  const updatedShared = [...new Set([...currentShared, ...userIds])];
  await this.db.update(expenses).set({ sharedWith: updatedShared });

  // 2. Add Oso relations for new users
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
```

### 4. API Endpoints

New sharing endpoints with fine-grained authorization:

```typescript
// src/routes/trips/expenses.ts

// Share expense (owners and organizers only)
.post("/:expenseId/share", 
  withOsoAuth("Expense", "share"),
  async (c) => {
    const { expenseId } = c.req.valid("param");
    const { userIds } = c.req.valid("json");
    await expenseService.shareExpense(expenseId, userIds);
    return c.json({ message: "Expense shared successfully" });
  })

// View individual expense (owners, shared users, organizers)
.get("/:expenseId",
  withOsoAuth("Expense", "view"), 
  async (c) => {
    // Only accessible if user has view permission
  })

// Manage expense (owners and organizers only)
.patch("/:expenseId",
  withOsoAuth("Expense", "manage"),
  async (c) => {
    // Only accessible if user has manage permission
  })
```

## Oso Best Practices

Our implementation follows all major Oso Cloud best practices:

### ✅ 1. Dual Writes Pattern

**What**: Maintain data in both application database and Oso Cloud
**Why**: Database remains source of truth while Oso provides fast authorization decisions
**How**: Service layer synchronizes every database change with Oso facts

```typescript
// Example: When sharing an expense
// 1. Update database JSON array
await this.db.update(expenses).set({ sharedWith: updatedUsers });

// 2. Sync facts to Oso
await this.oso.insert([
  "has_relation",
  { type: "Expense", id: expenseId },
  "shared_with", 
  { type: "User", id: userId }
]);
```

### ✅ 2. Centralized Authorization Data

**What**: Store authorization relationships in Oso Cloud for cross-service access
**Why**: Enables consistent authorization across different services and contexts
**How**: All permission checks go through Oso, not direct database queries

```typescript
// ❌ Don't do this
const userRole = await db.getUserRole(userId, expenseId);
if (userRole === 'owner') { /* allow */ }

// ✅ Do this instead  
const authorized = await oso.authorize(
  { type: "User", id: userId },
  "manage",
  { type: "Expense", id: expenseId }
);
```

### ✅ 3. Policy-Driven Authorization

**What**: Define authorization logic in Polar policy, not application code
**Why**: Centralized, auditable, and easily modifiable authorization rules
**How**: Route middleware uses declarative permissions

```typescript
// Declarative authorization
.patch("/:expenseId", withOsoAuth("Expense", "manage"), handler)

// Instead of imperative checks in handler
```

### ✅ 4. Type Safety

**What**: Generate TypeScript types from Polar policy
**Why**: Compile-time validation prevents authorization bugs
**How**: `oso:typegen` command generates types used by middleware

```bash
bun run oso:typegen  # Generates src/lib/polarTypes.d.ts
```

### ✅ 5. Performance Optimization

**What**: Batch operations and efficient resource identification
**Why**: Minimize API calls to Oso Cloud
**How**: Use batch transactions and smart relation management

```typescript
// Batch multiple facts in single transaction
await this.oso.batch(async (tx) => {
  await tx.insert(tripRelation);
  await tx.insert(ownerRole);
});
```

### ✅ 6. Relationship Modeling

**What**: Use appropriate relations for different types of connections
**Why**: Enables complex authorization scenarios and inheritance
**How**: Distinguish between roles (`has_role`) and relations (`has_relation`)

```polar
# Roles for direct assignments
"owner" if "owner";

# Relations for sharing
"viewer" if "shared_with";

# Inheritance through relations
"manage" if "organizer" on "trip";
```

## API Documentation

### Expense Sharing Endpoints

#### POST /trips/:tripId/expenses/:expenseId/share
Share an expense with specific users.

**Authorization**: Expense owner or trip organizer
**Request Body**:
```json
{
  "userIds": ["user_123", "user_456"]
}
```

**Response**: 
```json
{
  "message": "Expense shared successfully"
}
```

#### DELETE /trips/:tripId/expenses/:expenseId/share
Remove users from expense sharing.

**Authorization**: Expense owner or trip organizer
**Request Body**:
```json
{
  "userIds": ["user_123"]
}
```

#### GET /trips/:tripId/expenses/:expenseId/shares
List users who have access to the expense.

**Authorization**: Anyone with view access to the expense
**Response**:
```json
{
  "sharedWith": ["user_123", "user_456"]
}
```

#### GET /trips/:tripId/expenses/:expenseId
View individual expense details.

**Authorization**: Expense owner, shared users, or trip organizer
**Response**:
```json
{
  "expense_id": "exp_123",
  "description": "Dinner at restaurant", 
  "amount": "45.50",
  "created_by": "user_owner",
  "shared_with": ["user_123"],
  "created_at": "2024-01-15T10:00:00Z"
}
```

### Permission Matrix

| User Type | View Own | Edit Own | View Shared | Edit Shared | Share Any | View Any | Edit Any |
|-----------|----------|----------|-------------|-------------|-----------|----------|----------|
| Expense Owner | ✅ | ✅ | N/A | N/A | ✅ | ❌ | ❌ |
| Shared User | N/A | N/A | ✅ | ❌ | ❌ | ❌ | ❌ |
| Trip Organizer | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Trip Participant | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Trip Viewer | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |

## Testing Strategy

### 1. Polar Policy Tests

Comprehensive test scenarios embedded in `main.polar`:

```polar
test "expense ownership and sharing permissions" {
  setup {
    fixture default;
    fixture expenseSharing;
  }

  # Bob (owner) can do everything
  assert allow(User{"bob"}, action: String, Expense{"shared-expense"}) iff
    action in ["manage", "view", "share"];

  # Charlie (shared with) can only view
  assert allow(User{"charlie"}, "view", Expense{"shared-expense"});
  assert_not allow(User{"charlie"}, "manage", Expense{"shared-expense"});

  # Dave (not shared with) cannot access
  assert_not allow(User{"dave"}, "view", Expense{"shared-expense"});
}
```

### 2. Integration Tests

End-to-end test scenarios covering real workflows:

```typescript
it("should allow shared users to view expense but not edit", async () => {
  // 1. Owner shares expense with viewer
  const shareRes = await shareExpense(owner, viewer);
  expect(shareRes.status).toBe(200);

  // 2. Shared user can view
  const viewRes = await viewExpense(viewer);
  expect(viewRes.status).toBe(200);

  // 3. Shared user cannot edit
  const editRes = await editExpense(viewer);
  expect(editRes.status).toBe(403);
});
```

### 3. Edge Cases

- Access removal when unshared
- Owner permissions vs shared permissions
- Organizer override capabilities
- Non-existent expense handling

## Migration Guide

### From RBAC to ReBAC

Our migration strategy maintained backward compatibility:

#### Phase 1: Schema Addition
```sql
-- Migration: Add sharedWith column with empty array default
ALTER TABLE expenses ADD shared_with text DEFAULT (json_array()) NOT NULL;
```

#### Phase 2: Policy Evolution
```polar
# Before: Trip-based permissions only
resource Expense {
  "editor" if "participant" on "trip";
  "viewer" if "viewer" on "trip";
}

# After: Ownership + sharing + trip fallback
resource Expense {
  "owner" if "owner";           # New: ownership
  "viewer" if "shared_with";    # New: sharing
  "manage" if "organizer" on "trip";  # Preserved: organizer override
}
```

#### Phase 3: Service Updates
- Added ownership facts on expense creation
- Implemented sharing methods with dual writes
- Updated all authorization checks to use Oso

#### Phase 4: Test Updates
- Modified tests to reflect new ownership model
- Added comprehensive ReBAC test scenarios
- Verified backward compatibility

### Breaking Changes

1. **Participants can no longer edit all expenses**
   - Before: Any participant could edit any expense
   - After: Only expense owners (and organizers) can edit

2. **Individual expense access control** 
   - Before: All trip members could view all expenses
   - After: Only owners, shared users, and organizers can view

These changes improve security and privacy while maintaining organizer capabilities.

## Usage Examples

### Basic Sharing Workflow

```typescript
// 1. Create an expense (owner gets automatic permissions)
const expense = await createExpense(tripId, userId, {
  description: "Private dinner",
  amount: "50.00"
});

// 2. Share with specific users
await shareExpense(expense.id, ["friend1", "friend2"]);

// 3. Check who has access
const shares = await getExpenseShares(expense.id);
// Returns: ["friend1", "friend2"]

// 4. Remove access
await unshareExpense(expense.id, ["friend1"]); 

// 5. Verify access removed
const updatedShares = await getExpenseShares(expense.id);
// Returns: ["friend2"]
```

### Permission Scenarios

```typescript
// ✅ Expense owner sharing their expense
await shareExpense(ownerUser, expenseId, [viewerUserId]);

// ✅ Trip organizer sharing any expense  
await shareExpense(organizerUser, expenseId, [viewerUserId]);

// ❌ Regular participant sharing someone else's expense
await shareExpense(participantUser, expenseId, [viewerUserId]); // 403 Forbidden

// ✅ Shared user viewing expense
await viewExpense(sharedUser, expenseId); // 200 OK

// ❌ Shared user editing expense  
await editExpense(sharedUser, expenseId, newData); // 403 Forbidden
```

## Conclusion

This ReBAC implementation successfully extends our RBAC model with fine-grained expense sharing while following all Oso Cloud best practices. The solution provides:

- **Enhanced Privacy**: Expense-level access control
- **Flexible Sharing**: Granular user-by-user sharing
- **Maintained Control**: Organizers retain full oversight
- **Production Ready**: Comprehensive testing and type safety
- **Scalable Foundation**: Clean architecture for future ReBAC features

The implementation demonstrates how to evolve authorization systems incrementally while maintaining backward compatibility and following industry best practices.