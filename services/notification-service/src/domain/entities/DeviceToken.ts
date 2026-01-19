// src/domain/entities/DeviceToken.ts

export interface DeviceTokenProps {
  id: string;
  userId: string;
  token: string;
  platform: "ios" | "android" | "web";
  deviceId: string;
  appVersion: string;
  isActive: boolean;
  lastUsedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class DeviceToken {
  private constructor(public readonly props: DeviceTokenProps) { }

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get token(): string {
    return this.props.token;
  }
  get platform(): "ios" | "android" | "web" {
    return this.props.platform;
  }
  get deviceId(): string {
    return this.props.deviceId;
  }
  get appVersion(): string {
    return this.props.appVersion;
  }
  get isActive(): boolean {
    return this.props.isActive;
  }
  get lastUsedAt(): Date {
    return this.props.lastUsedAt;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  static register(
    userId: string,
    token: string,
    platform: "ios" | "android" | "web",
    deviceId: string,
    appVersion: string,
  ): DeviceToken {
    // Validate
    if (!DeviceToken.isValidUuid(userId)) {
      throw new Error("Invalid user ID");
    }
    if (!token || token.length < 10) {
      throw new Error("Invalid device token");
    }
    if (!["ios", "android", "web"].includes(platform)) {
      throw new Error("Invalid platform");
    }
    if (!deviceId || deviceId.length < 5) {
      throw new Error("Invalid device ID");
    }

    return new DeviceToken({
      id: crypto.randomUUID(),
      userId,
      token: token.trim(),
      platform,
      deviceId: deviceId.trim(),
      appVersion: appVersion || "unknown",
      isActive: true,
      lastUsedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static fromPersistence(props: DeviceTokenProps): DeviceToken {
    return new DeviceToken(props);
  }

  updateToken(newToken: string): void {
    if (!newToken || newToken.length < 10) {
      throw new Error("Invalid device token");
    }
    (this.props as { token: string }).token = newToken.trim();
    (this.props as { lastUsedAt: Date }).lastUsedAt = new Date();
    this.touch();
  }

  markUsed(): void {
    (this.props as { lastUsedAt: Date }).lastUsedAt = new Date();
  }

  deactivate(): void {
    (this.props as { isActive: boolean }).isActive = false;
    this.touch();
  }

  belongsTo(userId: string): boolean {
    return this.userId === userId;
  }

  private touch(): void {
    (this.props as { updatedAt: Date }).updatedAt = new Date();
  }

  private static isValidUuid(id: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      id,
    );
  }
}
