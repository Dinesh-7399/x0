import { Trainer } from '../entities/Trainer.js';
import { Certification } from '../entities/Certification.js';
import { TrainerGym } from '../entities/TrainerGym.js';
import { Availability } from '../entities/Availability.js';

export interface SearchTrainersParams {
  specialization?: string;
  gymId?: string;
  limit?: number;
  offset?: number;
}

export interface ITrainerRepository {
  // Trainer Profile
  create(trainer: Trainer): Promise<Trainer>;
  findById(id: string): Promise<Trainer | null>;
  findByUserId(userId: string): Promise<Trainer | null>;
  update(trainer: Trainer): Promise<Trainer>;
  search(params: SearchTrainersParams): Promise<Trainer[]>;

  // Certifications
  addCertification(cert: Certification): Promise<Certification>;
  getCertifications(trainerId: string): Promise<Certification[]>;
  updateCertification(cert: Certification): Promise<Certification>;

  // Employment (Gym Link)
  addEmployment(employment: TrainerGym): Promise<TrainerGym>;
  findEmployment(trainerId: string, gymId: string): Promise<TrainerGym | null>;
  getEmploymentsByTrainer(trainerId: string): Promise<TrainerGym[]>;
  getTrainersByGym(gymId: string): Promise<Trainer[]>; // Complex join

  // Availability
  addAvailability(availability: Availability): Promise<Availability>;
  getAvailability(trainerId: string, gymId?: string): Promise<Availability[]>;
  clearAvailability(trainerId: string, gymId: string, dayOfWeek?: number): Promise<void>;
}
