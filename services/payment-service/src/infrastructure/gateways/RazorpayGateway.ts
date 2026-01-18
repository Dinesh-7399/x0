import Razorpay from 'razorpay';
import crypto from 'crypto-js';
import { IPaymentGateway } from '../../application/interfaces/index.js';
import { getConfig } from '../../config/index.js';

export class RazorpayGateway implements IPaymentGateway {
  private instance: any; // Razorpay SDK types are not exported as class usually, using any or specific interface if installed

  constructor() {
    const config = getConfig();
    this.instance = new Razorpay({
      key_id: config.razorpayKeyId,
      key_secret: config.razorpayKeySecret,
    });
  }

  async createOrder(amount: number, currency: string, receipt: string, notes?: Record<string, any>): Promise<{ id: string; currency: string; amount: number }> {
    const options = {
      amount, // paise
      currency,
      receipt,
      notes,
    };
    try {
      const order = await this.instance.orders.create(options);
      return {
        id: order.id,
        currency: order.currency,
        amount: Number(order.amount),
      };
    } catch (error) {
      console.error('Razorpay Create Order Error:', error);
      throw new Error('Payment Gateway Error');
    }
  }

  verifySignature(orderId: string, paymentId: string, signature: string): boolean {
    const config = getConfig();
    const generatedSignature = crypto.HmacSHA256(orderId + "|" + paymentId, config.razorpayKeySecret).toString();
    return generatedSignature === signature;
  }

  verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
    const generatedSignature = crypto.HmacSHA256(body, secret).toString();
    return generatedSignature === signature;
  }

  async fetchPaymentDetails(paymentId: string): Promise<{ method: string; status: string; fee?: number; tax?: number }> {
    try {
      const payment = await this.instance.payments.fetch(paymentId);
      return {
        method: payment.method,
        status: payment.status,
        fee: payment.fee,
        tax: payment.tax,
      };
    } catch (error) {
      console.error('Razorpay Fetch Payment Error:', error);
      throw new Error('Failed to fetch payment details');
    }
  }
}
