import { Oso } from "oso-cloud";
import type { Context } from "hono";
import type { AppBindings } from "@/lib/types";
import type { PolarTypes } from "./polarTypes";

export const getAuthz = (c: Context<AppBindings>) => {
  const oso = new Oso<PolarTypes>(c.env.OSO_URL, c.env.OSO_AUTH);
  return oso;
};

export const addUserFact = async (
  c: Context<AppBindings>,
  userId: string,
  orgId = "default"
) => {
  const oso = getAuthz(c);
  const user = { type: "User", id: userId } as const;
  const org = { type: "Organization", id: orgId } as const;
  const member = { type: "String", id: "member" } as const;

  await oso.insert(["has_role", user, member, org]);
};
