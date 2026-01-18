import { IPaymentRepository } from '../../application/interfaces/index.js';
import { PaymentOrder, Transaction } from '../../domain/entities/index.js';
import { query } from './postgres.js';

export class PostgresPaymentRepository implements IPaymentRepository {
  async createOrder(order: PaymentOrder): Promise<void> {
    await query(
      `INSERT INTO payment_orders (id, gateway_order_id, user_id, amount, currency, status, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [order.id, order.gatewayOrderId, order.userId, order.amount, order.currency, order.status, JSON.stringify(order.metadata), order.createdAt]
    );
  }

  async getOrderById(id: string): Promise<PaymentOrder | null> {
    const res = await query(`SELECT * FROM payment_orders WHERE id = $1`, [id]);
    if (res.rows.length === 0) return null;
    return this.mapOrder(res.rows[0]);
  }

  async getOrderByGatewayId(gatewayOrderId: string): Promise<PaymentOrder | null> {
    const res = await query(`SELECT * FROM payment_orders WHERE gateway_order_id = $1`, [gatewayOrderId]);
    if (res.rows.length === 0) return null;
    return this.mapOrder(res.rows[0]);
  }

  async updateOrderStatus(id: string, status: PaymentOrder['status']): Promise<void> {
    await query(`UPDATE payment_orders SET status = $1, updated_at = NOW() WHERE id = $2`, [status, id]);
  }

  async createTransaction(tx: Transaction): Promise<void> {
    await query(
      `INSERT INTO transactions (id, order_id, gateway_payment_id, status, method, amount, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [tx.id, tx.orderId, tx.gatewayPaymentId, tx.status, tx.method, tx.amount, tx.createdAt]
    );
  }

  async getTransactionByPaymentId(gatewayPaymentId: string): Promise<Transaction | null> {
    const res = await query(`SELECT * FROM transactions WHERE gateway_payment_id = $1`, [gatewayPaymentId]);
    if (res.rows.length === 0) return null;
    return this.mapTransaction(res.rows[0]);
  }

  private mapOrder(row: any): PaymentOrder {
    return new PaymentOrder(
      row.id,
      row.gateway_order_id,
      row.user_id,
      row.amount,
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
      row.amount,
      row.created_at
    );
  }
}
