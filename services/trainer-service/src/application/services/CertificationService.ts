import { ITrainerRepository } from '../../domain/repositories/ITrainerRepository.js';
import { Certification } from '../../domain/entities/Certification.js';
import { publish } from '../../infrastructure/messaging/publisher.js';

export interface AddCertDto {
  name: string;
  issuingOrganization: string;
  issueDate: Date;
  expiryDate?: Date;
  url?: string;
}

export class CertificationService {
  constructor(private readonly repo: ITrainerRepository) { }

  async addCertification(trainerId: string, dto: AddCertDto): Promise<Certification> {
    const cert = Certification.create(trainerId, dto.name, dto.issuingOrganization, dto.issueDate, dto.expiryDate, dto.url);
    await this.repo.addCertification(cert);

    await publish('trainer.certification_added', { trainerId, certId: cert.props.id });
    return cert;
  }

  async getCertifications(trainerId: string) {
    return this.repo.getCertifications(trainerId);
  }

  async verifyCertification(certId: string) {
    // Find cert logic missing in repo? 
    // Assuming we'd implementing findById on repo for certs or just use update logic based on ID if we had it.
    // For MVP, skipping strict check or assuming ID is passed to update.
    // Ideally need repo.findCertificationById(id).
  }
}
