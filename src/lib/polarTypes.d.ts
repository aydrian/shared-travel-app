// Manually editing this file is discouraged. It was generated with:
// $ oso-cloud generate-types typescript main.polar
export const PolarResources = {
  Expense: {
    roles: ["editor", "viewer"],
    permissions: ["manage", "view"],
    relations: {
      trip: "Trip"
    }
  },
  Organization: {
    roles: ["member"],
    permissions: ["trip.create", "trip.list"],
    relations: {}
  },
  Trip: {
    roles: ["organizer", "participant", "viewer"],
    permissions: [
      "expense.create",
      "expense.list",
      "manage",
      "participants.list",
      "participants.manage",
      "view"
    ],
    relations: {
      organization: "Organization"
    }
  },
  User: {
    roles: [],
    permissions: [],
    relations: {}
  }
} as const;
export type PolarTypes = {
  fact:
    | [
        "has_relation",
        { type: "Expense"; id: string },
        { type: "String"; id: "trip" },
        { type: "Trip"; id: string }
      ]
    | [
        "has_relation",
        { type: "Trip"; id: string },
        { type: "String"; id: "organization" },
        { type: "Organization"; id: string }
      ]
    | [
        "has_role",
        { type: "User"; id: string },
        { type: "String"; id: "editor" } | { type: "String"; id: "viewer" },
        { type: "Expense"; id: string }
      ]
    | [
        "has_role",
        { type: "User"; id: string },
        { type: "String"; id: "member" },
        { type: "Organization"; id: string }
      ]
    | [
        "has_role",
        { type: "User"; id: string },
        (
          | { type: "String"; id: "organizer" }
          | { type: "String"; id: "participant" }
          | { type: "String"; id: "viewer" }
        ),
        { type: "Trip"; id: string }
      ];
  query:
    | [
        "allow",
        { type: "User"; id: string },
        (
          | { type: "String"; id: "expense.create" }
          | { type: "String"; id: "expense.list" }
          | { type: "String"; id: "manage" }
          | { type: "String"; id: "participants.list" }
          | { type: "String"; id: "participants.manage" }
          | { type: "String"; id: "view" }
        ),
        { type: "Trip"; id: string }
      ]
    | [
        "allow",
        { type: "User"; id: string },
        { type: "String"; id: "manage" } | { type: "String"; id: "view" },
        { type: "Expense"; id: string }
      ]
    | [
        "allow",
        { type: "User"; id: string },
        (
          | { type: "String"; id: "trip.create" }
          | { type: "String"; id: "trip.list" }
        ),
        { type: "Organization"; id: string }
      ]
    | [
        "has_permission",
        { type: "User"; id: string },
        (
          | { type: "String"; id: "expense.create" }
          | { type: "String"; id: "expense.list" }
          | { type: "String"; id: "manage" }
          | { type: "String"; id: "participants.list" }
          | { type: "String"; id: "participants.manage" }
          | { type: "String"; id: "view" }
        ),
        { type: "Trip"; id: string }
      ]
    | [
        "has_permission",
        { type: "User"; id: string },
        { type: "String"; id: "manage" } | { type: "String"; id: "view" },
        { type: "Expense"; id: string }
      ]
    | [
        "has_permission",
        { type: "User"; id: string },
        (
          | { type: "String"; id: "trip.create" }
          | { type: "String"; id: "trip.list" }
        ),
        { type: "Organization"; id: string }
      ]
    | [
        "has_role",
        { type: "User"; id: string },
        { type: "String"; id: "editor" } | { type: "String"; id: "viewer" },
        { type: "Expense"; id: string }
      ]
    | [
        "has_role",
        { type: "User"; id: string },
        (
          | { type: "String"; id: "participant" }
          | { type: "String"; id: "viewer" }
        ),
        { type: "Trip"; id: string }
      ];
  resources: {
    Expense: {
      roles: (typeof PolarResources)["Expense"]["roles"][number];
      permissions: (typeof PolarResources)["Expense"]["permissions"][number];
      relations: keyof (typeof PolarResources)["Expense"]["relations"];
    };
    Organization: {
      roles: (typeof PolarResources)["Organization"]["roles"][number];
      permissions: (typeof PolarResources)["Organization"]["permissions"][number];
      relations: keyof (typeof PolarResources)["Organization"]["relations"];
    };
    Trip: {
      roles: (typeof PolarResources)["Trip"]["roles"][number];
      permissions: (typeof PolarResources)["Trip"]["permissions"][number];
      relations: keyof (typeof PolarResources)["Trip"]["relations"];
    };
    User: {
      roles: (typeof PolarResources)["User"]["roles"][number];
      permissions: (typeof PolarResources)["User"]["permissions"][number];
      relations: keyof (typeof PolarResources)["User"]["relations"];
    };
  };
};
