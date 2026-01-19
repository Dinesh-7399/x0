// src/interfaces/http/controllers/TokenController.ts

import type { Context } from "hono";
import type { AttendanceService } from "../../../application/services/AttendanceService.js";
import { GenerateTokenSchema } from "../validation/schemas.js";

export class TokenController {
  constructor(private readonly attendanceService: AttendanceService) { }

  /**
   * POST /generate
   */
  async generate(c: Context) {
    const userId = c.req.header("x-user-id");
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const input = GenerateTokenSchema.parse(body);

    const tokenValue = await this.attendanceService.generateToken(userId, input.gymId);

    return c.json({ token: tokenValue }, 201);
  }
}
