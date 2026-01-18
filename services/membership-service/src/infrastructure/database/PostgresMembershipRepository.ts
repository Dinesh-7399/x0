import { IMembershipRepository } from '../../application/interfaces/index.js';
import { Plan, Subscription, SubscriptionStatus } from '../../domain/entities/index.js';
import postgres from 'postgres';
import { getConfig } from '../../config/index.js';

const config = getConfig();
export const sql = postgres(config.databaseUrl);

export class PostgresMembershipRepository implements IMembershipRepository {
  async createPlan(plan: Plan): Promise<void> {
    await sql`INSERT INTO plans (id, name, description, price, currency, duration_days, is_active, created_at, updated_at)
      VALUES (${plan.id}, ${plan.name}, ${plan.description}, ${plan.price}, ${plan.currency}, ${plan.durationDays}, ${plan.isActive}, ${plan.createdAt}, ${plan.updatedAt})`;
  }

  async getPlanById(id: string): Promise<Plan | null> {
    const res = await sql`SELECT * FROM plans WHERE id = ${id}`;
    if (res.length === 0) return null;
    return this.mapPlan(res[0]);
  }

  async getActivePlans(): Promise<Plan[]> {
    const res = await sql`SELECT * FROM plans WHERE is_active = TRUE ORDER BY price ASC`;
    return res.map(this.mapPlan);
  }

  async createSubscription(sub: Subscription): Promise<void> {
    await sql`INSERT INTO subscriptions (id, user_id, plan_id, status, start_date, end_date, payment_order_id, created_at, updated_at)
      VALUES (${sub.id}, ${sub.userId}, ${sub.planId}, ${sub.status}, ${sub.startDate}, ${sub.endDate}, ${sub.paymentOrderId}, ${sub.createdAt}, ${sub.updatedAt})`;
  }

  async getSubscriptionById(id: string): Promise<Subscription | null> {
    const res = await sql`SELECT * FROM subscriptions WHERE id = ${id}`;
    if (res.length === 0) return null;
    return this.mapSubscription(res[0]);
  }

  async getUserActiveSubscription(userId: string): Promise<Subscription | null> {
    // Check for ACTIVE status and end_date in future
    const res = await sql`
      SELECT * FROM subscriptions 
      WHERE user_id = ${userId} 
      AND status = 'ACTIVE' 
      AND end_date > NOW()
      ORDER BY end_date DESC 
      LIMIT 1
    `;
    if (res.length === 0) return null;
    return this.mapSubscription(res[0]);
  }

  async updateSubscriptionStatus(id: string, status: SubscriptionStatus, startDate?: Date, endDate?: Date): Promise<void> {
    if (startDate && endDate) {
      await sql`UPDATE subscriptions SET status = ${status}, start_date = ${startDate}, end_date = ${endDate}, updated_at = NOW() WHERE id = ${id}`;
    } else {
      await sql`UPDATE subscriptions SET status = ${status}, updated_at = NOW() WHERE id = ${id}`;
    }
  }

  async getSubscriptionByPaymentOrderId(paymentOrderId: string): Promise<Subscription | null> {
    const res = await sql`SELECT * FROM subscriptions WHERE payment_order_id = ${paymentOrderId}`;
    if (res.length === 0) return null;
    return this.mapSubscription(res[0]);
  }

  private mapPlan(row: any): Plan {
    return new Plan(
      row.id,
      row.name,
      row.description,
      Number(row.price),
      row.currency,
      row.duration_days,
      row.is_active,
      row.created_at,
      row.updated_at
    );
  }

  private mapSubscription(row: any): Subscription {
    return new Subscription(
      row.id,
      row.user_id,
      row.plan_id,
      row.status as SubscriptionStatus,
      row.start_date,
      row.end_date,
      row.payment_order_id,
      row.created_at,
      row.updated_at
    );
  }
}
