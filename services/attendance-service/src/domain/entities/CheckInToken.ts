// src/domain/entities/CheckInToken.ts

import * as crypto from "node:crypto";

export interface CheckInTokenProps {
  id: string;
  memberId: string;
  gymId: string;
  tokenValue: string;
  tokenType: "qr_code" | "nfc";

  expiresAt: Date;
  usedAt: Date | null;
  isValid: boolean;

  createdAt: Date;
}

export class CheckInToken {
  private constructor(public readonly props: CheckInTokenProps) { }

  get tokenValue(): string { return this.props.tokenValue; }
  get isExpired(): boolean { return new Date() > this.props.expiresAt; }
  get isUsed(): boolean { return this.props.usedAt !== null; }

  static generate(
    memberId: string,
    gymId: string,
    expiryMinutes: number = 5
  ): CheckInToken {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);

    // Generate cryptographically secure random token
    const tokenValue = crypto.randomBytes(32).toString("hex");

    return new CheckInToken({
      id: crypto.randomUUID(),
      memberId,
      gymId,
      tokenValue,
      tokenType: "qr_code",
      expiresAt,
      usedAt: null,
      isValid: true,
      createdAt: new Date(),
    });
  }

  static fromPersistence(props: CheckInTokenProps): CheckInToken {
    return new CheckInToken(props);
  }

  use(): void {
    if (this.isUsed) throw new Error("Token already used");
    if (this.isExpired) throw new Error("Token expired");

    this.props.usedAt = new Date();
    this.props.isValid = false; // Invalidate after use
  }

  invalidate(): void {
    this.props.isValid = false;
  }
}
