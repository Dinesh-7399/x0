// src/interfaces/http/routes/attendance.routes.ts

import { Hono } from "hono";
import type { AttendanceController } from "../controllers/AttendanceController.js";

export function createAttendanceRoutes(controller: AttendanceController): Hono {
  const router = new Hono();

  router.post("/check-in", (c) => controller.checkIn(c));
  router.post("/check-out", (c) => controller.checkOut(c));
  router.get("/history", (c) => controller.history(c));

  return router;
}
