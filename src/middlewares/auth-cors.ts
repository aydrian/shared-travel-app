import { cors } from "hono/cors";

import { ORIGINS } from "@/config/constants";

export default cors({
  origin: ORIGINS,
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["POST", "GET", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
  credentials: true
});
