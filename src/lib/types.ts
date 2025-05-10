import type { Environment } from "@/env";
import type { User, Session } from "better-auth";
import type { createDb } from "@/db";
import type { Role } from "@/lib/global-roles";

type DrizzleClient = ReturnType<typeof createDb>;

export interface AppBindings {
  Bindings: Environment;
  Variables: {
    user: User | null;
    session: Session | null;
    db: DrizzleClient;
    roles: Role[];
    userTripRole: Role | undefined;
  };
}
