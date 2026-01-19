// src/interfaces/http/controllers/DeviceController.ts

import type { Context } from "hono";
import type { IDeviceTokenRepository } from "../../../domain/repositories/IDeviceTokenRepository.js";
import { DeviceToken } from "../../../domain/entities/DeviceToken.js";
import { RegisterDeviceSchema } from "../validation/schemas.js";
import { DeviceTokenNotFoundError } from "../../../application/errors/NotificationErrors.js";

export class DeviceController {
  constructor(private readonly deviceTokenRepo: IDeviceTokenRepository) { }

  /**
   * POST /devices/register
   */
  async register(c: Context) {
    const userId = c.get("userId") as string;
    const body = RegisterDeviceSchema.parse(await c.req.json());

    // Check if device already registered
    let existingToken = await this.deviceTokenRepo.findByDeviceId(body.deviceId);

    if (existingToken) {
      // Update existing token
      if (existingToken.userId !== userId) {
        // Device transferred to new user, deactivate for old user
        existingToken.deactivate();
        await this.deviceTokenRepo.update(existingToken);

        // Create new for new user
        const newToken = DeviceToken.register(
          userId,
          body.token,
          body.platform,
          body.deviceId,
          body.appVersion || "unknown",
        );
        await this.deviceTokenRepo.save(newToken);
        return c.json({ deviceId: newToken.id, registered: true }, 201);
      }

      // Same user, just update token
      existingToken.updateToken(body.token);
      await this.deviceTokenRepo.update(existingToken);
      return c.json({ deviceId: existingToken.id, registered: true });
    }

    // Register new device
    const token = DeviceToken.register(
      userId,
      body.token,
      body.platform,
      body.deviceId,
      body.appVersion || "unknown",
    );
    await this.deviceTokenRepo.save(token);

    return c.json({ deviceId: token.id, registered: true }, 201);
  }

  /**
   * GET /devices
   */
  async list(c: Context) {
    const userId = c.get("userId") as string;
    const tokens = await this.deviceTokenRepo.findByUserId(userId);

    return c.json({
      devices: tokens.map((t) => ({
        id: t.id,
        platform: t.platform,
        deviceId: t.deviceId,
        appVersion: t.appVersion,
        lastUsedAt: t.lastUsedAt,
        isActive: t.isActive,
      })),
    });
  }

  /**
   * DELETE /devices/:id
   */
  async delete(c: Context) {
    const userId = c.get("userId") as string;
    const tokenId = c.req.param("id");

    const token = await this.deviceTokenRepo.findById(tokenId);

    if (!token) {
      throw new DeviceTokenNotFoundError();
    }

    if (!token.belongsTo(userId)) {
      throw new DeviceTokenNotFoundError();
    }

    token.deactivate();
    await this.deviceTokenRepo.update(token);

    return c.json({ message: "Device unregistered" });
  }
}
