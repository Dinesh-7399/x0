import { Context } from 'hono';
import { MembershipService } from '../../../application/services/MembershipService.js';
import { PaymentServiceClient } from '../../../infrastructure/clients/PaymentServiceClient.js';

export class MembershipController {
  constructor(
    private service: MembershipService,
    private paymentClient: PaymentServiceClient
  ) { }

  async getPlans(c: Context) {
    // TODO: Implement getPlans via Repo
    return c.json({ plans: [] });
  }

  async subscribe(c: Context) {
    const user = c.get('user');
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const body = await c.req.json();
    const { planId } = body;

    if (!planId) return c.json({ error: 'Missing Plan ID' }, 400);

    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'Missing Token' }, 401);

    try {
      const userId = user.sub || user.userId;
      const result = await this.service.createSubscriptionIntent({ userId, planId });

      const paymentOrder: any = await this.paymentClient.createPaymentOrder(
        userId,
        result.plan.price,
        result.plan.currency,
        {
          subscriptionId: result.subscriptionId,
          planId: result.plan.id,
          type: 'MEMBERSHIP'
        },
        authHeader
      );

      return c.json({
        subscriptionId: result.subscriptionId,
        paymentOrderId: paymentOrder.id,
        gatewayOrderId: paymentOrder.gatewayOrderId,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency
      });

    } catch (error) {
      console.error(error);
      return c.json({ error: (error as Error).message }, 400);
    }
  }

  async getMySubscription(c: Context) {
    const user = c.get('user');
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    try {
      const sub = await this.service.getUserSubscription(user.userId || user.sub);
      if (!sub) return c.json({ message: 'No active subscription' });
      return c.json(sub);
    } catch (e) {
      return c.json({ error: 'Error fetching subscription' }, 500);
    }
  }
}
