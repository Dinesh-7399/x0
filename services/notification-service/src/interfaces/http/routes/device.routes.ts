// src/interfaces/http/routes/device.routes.ts

import { Hono } from "hono";
import type { DeviceController } from "../controllers/DeviceController.js";

export function createDeviceRoutes(controller: DeviceController): Hono {
  const router = new Hono();

  router.post("/register", (c) => controller.register(c));
  router.get("/", (c) => controller.list(c));
  router.delete("/:id", (c) => controller.delete(c));

  return router;
}
