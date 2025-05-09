import { createRouter } from "@/lib/create-app";

const router = createRouter()
  .post("/invite", (c) => {
    return c.json({ message: "Invite a new participant" }, 201);
  })
  .get("/participants", (c) => {
    return c.json({ message: "List all participants" }, 200);
  })
  .patch("/participants/:userId", (c) => {
    return c.json({ message: "Update participant's role" }, 200);
  })
  .delete("/participants/:userId", (c) => {
    return c.body(null, 204);
  });

export default router;
