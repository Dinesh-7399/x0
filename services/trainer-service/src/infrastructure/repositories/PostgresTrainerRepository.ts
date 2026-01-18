import { ITrainerRepository, SearchTrainersParams } from '../../domain/repositories/ITrainerRepository.js';
import { Trainer, TrainerProps } from '../../domain/entities/Trainer.js';
import { Certification, CertificationProps } from '../../domain/entities/Certification.js';
import { TrainerGym, TrainerGymProps } from '../../domain/entities/TrainerGym.js';
import { Availability, AvailabilityProps } from '../../domain/entities/Availability.js';
import { query, queryOne } from '../database/postgres.js';

export class PostgresTrainerRepository implements ITrainerRepository {

  // ============ TRAINER ============

  async create(trainer: Trainer): Promise<Trainer> {
    const sql = `
      INSERT INTO trainers (id, user_id, bio, specializations, experience_years, verification_status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const p = trainer.props;
    await query(sql, [
      p.id, p.userId, p.bio, p.specializations, p.experienceYears,
      p.verificationStatus, p.createdAt, p.updatedAt
    ]);
    return trainer;
  }

  async findById(id: string): Promise<Trainer | null> {
    const sql = `SELECT * FROM trainers WHERE id = $1`;
    const row = await queryOne<any>(sql, [id]);
    if (!row) return null;
    return this.mapTrainer(row);
  }

  async findByUserId(userId: string): Promise<Trainer | null> {
    const sql = `SELECT * FROM trainers WHERE user_id = $1`;
    const row = await queryOne<any>(sql, [userId]);
    if (!row) return null;
    return this.mapTrainer(row);
  }

  async update(trainer: Trainer): Promise<Trainer> {
    const sql = `
      UPDATE trainers 
      SET bio = $2, specializations = $3, experience_years = $4, 
          verification_status = $5, updated_at = $6
      WHERE id = $1
      RETURNING *
    `;
    const p = trainer.props;
    await query(sql, [
      p.id, p.bio, p.specializations, p.experienceYears,
      p.verificationStatus, p.updatedAt
    ]);
    return trainer;
  }

  async search(params: SearchTrainersParams): Promise<Trainer[]> {
    let sql = `SELECT * FROM trainers WHERE 1=1`;
    const values: any[] = [];
    let idx = 1;

    if (params.specialization) {
      sql += ` AND $${idx} = ANY(specializations)`;
      values.push(params.specialization);
      idx++;
    }

    if (params.gymId) {
      // Join needed
      sql += ` AND id IN (SELECT trainer_id FROM trainer_gyms WHERE gym_id = $${idx} AND status = 'active')`;
      values.push(params.gymId);
      idx++;
    }

    if (params.limit) {
      sql += ` LIMIT $${idx}`;
      values.push(params.limit);
      idx++;
    }

    if (params.offset) {
      sql += ` OFFSET $${idx}`;
      values.push(params.offset);
      idx++;
    }

    const rows = await query<any>(sql, values);
    return rows.map(r => this.mapTrainer(r));
  }

  // ============ CERTIFICATIONS ============

  async addCertification(cert: Certification): Promise<Certification> {
    const sql = `
      INSERT INTO certifications (id, trainer_id, name, issuing_organization, issue_date, expiry_date, certificate_url, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;
    const p = cert.props;
    await query(sql, [
      p.id, p.trainerId, p.name, p.issuingOrganization, p.issueDate,
      p.expiryDate, p.certificateUrl, p.status, p.createdAt
    ]);
    return cert;
  }

  async getCertifications(trainerId: string): Promise<Certification[]> {
    const sql = `SELECT * FROM certifications WHERE trainer_id = $1`;
    const rows = await query<any>(sql, [trainerId]);
    return rows.map(r => this.mapCertification(r));
  }

  async updateCertification(cert: Certification): Promise<Certification> {
    const sql = `
      UPDATE certifications 
      SET status = $2, verified_at = $3, updated_at = NOW()
      WHERE id = $1
    `;
    const p = cert.props;
    await query(sql, [p.id, p.status, p.verifiedAt]);
    return cert;
  }

  // ============ EMPLOYMENT ============

  async addEmployment(employment: TrainerGym): Promise<TrainerGym> {
    const sql = `
      INSERT INTO trainer_gyms (id, trainer_id, gym_id, employment_type, status, joined_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    const p = employment.props;
    await query(sql, [
      p.id, p.trainerId, p.gymId, p.employmentType, p.status, p.joinedAt
    ]);
    return employment;
  }

  async findEmployment(trainerId: string, gymId: string): Promise<TrainerGym | null> {
    const sql = `SELECT * FROM trainer_gyms WHERE trainer_id = $1 AND gym_id = $2`;
    const row = await queryOne<any>(sql, [trainerId, gymId]);
    if (!row) return null;
    return this.mapEmployment(row);
  }

  async getEmploymentsByTrainer(trainerId: string): Promise<TrainerGym[]> {
    const sql = `SELECT * FROM trainer_gyms WHERE trainer_id = $1`;
    const rows = await query<any>(sql, [trainerId]);
    return rows.map(r => this.mapEmployment(r));
  }

  async getTrainersByGym(gymId: string): Promise<Trainer[]> {
    const sql = `
      SELECT t.* FROM trainers t
      JOIN trainer_gyms tg ON t.id = tg.trainer_id
      WHERE tg.gym_id = $1 AND tg.status = 'active'
    `;
    const rows = await query<any>(sql, [gymId]);
    return rows.map(r => this.mapTrainer(r));
  }

  // ============ AVAILABILITY ============

  async addAvailability(availability: Availability): Promise<Availability> {
    const sql = `
      INSERT INTO availabilities (id, trainer_id, gym_id, day_of_week, start_time, end_time, is_recurring)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    const p = availability.props;
    await query(sql, [
      p.id, p.trainerId, p.gymId, p.dayOfWeek, p.startTime, p.endTime, p.isRecurring
    ]);
    return availability;
  }

  async getAvailability(trainerId: string, gymId?: string): Promise<Availability[]> {
    let sql = `SELECT * FROM availabilities WHERE trainer_id = $1`;
    const values = [trainerId];
    if (gymId) {
      sql += ` AND gym_id = $2`;
      values.push(gymId);
    }
    const rows = await query<any>(sql, values);
    return rows.map(r => this.mapAvailability(r));
  }

  async clearAvailability(trainerId: string, gymId: string, dayOfWeek?: number): Promise<void> {
    let sql = `DELETE FROM availabilities WHERE trainer_id = $1 AND gym_id = $2`;
    const values: any[] = [trainerId, gymId];

    if (dayOfWeek !== undefined) {
      sql += ` AND day_of_week = $3`;
      values.push(dayOfWeek);
    }
    await query(sql, values);
  }

  // ============ MAPPERS ============

  private mapTrainer(row: any): Trainer {
    return Trainer.fromPersistence({
      id: row.id,
      userId: row.user_id,
      bio: row.bio,
      specializations: row.specializations,
      experienceYears: row.experience_years,
      verificationStatus: row.verification_status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  private mapCertification(row: any): Certification {
    return Certification.fromPersistence({
      id: row.id,
      trainerId: row.trainer_id,
      name: row.name,
      issuingOrganization: row.issuing_organization,
      issueDate: row.issue_date,
      expiryDate: row.expiry_date,
      certificateUrl: row.certificate_url,
      status: row.status,
      verifiedAt: row.verified_at,
      createdAt: row.created_at,
    });
  }

  private mapEmployment(row: any): TrainerGym {
    return TrainerGym.fromPersistence({
      id: row.id,
      trainerId: row.trainer_id,
      gymId: row.gym_id,
      employmentType: row.employment_type,
      status: row.status,
      joinedAt: row.joined_at,
      endedAt: row.ended_at,
    });
  }

  private mapAvailability(row: any): Availability {
    return Availability.fromPersistence({
      id: row.id,
      trainerId: row.trainer_id,
      gymId: row.gym_id,
      dayOfWeek: row.day_of_week,
      startTime: row.start_time, // Postgres TIME returns string HH:mm:ss usually
      endTime: row.end_time,
      isRecurring: row.is_recurring,
    });
  }
}
