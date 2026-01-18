import { ITrainerRepository } from '../../domain/repositories/ITrainerRepository.js';
import { Availability } from '../../domain/entities/Availability.js';

export interface SetAvailabilityDto {
  gymId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export class SchedulingService {
  constructor(private readonly repo: ITrainerRepository) { }

  async setAvailability(trainerId: string, dto: SetAvailabilityDto): Promise<Availability> {
    // Basic overlap check logic would go here

    // Check if employment exists/valid?
    const employment = await this.repo.findEmployment(trainerId, dto.gymId);
    if (!employment || employment.props.status !== 'active') {
      throw new Error('Trainer is not active at this gym');
    }

    const availability = Availability.create(trainerId, dto.gymId, dto.dayOfWeek, dto.startTime, dto.endTime);
    await this.repo.addAvailability(availability);
    return availability;
  }

  async getAvailability(trainerId: string, gymId?: string) {
    return this.repo.getAvailability(trainerId, gymId);
  }

  async clearDay(trainerId: string, gymId: string, day: number) {
    return this.repo.clearAvailability(trainerId, gymId, day);
  }
}
