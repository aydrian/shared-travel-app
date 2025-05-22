import type { MiddlewareHandler } from "hono";
import type { AppBindings } from "@/lib/types";
import { HTTPException } from "hono/http-exception";
import { getAuthz } from "@/lib/authz";
import { PolarResources, type PolarTypes } from "@/lib/polarTypes.d";

type ResourceType = keyof typeof PolarResources;

export function isValidResourceAction<T extends ResourceType>(
  resource: T,
  action: string
): action is ResourcePermissions[T] {
  const validActions = PolarResources[resource].permissions;
  return (validActions as readonly string[]).includes(action);
}

type ResourcePermissions = {
  [K in keyof typeof PolarResources]: (typeof PolarResources)[K]["permissions"][number];
};

export const withOsoAuth = <T extends keyof typeof PolarResources>(
  resource: T,
  action: ResourcePermissions[T]
): MiddlewareHandler<AppBindings> => {
  return async (c, next) => {
    const user = c.get("user");
    let resourceId: string | undefined;
    const oso = getAuthz(c);
    c.set("oso", oso);

    if (!user) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    // Determine the resource ID based on the resource type
    switch (resource) {
      case "Trip":
        resourceId = c.req.param("tripId");
        break;
      case "Expense":
        resourceId = c.req.param("expenseId");
        break;
      case "Organization":
        resourceId = "default";
        break;
      // Add cases for other resources as needed
      default:
        console.log("unsupported resource type");
        throw new HTTPException(400, {
          message: `Unsupported resource type: ${resource}`
        });
    }

    if (!resourceId) {
      throw new HTTPException(400, { message: `${resource} ID is required` });
    }

    if (!isValidResourceAction(resource, action)) {
      console.log("invalid action for resource");
      throw new HTTPException(400, {
        message: `Invalid action "${action}" for resource "${resource}"`
      });
    }

    // const oUser = { type: "User", id: user.id } as const;
    // const oResource = { type: resource, id: resourceId } as const;

    const authorized = await oso.authorize(
      { type: "User", id: user.id },
      action,
      { type: resource, id: resourceId }
    );

    if (!authorized) {
      console.log("Not Authorized");
      console.log(`User: ${user.name} (${user.id})`);
      console.log(`Resource: ${resource} (${resourceId})`);
      console.log(`Action: ${action}`);
      throw new HTTPException(403, {
        message:
          "Forbidden: User does not have the required permission for this action"
      });
    }

    await next();
  };
};
