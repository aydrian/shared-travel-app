import type { Context, MiddlewareHandler } from "hono";
import type { AppBindings } from "@/lib/types";
import { HTTPException } from "hono/http-exception";
import { getAuthz } from "@/lib/authz";
import { PolarResources, type PolarTypes } from "@/lib/polarTypes.d";

type ResourceType = keyof PolarTypes["resources"];
type ResourcePermissions = {
  [K in ResourceType]: PolarTypes["resources"][K]["permissions"];
};

type ResourceIdGetter = (c: Context<AppBindings>) => string | undefined;

const resourceIdGetters: Record<ResourceType, ResourceIdGetter> = {
  Trip: (c) => c.req.param("tripId"),
  Expense: (c) => c.req.param("expenseId"),
  Organization: () => "default",
  User: (c) => c.get("user")?.id
};

export function isValidResourceAction<T extends ResourceType>(
  resource: T,
  action: string
): action is ResourcePermissions[T] {
  const validActions = PolarResources[resource].permissions;
  return (validActions as readonly string[]).includes(action);
}

type AuthorizeParams<T extends ResourceType> = [
  { type: "User"; id: string },
  ResourcePermissions[T],
  { type: T; id: string }
];

type AuthorizeFunction = (
  actor: { type: string; id: string },
  action: string,
  resource: { type: string; id: string }
) => Promise<boolean>;

export function withOsoAuth<T extends ResourceType>(
  resource: T,
  action: ResourcePermissions[T]
): MiddlewareHandler<AppBindings> {
  return async (c, next) => {
    const user = c.get("user");
    const oso = getAuthz(c);
    c.set("oso", oso);

    if (!user) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    const resourceIdGetter = resourceIdGetters[resource];
    if (!resourceIdGetter) {
      throw new HTTPException(400, {
        message: `Unsupported resource type: ${resource}`
      });
    }

    const resourceId = resourceIdGetter(c);
    if (!resourceId) {
      throw new HTTPException(400, { message: `${resource} ID is required` });
    }

    if (!isValidResourceAction(resource, action)) {
      throw new HTTPException(400, {
        message: `Invalid action "${action}" for resource "${resource}"`
      });
    }

    const authorizeParams: AuthorizeParams<T> = [
      { type: "User", id: user.id },
      action,
      { type: resource, id: resourceId }
    ] as const;

    const authorized = await (oso.authorize as AuthorizeFunction)(
      ...authorizeParams
    );

    if (!authorized) {
      throw new HTTPException(403, {
        message:
          "Forbidden: User does not have the required permission for this action"
      });
    }

    await next();
  };
}
