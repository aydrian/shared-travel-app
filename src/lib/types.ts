import type { User, Session } from "better-auth";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type { Role } from "@/lib/global-roles";

import type { DBSchema } from "@/db";
import type { getAuth } from "@/lib/auth";

export interface AppBindings {
  Bindings: {
    DB: D1Database;
    BETTER_AUTH_SECRET: string;
    BETTER_AUTH_URL: string;
  };
  Variables: {
    auth: ReturnType<typeof getAuth>;
    user: User | null;
    session: Session | null;
    db: DrizzleD1Database<DBSchema>;
    roles: Role[];
    userTripRole: Role | undefined;
  };
}
