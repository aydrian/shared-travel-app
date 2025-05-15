import { showRoutes } from "hono/dev";
import createApp from "@/lib/create-app";
import index from "@/routes/index.route";
import auth from "@/routes/auth/auth.index";
import trips from "@/routes/trips/trips.index";
import { HTTPException } from "hono/http-exception";

const app = createApp()
  .route("/", index)
  .basePath("/api")
  .route("/auth", auth)
  .route("/trips", trips);

showRoutes(app);

// Error handling
// app.onError((err, c) => {
//   console.error("Caught error:", err);

//   if (err instanceof HTTPException) {
//     // 👀 Look here
//     return err.getResponse();
//   }

//   return c.json(
//     {
//       message: "An unexpected error occurred"
//     },
//     500
//   );
// });

export default app;
