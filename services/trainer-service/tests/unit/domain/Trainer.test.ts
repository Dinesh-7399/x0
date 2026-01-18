import { describe, it, expect } from 'bun:test';
import { Trainer, VerificationStatus } from '../../../src/domain/entities/Trainer';

describe('Trainer Entity', () => {
  it('should create a new trainer with unverified status', () => {
    const trainer = Trainer.create('user-123', 'Bio', ['Yoga']);

    expect(trainer.props.userId).toBe('user-123');
    expect(trainer.props.bio).toBe('Bio');
    expect(trainer.props.specializations).toEqual(['Yoga']);
    expect(trainer.props.verificationStatus).toBe(VerificationStatus.UNVERIFIED);
    expect(trainer.props.id).toBeDefined();
  });

  it('should verify a trainer', () => {
    const trainer = Trainer.create('user-123');
    trainer.verify();

    expect(trainer.props.verificationStatus).toBe(VerificationStatus.VERIFIED);
  });

  it('should update profile', () => {
    const trainer = Trainer.create('user-123', 'Old Bio');
    trainer.updateProfile('New Bio', ['HIIT'], 5);

    expect(trainer.props.bio).toBe('New Bio');
    expect(trainer.props.specializations).toEqual(['HIIT']);
    expect(trainer.props.experienceYears).toBe(5);
  });
});
