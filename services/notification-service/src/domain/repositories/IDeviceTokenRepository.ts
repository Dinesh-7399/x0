// src/domain/repositories/IDeviceTokenRepository.ts

import type { DeviceToken } from "../entities/DeviceToken.js";

export interface IDeviceTokenRepository {
  save(token: DeviceToken): Promise<void>;
  findById(id: string): Promise<DeviceToken | null>;
  findByToken(token: string): Promise<DeviceToken | null>;
  findByUserId(userId: string): Promise<DeviceToken[]>;
  findByDeviceId(deviceId: string): Promise<DeviceToken | null>;
  update(token: DeviceToken): Promise<void>;
  delete(id: string): Promise<void>;

  deactivateAllForUser(userId: string): Promise<void>;
  deleteInactiveOlderThan(date: Date): Promise<number>;
}
