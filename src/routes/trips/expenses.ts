import { createRouter } from "@/lib/create-app";

const router = createRouter()
  .get("/", (c) => {
    return c.json({ message: "View all expenses for a trip" }, 200);
  })
  .post("/", (c) => {
    return c.json({ message: "Add a new expense to a trip" }, 201);
  })
  .patch("/:expenseId", (c) => {
    return c.json({ message: "Update an existing expense" }, 200);
  })
  .delete("/:expenseId", (c) => {
    return c.body(null, 204);
  });

export default router;
