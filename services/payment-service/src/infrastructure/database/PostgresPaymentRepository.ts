import { IPaymentRepository } from '../../application/interfaces/index.js';
import { PaymentOrder, Transaction } from '../../domain/entities/index.js';
import { query, sql } from './postgres.js';

export class PostgresPaymentRepository implements IPaymentRepository {
  async createOrder(order: PaymentOrder, client?: any): Promise<void> {
    const s = client || sql;
    await s`INSERT INTO payment_orders (id, gateway_order_id, user_id, amount, currency, status, metadata, created_at)
       VALUES (${order.id}, ${order.gatewayOrderId}, ${order.userId}, ${order.amount}, ${order.currency}, ${order.status}, ${JSON.stringify(order.metadata)}, ${order.createdAt})`;
  }

  async getOrderById(id: string, client?: any): Promise<PaymentOrder | null> {
    const s = client || sql;
    const res = await s`SELECT * FROM payment_orders WHERE id = ${id}`;
    if (res.length === 0) return null;
    return this.mapOrder(res[0]);
  }

  async getOrderByGatewayId(gatewayOrderId: string, client?: any): Promise<PaymentOrder | null> {
    const s = client || sql;
    const res = await s`SELECT * FROM payment_orders WHERE gateway_order_id = ${gatewayOrderId}`;
    if (res.length === 0) return null;
    return this.mapOrder(res[0]);
  }

  async updateOrderStatus(id: string, status: PaymentOrder['status'], client?: any): Promise<void> {
    const s = client || sql;
    await s`UPDATE payment_orders SET status = ${status}, updated_at = NOW() WHERE id = ${id}`;
  }

  async createTransaction(tx: Transaction, client?: any): Promise<void> {
    const s = client || sql;
    await s`INSERT INTO transactions (id, order_id, gateway_payment_id, status, method, amount, created_at)
       VALUES (${tx.id}, ${tx.orderId}, ${tx.gatewayPaymentId}, ${tx.status}, ${tx.method}, ${tx.amount}, ${tx.createdAt})`;
  }

  async getTransactionByPaymentId(gatewayPaymentId: string, client?: any): Promise<Transaction | null> {
    const s = client || sql;
    const res = await s`SELECT * FROM transactions WHERE gateway_payment_id = ${gatewayPaymentId}`;
    if (res.length === 0) return null;
    return this.mapTransaction(res[0]);
  }

  private mapOrder(row: any): PaymentOrder {
    return new PaymentOrder(
      row.id,
      row.gateway_order_id,
      row.user_id,
      Number(row.amount),
      row.currency,
      row.status,
      row.metadata,
      row.created_at,
      row.updated_at
    );
  }

  private mapTransaction(row: any): Transaction {
    return new Transaction(
      row.id,
      row.order_id,
      row.gateway_payment_id,
      row.status,
      row.method,
      Number(row.amount),
      row.created_at
    );
  }
}
