// src/interfaces/http/routes/token.routes.ts

import { Hono } from "hono";
import type { TokenController } from "../controllers/TokenController.js";

export function createTokenRoutes(controller: TokenController): Hono {
  const router = new Hono();

  router.post("/generate", (c) => controller.generate(c));

  return router;
}
