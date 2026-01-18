export enum VerificationStatus {
  UNVERIFIED = 'unverified',
  VERIFIED = 'verified',
  SUSPENDED = 'suspended',
}

export interface TrainerProps {
  id: string;
  userId: string;
  bio?: string;
  specializations: string[];
  experienceYears: number;
  verificationStatus: VerificationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class Trainer {
  private constructor(public props: TrainerProps) { }

  static create(userId: string, bio?: string, specializations: string[] = [], experienceYears: number = 0): Trainer {
    return new Trainer({
      id: crypto.randomUUID(),
      userId,
      bio,
      specializations,
      experienceYears,
      verificationStatus: VerificationStatus.UNVERIFIED,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static fromPersistence(props: TrainerProps): Trainer {
    return new Trainer(props);
  }

  // Business Logic
  verify(): void {
    this.props.verificationStatus = VerificationStatus.VERIFIED;
    this.props.updatedAt = new Date();
  }

  updateProfile(bio?: string, specializations?: string[], experienceYears?: number): void {
    if (bio !== undefined) this.props.bio = bio;
    if (specializations !== undefined) this.props.specializations = specializations;
    if (experienceYears !== undefined) this.props.experienceYears = experienceYears;
    this.props.updatedAt = new Date();
  }

  get id(): string { return this.props.id; }
  get userId(): string { return this.props.userId; }
}
