# ✈️ Shared Travel App

RBAC and ReBAC authorization demo using Oso Cloud

## 🚀 Setup

Follow these steps to set up the project:

1. Clone the repository:

   ```shell
   git clone https://github.com/aydrian/ai-driven-authz-demo.git
   cd ai-driven-authz-demo
   ```

2. Install dependencies:

   ```shell
   bun install
   ```

3. Set up environment variables:

   ```shell
   cp .dev.vars.example .dev.vars
   ```

   Edit the `.dev.vars` file and fill in the required values:

   - `BETTER_AUTH_SECRET`: A secret key for Better Auth
   - `BETTER_AUTH_URL`: The URL for Better Auth (default is http://localhost:3000)

4. Set up the database schema:

   ```shell
   bun run db:push
   ```

5. Seed the database:

   ```shell
   bun run db:seed
   ```

6. Start the development server:

   ```shell
   bun run dev
   ```

## 🗄️ Database Management

TThis project uses [Cloudflare D1](https://developers.cloudflare.com/d1/) as the database, which is a serverless SQL database. We use [Drizzle ORM](https://orm.drizzle.team/) for database operations and schema management. Here are some useful commands for managing your database:

- Generate migration files:

  ```shell
  bun run db:generate
  ```

- Apply migrations:

  ```shell
  bun run db:migrate
  ```

- Open Drizzle Studio for visual database management:

  ```shell
  bun run db:studio
  ```

Drizzle ORM provides type-safe database queries and schema definitions. For more information on how to use Drizzle ORM in your project, refer to the [Drizzle ORM documentation](https://orm.drizzle.team/docs/overview).

For more information about Cloudflare D1, refer to the [Cloudflare D1 documentation](https://developers.cloudflare.com/d1/).

## 🔐 Authentication

This application uses [Better Auth](https://www.better-auth.com/) for authentication. It is configured to use email and password authentication.

### 🛣️ Authentication Routes

| Route                             | Method | Description                               |
| --------------------------------- | ------ | ----------------------------------------- |
| `/api/auth/signup`                | POST   | Create a new user account                 |
| `/api/auth/signin`                | POST   | Sign in with email and password           |
| `/api/auth/signout`               | POST   | Sign out and end the current session      |
| `/api/auth/session`               | GET    | Get information about the current session |
| `/api/auth/reset-password`        | POST   | Request a password reset                  |
| `/api/auth/reset-password/:token` | POST   | Reset password using a token              |

For more details on using Better Auth, refer to the [Better Auth documentation](https://www.better-auth.com/docs/introduction).

## 🚦 Routes and Permissions

| Route                                     | Method | Description                  | Required Permissions           |
| ----------------------------------------- | ------ | ---------------------------- | ------------------------------ |
| `/api/trips`                              | GET    | List all trips for the user  | Authenticated                  |
| `/api/trips`                              | POST   | Create a new trip            | Authenticated                  |
| `/api/trips/:tripId`                      | PATCH  | Update a trip                | Organizer                      |
| `/api/trips/:tripId`                      | DELETE | Delete a trip                | Organizer                      |
| `/api/trips/:tripId`                      | GET    | Get trip details             | Organizer, Participant, Viewer |
| `/api/trips/:tripId/participants`         | POST   | Add or update a participant  | Organizer                      |
| `/api/trips/:tripId/participants`         | GET    | List all participants        | Organizer, Participant, Viewer |
| `/api/trips/:tripId/participants/:userId` | PATCH  | Update a participant's role  | Organizer                      |
| `/api/trips/:tripId/participants/:userId` | DELETE | Remove a participant         | Organizer                      |
| `/api/trips/:tripId/expenses`             | GET    | List all expenses for a trip | Organizer, Participant, Viewer |
| `/api/trips/:tripId/expenses`             | POST   | Add a new expense            | Organizer, Participant         |
| `/api/trips/:tripId/expenses/:expenseId`  | PATCH  | Update an expense            | Organizer, Participant         |
| `/api/trips/:tripId/expenses/:expenseId`  | DELETE | Delete an expense            | Organizer, Participant         |

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

This app was created using the [Better Hono template](https://github.com/alwaysnomads/better-hono).
