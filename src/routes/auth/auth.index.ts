import { createRouter } from "@/lib/create-app";
import { createAuth } from "@/lib/auth";

const router = createRouter().all("/**", (c) => {
  const auth = createAuth(c.env);
  return auth.handler(c.req.raw);
});

export default router;
