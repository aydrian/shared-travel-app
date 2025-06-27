actor User {}

# Everyone will be added to "deafult" organization
resource Organization {
  roles = ["member"];
  permissions = ["trip.create", "trip.list"];

  "trip.create" if "member";
  "trip.list" if "member";
}

resource Trip {
  roles = ["organizer", "participant", "viewer"];
  permissions = ["manage", "view", "expense.create", "expense.list", "participants.list", "participants.manage"];
  relations = {
    organization: Organization,
  };

  "view" if "viewer";
  "participants.list" if "viewer";
  "expense.list" if "viewer";

  "viewer" if "participant";
  "expense.create" if "participant";

  "participant" if "organizer";
  "manage" if "organizer";
  "participants.manage" if "organizer";
}

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

test "org members can create and list trips" {
  setup {
    has_role(User{"alice"}, "member", Organization{"default"});
  }

  assert_not allow(User{"bob"}, "trip.create", Organization{"default"});
  assert allow(User{"alice"}, "trip.create", Organization{"default"});
  assert_not allow(User{"bob"}, "trip.list", Organization{"default"});
  assert allow(User{"alice"}, "trip.list", Organization{"default"});
}

test fixture default {
  has_role(User{"alice"}, "member", Organization{"default"});
  has_role(User{"bob"}, "member", Organization{"default"});
  has_role(User{"charlie"}, "member", Organization{"default"});
}

test fixture testTrip {
  has_role(User{"alice"}, "organizer", Trip{"test-trip"});
  has_role(User{"bob"}, "participant", Trip{"test-trip"});
  has_role(User{"charlie"}, "viewer", Trip{"test-trip"});
}

test "testing roles for trips" {
  setup {
    fixture default;
    fixture testTrip;
  }

  # Alice can perform all actions
  assert allow(User{"alice"}, action: String, Trip{"test-trip"}) iff
  action in ["manage", "view", "participants.list", "participants.manage", "expense.list", "expense.create"];

  # Bob can perform "view", "participants.list", "expense.list", and "expense.create"
  assert allow(User{"bob"}, action: String, Trip{"test-trip"}) iff
  action in ["view", "participants.list", "expense.list", "expense.create"];
  assert_not allow(User{"bob"}, "manage", Trip{"test-trip"});
  assert_not allow(User{"bob"}, "participants.manage", Trip{"test-trip"});

  # Charlie can perform "view" and "participants.list" and "expense.list"
  assert allow(User{"charlie"}, action: String, Trip{"test-trip"}) iff
  action in ["view", "participants.list", "expense.list"];
  assert_not allow(User{"charlie"}, "manage", Trip{"test-trip"});
  assert_not allow(User{"charlie"}, "participants.manage", Trip{"test-trip"});
}

test fixture expenseSharing {
  has_role(User{"alice"}, "organizer", Trip{"test-trip"});
  has_role(User{"bob"}, "participant", Trip{"test-trip"});
  has_role(User{"charlie"}, "viewer", Trip{"test-trip"});
  has_role(User{"dave"}, "viewer", Trip{"test-trip"});
  has_relation(Expense{"shared-expense"}, "trip", Trip{"test-trip"});
  has_role(User{"bob"}, "owner", Expense{"shared-expense"});
  has_relation(Expense{"shared-expense"}, "shared_with", User{"charlie"});
}

test "expense ownership and sharing permissions" {
  setup {
    fixture default;
    fixture expenseSharing;
  }

  # Bob (owner) can do everything
  assert allow(User{"bob"}, action: String, Expense{"shared-expense"}) iff
    action in ["manage", "view", "share"];

  # Alice (organizer) can do everything
  assert allow(User{"alice"}, action: String, Expense{"shared-expense"}) iff
    action in ["manage", "view", "share"];

  # Charlie (shared with) can only view
  assert allow(User{"charlie"}, "view", Expense{"shared-expense"});
  assert_not allow(User{"charlie"}, "manage", Expense{"shared-expense"});
  assert_not allow(User{"charlie"}, "share", Expense{"shared-expense"});

  # Dave (not shared with) cannot access
  assert_not allow(User{"dave"}, "view", Expense{"shared-expense"});
  assert_not allow(User{"dave"}, "manage", Expense{"shared-expense"});
}

test "expense without sharing - owner only access" {
  setup {
    fixture default;
    fixture testTrip;
    has_relation(Expense{"private-expense"}, "trip", Trip{"test-trip"});
    has_role(User{"bob"}, "owner", Expense{"private-expense"});
  }

  # Bob (owner) can access
  assert allow(User{"bob"}, "view", Expense{"private-expense"});
  assert allow(User{"bob"}, "manage", Expense{"private-expense"});

  # Alice (organizer) can access
  assert allow(User{"alice"}, "view", Expense{"private-expense"});
  assert allow(User{"alice"}, "manage", Expense{"private-expense"});

  # Charlie (viewer) cannot access since not shared
  assert_not allow(User{"charlie"}, "view", Expense{"private-expense"});
  assert_not allow(User{"charlie"}, "manage", Expense{"private-expense"});
}