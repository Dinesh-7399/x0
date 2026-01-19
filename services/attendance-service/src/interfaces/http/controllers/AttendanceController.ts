// src/interfaces/http/controllers/AttendanceController.ts

import type { Context } from "hono";
import type { AttendanceService } from "../../../application/services/AttendanceService.js";
import { CheckInSchema, CheckOutSchema, HistoryQuerySchema } from "../validation/schemas.js";

export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) { }

  /**
   * POST /check-in
   */
  async checkIn(c: Context) {
    const body = await c.req.json();
    const input = CheckInSchema.parse(body);

    // If memberId is missing (QR flow), it will be resolved by the service from token
    // If it is present, we pass it.
    // However, for manual check-in, the memberId might come from body or headers depending on implementation.
    // Assuming body for now as per schema. Note: Typically authenticated user ID comes from auth middleware.
    // For "kiosk mode", there might be no user auth header, instead kiosk auth.
    // I'll assume input.memberId is what validation passed.

    const attendance = await this.attendanceService.checkIn({
      memberId: input.memberId || "", // Service handles empty if token exists
      gymId: input.gymId,
      method: input.method as any,
      tokenValue: input.tokenValue,
      deviceId: input.deviceId,
      staffId: input.staffId
    });

    return c.json({ attendance }, 201);
  }

  /**
   * POST /check-out
   */
  async checkOut(c: Context) {
    const body = await c.req.json();
    const input = CheckOutSchema.parse(body);

    const attendance = await this.attendanceService.checkOut({
      memberId: input.memberId,
      gymId: input.gymId,
      method: input.method as any,
      deviceId: input.deviceId
    });

    return c.json({ attendance });
  }

  /**
   * GET /history
   */
  async history(c: Context) {
    const userId = c.req.header("x-user-id"); // From Auth Middleware
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const query = HistoryQuerySchema.parse({
      limit: c.req.query("limit"),
      offset: c.req.query("offset")
    });

    const result = await this.attendanceService.getHistory(userId, query.limit, query.offset);
    return c.json(result);
  }
}
