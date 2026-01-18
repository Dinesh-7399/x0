export interface IMembershipRepository {
  // Plans
  createPlan(plan: Plan): Promise<void>;
  getPlanById(id: string): Promise<Plan | null>;
  getActivePlans(): Promise<Plan[]>;

  // Subscriptions
  createSubscription(sub: Subscription): Promise<void>;
  getSubscriptionById(id: string): Promise<Subscription | null>;
  getUserActiveSubscription(userId: string): Promise<Subscription | null>;
  updateSubscriptionStatus(id: string, status: SubscriptionStatus, startDate?: Date, endDate?: Date): Promise<void>;
  getSubscriptionByPaymentOrderId(paymentOrderId: string): Promise<Subscription | null>;
}

import { Plan, Subscription, SubscriptionStatus } from '../../domain/entities/index.js';

export * from '../../domain/entities/index.js'; // Re-export entities
