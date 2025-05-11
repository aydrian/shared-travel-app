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
   cp .env.example .env
   ```

   Edit the `.env` file and fill in the required values:

   - `DATABASE_URL`: Your PostgreSQL database URL. If you're using the provided Docker setup, use:
     ```
     DATABASE_URL=postgres://postgres:password@localhost:5432/shared_travel_app
     ```
   - `BETTER_AUTH_SECRET`: A secret key for Better Auth
   - `BETTER_AUTH_URL`: The URL for Better Auth (default is http://localhost:3000)

4. Start the database using Docker:

   ```shell
   bun run docker:up
   ```

   This command starts a PostgreSQL database in a Docker container with the following configuration:

   - Username: postgres
   - Password: password
   - Database: shared_travel_app
   - Port: 5432

5. Set up the database schema:

   ```shell
   bun run db:push
   ```

6. Seed the database:

   ```shell
   bun run db:seed
   ```

7. Start the development server:

   ```shell
   bun run dev
   ```

## 🐳 Docker

The project uses Docker to run the PostgreSQL database. The configuration is defined in the `docker-compose.yml` file.

You can customize the database settings by modifying the following environment variables in the `docker-compose.yml` file:

```yaml
environment:
  POSTGRES_USER: postgres
  POSTGRES_PASSWORD: password
  POSTGRES_DB: shared_travel_app
```

You can also change the port mapping if needed:

```yaml
ports:
  - 5432:5432
```

After making changes to the `docker-compose.yml` file, make sure to update your `.env` file with the corresponding `DATABASE_URL`.

To manage the Docker container:

1. Start the database:

   ```shell
   bun run docker:up
   ```

2. To stop the database:

   ```shell
   bun run docker:down
   ```

3. To remove the database container and volumes:

   ```shell
   bun run docker:clean
   ```

Make sure the database is running before performing any database operations or starting the application.

## 🗄️ Database Management

This project uses [Drizzle ORM](https://orm.drizzle.team/) for database operations and schema management. Here are some useful commands for managing your database:

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
