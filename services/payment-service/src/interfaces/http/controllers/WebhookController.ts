import { Context } from 'hono';
import { PaymentService } from '../../../application/services/PaymentService.js';
import { getConfig } from '../../../config/index.js';

export class WebhookController {
  constructor(private service: PaymentService) { }

  async handleRazorpayWebhook(c: Context) {
    const signature = c.req.header('x-razorpay-signature');
    const body = await c.req.text(); // Raw body needed for signature verification

    if (!signature) {
      return c.json({ error: 'Missing Signature' }, 400);
    }

    try {
      const config = getConfig();
      // Ensure secret exists
      const secret = config.razorpayWebhookSecret;

      if (!secret || secret === 'webhook_secret_placeholder') {
        console.error('CRITICAL: Razorpay Webhook Secret missing or is placeholder');
        return c.json({ error: 'Server Configuration Error' }, 500);
      }

      await this.service.handleWebhook(body, signature, secret);
      return c.json({ status: 'ok' });
    } catch (error) {
      console.error('Webhook Error:', error);
      // Return 400 for signature error, but 200 for logic error to prevent retries? 
      // Razorpay retries on non-2xx.
      // If signature is invalid, 400 is correct.
      return c.json({ error: 'Webhook Processing Failed' }, 400);
    }
  }
}
