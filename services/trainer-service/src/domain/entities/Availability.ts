export interface AvailabilityProps {
  id: string;
  trainerId: string;
  gymId: string;
  dayOfWeek: number; // 0-6
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  isRecurring: boolean;
}

export class Availability {
  private constructor(public props: AvailabilityProps) { }

  static create(trainerId: string, gymId: string, day: number, start: string, end: string): Availability {
    // Basic validation
    if (day < 0 || day > 6) throw new Error('Invalid day of week');
    // Time validation omitted for brevity, would usually check format

    return new Availability({
      id: crypto.randomUUID(),
      trainerId,
      gymId,
      dayOfWeek: day,
      startTime: start,
      endTime: end,
      isRecurring: true,
    });
  }

  static fromPersistence(props: AvailabilityProps): Availability {
    return new Availability(props);
  }
}
