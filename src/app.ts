import createApp from "@/lib/create-app";
import index from "@/routes/index.route";
import auth from "@/routes/auth/auth.index";
import trips from "@/routes/trips/trips.index";

const app = createApp();

const routes = [index, auth, trips] as const;

for (const route of routes) {
  app.route("/", route);
}

export default app;
