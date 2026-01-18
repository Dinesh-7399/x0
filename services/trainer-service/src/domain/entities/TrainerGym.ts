export enum EmploymentType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  FREELANCE = 'freelance',
}

export enum EmploymentStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  TERMINATED = 'terminated',
}

export interface TrainerGymProps {
  id: string;
  trainerId: string;
  gymId: string;
  employmentType: EmploymentType;
  status: EmploymentStatus;
  joinedAt: Date;
  endedAt?: Date;
}

export class TrainerGym {
  private constructor(public props: TrainerGymProps) { }

  static create(trainerId: string, gymId: string, type: EmploymentType = EmploymentType.CONTRACT): TrainerGym {
    return new TrainerGym({
      id: crypto.randomUUID(),
      trainerId,
      gymId,
      employmentType: type,
      status: EmploymentStatus.PENDING,
      joinedAt: new Date(),
    });
  }

  static fromPersistence(props: TrainerGymProps): TrainerGym {
    return new TrainerGym(props);
  }

  activate(): void {
    this.props.status = EmploymentStatus.ACTIVE;
  }

  terminate(): void {
    this.props.status = EmploymentStatus.TERMINATED;
    this.props.endedAt = new Date();
  }
}
