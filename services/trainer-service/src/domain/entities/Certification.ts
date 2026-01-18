export enum CertificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

export interface CertificationProps {
  id: string;
  trainerId: string;
  name: string;
  issuingOrganization: string;
  issueDate: Date;
  expiryDate?: Date;
  certificateUrl?: string; // S3 link or similar
  status: CertificationStatus;
  verifiedAt?: Date;
  createdAt: Date;
}

export class Certification {
  private constructor(public props: CertificationProps) { }

  static create(trainerId: string, name: string, issuer: string, date: Date, expiry?: Date, url?: string): Certification {
    return new Certification({
      id: crypto.randomUUID(),
      trainerId,
      name,
      issuingOrganization: issuer,
      issueDate: date,
      expiryDate: expiry,
      certificateUrl: url,
      status: CertificationStatus.PENDING,
      createdAt: new Date(),
    });
  }

  static fromPersistence(props: CertificationProps): Certification {
    return new Certification(props);
  }

  verify(): void {
    this.props.status = CertificationStatus.VERIFIED;
    this.props.verifiedAt = new Date();
  }

  reject(): void {
    this.props.status = CertificationStatus.REJECTED;
  }
}
