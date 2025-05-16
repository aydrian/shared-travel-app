import { showRoutes } from "hono/dev";
import createApp from "@/lib/create-app";
import index from "@/routes/index.route";
import auth from "@/routes/auth/auth.index";
import trips from "@/routes/trips/trips.index";

const app = createApp()
  .route("/", index)
  .basePath("/api")
  .route("/auth", auth)
  .route("/trips", trips);

if (process.env.NODE_ENV === "development") {
  showRoutes(app);
}

export default app;
