import { ITrainerRepository } from '../../domain/repositories/ITrainerRepository.js';
import { TrainerGym, EmploymentType } from '../../domain/entities/TrainerGym.js';
import { publish } from '../../infrastructure/messaging/publisher.js';

export class EmploymentService {
  constructor(private readonly repo: ITrainerRepository) { }

  async requestToJoinGym(trainerId: string, gymId: string, type: EmploymentType): Promise<TrainerGym> {
    const existing = await this.repo.findEmployment(trainerId, gymId);
    if (existing && existing.props.status === 'active') {
      throw new Error('Already employed at this gym');
    }

    const employment = TrainerGym.create(trainerId, gymId, type);
    await this.repo.addEmployment(employment);

    await publish('trainer.employment_requested', { trainerId, gymId });
    return employment;
  }

  async getEmployments(trainerId: string) {
    return this.repo.getEmploymentsByTrainer(trainerId);
  }

  async getGymStaff(gymId: string) {
    return this.repo.getTrainersByGym(gymId);
  }
}
