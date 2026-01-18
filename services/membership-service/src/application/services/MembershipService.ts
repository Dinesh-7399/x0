import { IMembershipRepository } from '../../application/interfaces/index.js';
import { Subscription } from '../../domain/entities/index.js';
import { v4 as uuidv4 } from 'uuid';

interface CreateSubscriptionRequest {
  userId: string;
  planId: string;
}

export class MembershipService {
  constructor(private repo: IMembershipRepository) { }

  async createSubscriptionIntent(req: CreateSubscriptionRequest) {
    const { userId, planId } = req;

    // 1. Get Plan
    const plan = await this.repo.getPlanById(planId);
    if (!plan || !plan.isActive) {
      throw new Error('Plan not found or inactive');
    }

    // 2. Check existing active subscription
    const existing = await this.repo.getUserActiveSubscription(userId);
    if (existing) {
      throw new Error('User already has an active subscription');
    }

    // 3. Create Pending Subscription
    const subscriptionId = uuidv4();
    const subscription = new Subscription(
      subscriptionId,
      userId,
      plan.id,
      'PENDING',
      null,
      null,
      null,
      new Date(),
      new Date()
    );

    await this.repo.createSubscription(subscription);

    return {
      subscriptionId,
      plan
    };
  }

  async activateSubscription(subscriptionId: string, paymentOrderId: string) {
    const sub = await this.repo.getSubscriptionById(subscriptionId);
    if (!sub) return;

    const plan = await this.repo.getPlanById(sub.planId);
    if (!plan) return;

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + plan.durationDays);

    // Update with Dates
    await this.repo.updateSubscriptionStatus(sub.id, 'ACTIVE', startDate, endDate);
    console.log(`[Membership] Activated subscription ${sub.id}`);
  }

  async getUserSubscription(userId: string) {
    return await this.repo.getUserActiveSubscription(userId);
  }
}
