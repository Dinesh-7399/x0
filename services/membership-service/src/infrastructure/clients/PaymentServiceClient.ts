import { getConfig } from '../../config/index.js';

export class PaymentServiceClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = getConfig().paymentServiceUrl;
  }

  async createPaymentOrder(userId: string, amount: number, currency: string, metadata: any, token: string) {
    const res = await fetch(`${this.baseUrl}/payments/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token.startsWith('Bearer') ? token : `Bearer ${token}`
      },
      body: JSON.stringify({
        amount,
        currency,
        metadata
      })
    });

    if (!res.ok) {
      throw new Error(`Payment Service Error: ${res.status} ${await res.text()}`);
    }

    const text = await res.text();
    console.error(`[Membership] Payment Service Response (${res.status}):`, text);
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse Payment Response:', text);
      throw e;
    }
  }
}
