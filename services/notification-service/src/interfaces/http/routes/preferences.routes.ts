// src/interfaces/http/routes/preferences.routes.ts

import { Hono } from "hono";
import type { PreferencesController } from "../controllers/PreferencesController.js";

export function createPreferencesRoutes(controller: PreferencesController): Hono {
  const router = new Hono();

  router.get("/", (c) => controller.get(c));
  router.put("/", (c) => controller.update(c));

  return router;
}
