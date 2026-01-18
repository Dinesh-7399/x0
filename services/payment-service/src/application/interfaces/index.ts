import { PaymentOrder, Transaction } from '../../domain/entities/index.js';

export interface IPaymentRepository {
  createOrder(order: PaymentOrder, client?: any): Promise<void>;
  getOrderById(id: string, client?: any): Promise<PaymentOrder | null>;
  getOrderByGatewayId(gatewayOrderId: string, client?: any): Promise<PaymentOrder | null>;
  updateOrderStatus(id: string, status: PaymentOrder['status'], client?: any): Promise<void>;
  createTransaction(tx: Transaction, client?: any): Promise<void>;
  getTransactionByPaymentId(gatewayPaymentId: string, client?: any): Promise<Transaction | null>;
}

export interface IPaymentGateway {
  createOrder(amount: number, currency: string, receipt: string, notes?: Record<string, any>): Promise<{ id: string; currency: string; amount: number }>;
  verifySignature(orderId: string, paymentId: string, signature: string): boolean;
  verifyWebhookSignature(body: string, signature: string, secret: string): boolean;
  fetchPaymentDetails(paymentId: string): Promise<{ method: string; status: string; fee?: number; tax?: number }>;
}
