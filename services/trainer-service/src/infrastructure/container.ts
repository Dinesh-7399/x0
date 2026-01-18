import { PostgresTrainerRepository } from './repositories/PostgresTrainerRepository.js';
import { TrainerService } from '../application/services/TrainerService.js';
import { CertificationService } from '../application/services/CertificationService.js';
import { EmploymentService } from '../application/services/EmploymentService.js';
import { SchedulingService } from '../application/services/SchedulingService.js';

class Container {
  readonly trainerService: TrainerService;
  readonly certificationService: CertificationService;
  readonly employmentService: EmploymentService;
  readonly schedulingService: SchedulingService;

  constructor() {
    const repo = new PostgresTrainerRepository();

    this.trainerService = new TrainerService(repo);
    this.certificationService = new CertificationService(repo);
    this.employmentService = new EmploymentService(repo);
    this.schedulingService = new SchedulingService(repo);
  }
}

export const container = new Container();
