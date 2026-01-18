import { PaymentOrder, Transaction } from '../../domain/entities/index.js';

export interface IPaymentRepository {
  createOrder(order: PaymentOrder): Promise<void>;
  getOrderById(id: string): Promise<PaymentOrder | null>;
  getOrderByGatewayId(gatewayOrderId: string): Promise<PaymentOrder | null>;
  updateOrderStatus(id: string, status: PaymentOrder['status']): Promise<void>;

  createTransaction(transaction: Transaction): Promise<void>;
  getTransactionByPaymentId(gatewayPaymentId: string): Promise<Transaction | null>;
}

export interface IPaymentGateway {
  createOrder(amount: number, currency: string, receipt: string, notes?: Record<string, any>): Promise<{ id: string; currency: string; amount: number }>;
  verifySignature(orderId: string, paymentId: string, signature: string): boolean;
  verifyWebhookSignature(body: string, signature: string, secret: string): boolean;
  fetchPaymentDetails(paymentId: string): Promise<{ method: string; status: string; fee?: number; tax?: number }>;
}
