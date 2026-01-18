import { IPaymentGateway } from '../../application/interfaces/index.js';

export class MockRazorpayGateway implements IPaymentGateway {
  constructor() {
    console.log('⚠️ Using Mock Razorpay Gateway');
  }

  async createOrder(amount: number, currency: string, receipt: string, notes?: Record<string, any>): Promise<{ id: string; currency: string; amount: number }> {
    console.log(`[MockGateway] Creating Order: ${amount} ${currency}`);
    return {
      id: `order_mock_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      currency,
      amount,
    };
  }

  verifySignature(orderId: string, paymentId: string, signature: string): boolean {
    console.log(`[MockGateway] Verifying: ${orderId} / ${paymentId}`);
    return signature === 'mock_signature' || signature === 'valid_signature';
  }

  verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
    console.log(`[MockGateway] Verifying Webhook: Signature=${signature}`);
    return signature === 'mock_webhook_signature';
  }

  async fetchPaymentDetails(paymentId: string): Promise<{ method: string; status: string; fee?: number; tax?: number }> {
    console.log(`[MockGateway] Fetching Details: ${paymentId}`);
    return {
      method: 'card',
      status: 'captured',
      fee: 200, // 2.00 INR
      tax: 36,  // 0.36 INR
    };
  }
}
