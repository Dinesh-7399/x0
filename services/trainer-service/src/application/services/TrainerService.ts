import { ITrainerRepository } from '../../domain/repositories/ITrainerRepository.js';
import { Trainer } from '../../domain/entities/Trainer.js';
import { publish } from '../../infrastructure/messaging/publisher.js'; // Assuming messaging setup

export interface CreateProfileDto {
  bio?: string;
  specializations: string[];
  experienceYears: number;
}

export interface UpdateProfileDto {
  bio?: string;
  specializations?: string[];
  experienceYears?: number;
}

export class TrainerService {
  constructor(private readonly repo: ITrainerRepository) { }

  async createProfile(userId: string, dto: CreateProfileDto): Promise<Trainer> {
    const existing = await this.repo.findByUserId(userId);
    if (existing) {
      throw new Error('Trainer profile already exists for this user');
    }

    const trainer = Trainer.create(userId, dto.bio, dto.specializations, dto.experienceYears);
    await this.repo.create(trainer);

    // Publish event
    // await publish('trainer.created', { trainerId: trainer.id, userId });

    return trainer;
  }

  async getProfile(id: string): Promise<Trainer> {
    const trainer = await this.repo.findById(id);
    if (!trainer) throw new Error('Trainer not found');
    return trainer;
  }

  async getProfileByUserId(userId: string): Promise<Trainer> {
    const trainer = await this.repo.findByUserId(userId);
    if (!trainer) throw new Error('Trainer profile not found');
    return trainer;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<Trainer> {
    const trainer = await this.repo.findByUserId(userId);
    if (!trainer) throw new Error('Trainer profile not found');

    trainer.updateProfile(dto.bio, dto.specializations, dto.experienceYears);
    await this.repo.update(trainer);

    return trainer;
  }

  async searchTrainers(params: { specialization?: string; gymId?: string; limit?: number }) {
    return this.repo.search(params);
  }
}
