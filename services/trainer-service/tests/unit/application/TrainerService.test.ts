import { describe, it, expect, mock } from 'bun:test';
import { TrainerService } from '../../../src/application/services/TrainerService';
import { ITrainerRepository } from '../../../src/domain/repositories/ITrainerRepository';
import { Trainer } from '../../../src/domain/entities/Trainer';
import { Certification } from 'services/trainer-service/src/domain/entities/Certification';
import { TrainerGym } from 'services/trainer-service/src/domain/entities/TrainerGym';
import { Availability } from 'services/trainer-service/src/domain/entities/Availability';

// Mock Repository
class MockTrainerRepository implements ITrainerRepository {
  trainers: Map<string, Trainer> = new Map();

  async create(trainer: Trainer) {
    this.trainers.set(trainer.props.userId, trainer);
    this.trainers.set(trainer.props.id, trainer);
    return trainer;
  }
  async findById(id: string) { return this.trainers.get(id) || null; }
  async findByUserId(userId: string) { return this.trainers.get(userId) || null; }
  async update(trainer: Trainer) {
    this.trainers.set(trainer.props.id, trainer);
    return trainer;
  }
  async search() { return []; }
  async addCertification(cert: Certification): Promise<Certification> { throw new Error('Not implemented'); }
  async getCertifications(trainerId: string): Promise<Certification[]> { return []; }
  async updateCertification(cert: Certification): Promise<Certification> { throw new Error('Not implemented'); }
  async addEmployment(emp: TrainerGym): Promise<TrainerGym> { throw new Error('Not implemented'); }
  async findEmployment(trainerId: string, gymId: string): Promise<TrainerGym | null> { return null; }
  async getEmploymentsByTrainer(trainerId: string): Promise<TrainerGym[]> { return []; }
  async getTrainersByGym(gymId: string): Promise<Trainer[]> { return []; }
  async addAvailability(avail: Availability): Promise<Availability> { throw new Error('Not implemented'); }
  async getAvailability(trainerId: string, gymId?: string): Promise<Availability[]> { return []; }
  async clearAvailability(trainerId: string, gymId: string, dayOfWeek?: number): Promise<void> { }
}

describe('TrainerService', () => {
  it('should create a profile if not exists', async () => {
    const repo = new MockTrainerRepository();
    const service = new TrainerService(repo);

    const dto = { specializations: ['Gym'], experienceYears: 2 };
    const trainer = await service.createProfile('user-1', dto);

    expect(trainer.userId).toBe('user-1');
    expect(trainer.props.specializations).toEqual(['Gym']);
  });

  it('should throw if profile already exists', async () => {
    const repo = new MockTrainerRepository();
    const service = new TrainerService(repo);

    await service.createProfile('user-1', { specializations: [], experienceYears: 0 });

    try {
      await service.createProfile('user-1', { specializations: [], experienceYears: 0 });
      expect(true).toBe(false); // Should fail
    } catch (e) {
      expect((e as Error).message).toContain('already exists');
    }
  });

  it('should update profile', async () => {
    const repo = new MockTrainerRepository();
    const service = new TrainerService(repo);

    await service.createProfile('user-1', { specializations: [], experienceYears: 0 });
    const updated = await service.updateProfile('user-1', { bio: 'New Bio' });

    expect(updated.props.bio).toBe('New Bio');
  });
});
