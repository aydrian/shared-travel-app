import { createRouter } from "@/lib/create-app";

const router = createRouter().all("/**", (c) => {
  const auth = c.get("auth");
  return auth.handler(c.req.raw);
});

export default router;
