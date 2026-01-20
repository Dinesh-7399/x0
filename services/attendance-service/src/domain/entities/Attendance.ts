// src/domain/entities/Attendance.ts

export enum CheckInMethod {
  QR_CODE = "qr_code",
  NFC = "nfc",
  MANUAL = "manual",
  GEOFENCE = "geofence",
  BIOMETRIC = "biometric",
  KIOSK = "kiosk",
}

export enum CheckOutMethod {
  QR_CODE = "qr_code",
  NFC = "nfc",
  MANUAL = "manual",
  AUTO_TIMEOUT = "auto_timeout",
  GEOFENCE = "geofence",
}

export interface AttendanceProps {
  id: string;
  memberId: string;
  gymId: string;
  membershipId: string;

  checkInTime: Date;
  checkInMethod: CheckInMethod;
  checkInDeviceId: string | null;
  checkInStaffId: string | null;

  checkOutTime: Date | null;
  checkOutMethod: CheckOutMethod | null;
  checkOutDeviceId: string | null;

  durationMinutes: number | null;

  notes: string | null;
  isValid: boolean;
  voidedAt: Date | null;
  voidedBy: string | null;
  voidReason: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export class Attendance {
  private constructor(public readonly props: AttendanceProps) { }

  get id(): string { return this.props.id; }
  get memberId(): string { return this.props.memberId; }
  get gymId(): string { return this.props.gymId; }
  get checkInTime(): Date { return this.props.checkInTime; }
  get checkOutTime(): Date | null { return this.props.checkOutTime; }
  get isValid(): boolean { return this.props.isValid; }
  get durationMinutes(): number | null { return this.props.durationMinutes; }

  static checkIn(
    memberId: string,
    gymId: string,
    membershipId: string,
    method: CheckInMethod,
    deviceId?: string,
    staffId?: string
  ): Attendance {
    return new Attendance({
      id: crypto.randomUUID(),
      memberId,
      gymId,
      membershipId,
      checkInTime: new Date(),
      checkInMethod: method,
      checkInDeviceId: deviceId || null,
      checkInStaffId: staffId || null,
      checkOutTime: null,
      checkOutMethod: null,
      checkOutDeviceId: null,
      durationMinutes: null,
      notes: null,
      isValid: true,
      voidedAt: null,
      voidedBy: null,
      voidReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static fromPersistence(props: AttendanceProps): Attendance {
    return new Attendance(props);
  }

  checkOut(method: CheckOutMethod, deviceId?: string): void {
    if (this.props.checkOutTime) {
      throw new Error("Attendance already checked out");
    }

    const now = new Date();
    this.props.checkOutTime = now;
    this.props.checkOutMethod = method;
    this.props.checkOutDeviceId = deviceId || null;

    // Calculate duration in minutes
    const diffMs = now.getTime() - this.props.checkInTime.getTime();
    this.props.durationMinutes = Math.max(0, Math.floor(diffMs / 60000));

    this.touch();
  }

  void(staffId: string, reason: string): void {
    this.props.isValid = false;
    this.props.voidedAt = new Date();
    this.props.voidedBy = staffId;
    this.props.voidReason = reason;
    this.touch();
  }

  private touch(): void {
    this.props.updatedAt = new Date();
  }
}
