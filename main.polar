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
  roles = ["editor", "viewer"];
  permissions = ["manage", "view"];

  relations = {
    trip: Trip
  };

  "editor" if "participant" on "trip";
  "viewer" if "viewer" on "trip";


  "view" if "viewer";

  "viewer" if "editor";

  "manage" if "editor";
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

test "testing roles for expenses" {
    setup {
    fixture default;
    fixture testTrip;
    has_relation(Expense{"private-tour"}, "trip", Trip{"test-trip"});
  }

  # Alice can perform all actions
  assert allow(User{"alice"}, action: String, Expense{"private-tour"}) iff
  action in ["manage", "view"];

  # Bob can perform all actions
  assert allow(User{"bob"}, action: String, Expense{"private-tour"}) iff
  action in ["view", "manage"];

  # Charlie can only perform "view"
  assert allow(User{"charlie"}, action: String, Expense{"private-tour"}) iff
  action in ["view"];
  assert_not allow(User{"charlie"}, "manage", Expense{"private-tour"});
}