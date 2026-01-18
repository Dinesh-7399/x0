import { Context } from 'hono';
import { PaymentService } from '../../../application/services/PaymentService.js';

export class PaymentController {
  constructor(private service: PaymentService) { }

  async createOrder(c: Context) {
    const user = c.get('user');
    if (!user || (!user.userId && !user.sub)) {
      console.error('Unauthorized: Invalid User Context', user);
      return c.json({ error: 'Unauthorized', message: 'Invalid User Context' }, 401);
    }

    const body = await c.req.json();

    // Validation
    if (!body.amount || !Number.isFinite(Number(body.amount)) || Number(body.amount) <= 0) {
      return c.json({ error: 'Invalid Amount' }, 400);
    }

    try {
      console.log('PaymentController: Creating order for user:', user.userId || user.sub);
      const order = await this.service.createOrder(
        user.userId || user.sub, // Handle different JWT structures
        body.amount,
        body.currency || 'INR',
        body.metadata
      );
      console.log('PaymentController: Order created:', order);
      return c.json(order);
    } catch (error) {
      console.error('PaymentController: Error creating order:', error);
      return c.json({ error: 'Payment Order Creation Failed' }, 500);
    }
  }

  async verifyPayment(c: Context) {
    const body = await c.req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return c.json({ error: 'Missing payment details' }, 400);
    }

    try {
      const result = await this.service.verifyPayment(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      );
      return c.json(result);
    } catch (error) {
      console.error(error);
      return c.json({ error: 'Verification Failed', message: (error as Error).message }, 400);
    }
  }
}
