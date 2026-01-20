// src/domain/entities/MemberStreak.ts

export enum StreakType {
  DAILY = "daily",
  WEEKLY = "weekly",
}

export interface MemberStreakProps {
  id: string;
  memberId: string;
  gymId: string | null;

  currentStreak: number;
  streakType: StreakType;
  lastVisitDate: Date;
  streakStartDate: Date;

  longestStreak: number;
  longestStreakStartDate: Date;
  longestStreakEndDate: Date;

  freezeDaysRemaining: number;
  freezeUsedThisMonth: number;

  createdAt: Date;
  updatedAt: Date;
}

export class MemberStreak {
  private constructor(public readonly props: MemberStreakProps) { }

  get currentStreak(): number { return this.props.currentStreak; }
  get longestStreak(): number { return this.props.longestStreak; }

  static create(memberId: string, gymId?: string): MemberStreak {
    const now = new Date();
    return new MemberStreak({
      id: crypto.randomUUID(),
      memberId,
      gymId: gymId || null,
      currentStreak: 0,
      streakType: StreakType.DAILY,
      lastVisitDate: new Date(0), // Epoch
      streakStartDate: now,
      longestStreak: 0,
      longestStreakStartDate: now,
      longestStreakEndDate: now,
      freezeDaysRemaining: 2, // Default 2 freezes
      freezeUsedThisMonth: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(props: MemberStreakProps): MemberStreak {
    return new MemberStreak(props);
  }

  updateStreak(visitDate: Date): void {
    const lastVisit = new Date(this.props.lastVisitDate);
    const visit = new Date(visitDate);

    // Reset times to compare dates only
    lastVisit.setHours(0, 0, 0, 0);
    visit.setHours(0, 0, 0, 0);

    const diffTime = Math.abs(visit.getTime() - lastVisit.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // Same day visit, no change
      return;
    }

    if (diffDays === 1) {
      // Consecutive day, increment
      this.props.currentStreak++;
    } else if (diffDays > 1) {
      // Streak broken (unless frozen, logic handled in service)
      // For basic entity logic, we confirm break
      this.props.currentStreak = 1;
      this.props.streakStartDate = visitDate;
    } else {
      // First visit ever (diffDays large if lastVisit is epoch)
      this.props.currentStreak = 1;
      this.props.streakStartDate = visitDate;
    }

    // Update longest streak if beaten
    if (this.props.currentStreak > this.props.longestStreak) {
      this.props.longestStreak = this.props.currentStreak;
      this.props.longestStreakStartDate = this.props.streakStartDate;
      this.props.longestStreakEndDate = visitDate;
    }

    this.props.lastVisitDate = visitDate;
    this.touch();
  }

  private touch(): void {
    this.props.updatedAt = new Date();
  }
}
