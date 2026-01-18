import { IPaymentRepository, IPaymentGateway } from '../../application/interfaces/index.js';
import { PaymentOrder, Transaction } from '../../domain/entities/index.js';
import { v4 as uuidv4 } from 'uuid';
import { sql } from '../../infrastructure/database/postgres.js';

export class PaymentService {
  constructor(
    private repo: IPaymentRepository,
    private gateway: IPaymentGateway
  ) { }

  async createOrder(userId: string, amount: number, currency: string = 'INR', metadata: any = {}) {
    // 1. Create Gateway Order
    const receipt = `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const gatewayOrder = await this.gateway.createOrder(amount, currency, receipt, { ...metadata, userId });

    // 2. Persist Order
    const order = new PaymentOrder(
      uuidv4(),
      gatewayOrder.id,
      userId,
      amount,
      currency,
      'CREATED',
      metadata,
      new Date(),
      new Date()
    );

    await this.repo.createOrder(order);
    return order;
  }

  async verifyPayment(orderId: string, paymentId: string, signature: string) {
    // 1. Verify Signature
    const isValid = this.gateway.verifySignature(orderId, paymentId, signature);
    if (!isValid) throw new Error('Invalid Signature');

    // 2. Transactional Update
    return await sql.begin(async (s) => {
      const order = await this.repo.getOrderByGatewayId(orderId, s);
      if (!order) throw new Error('Order Not Found');

      if (order.status === 'PAID') return { status: 'ALREADY_PAID' };

      // 3. Fetch Payment Details
      const details = await this.gateway.fetchPaymentDetails(paymentId);

      // 4. Record Transaction
      const tx = new Transaction(
        uuidv4(),
        order.id,
        paymentId,
        'SUCCESS',
        details.method,
        order.amount,
        new Date()
      );

      await this.repo.createTransaction(tx, s);
      await this.repo.updateOrderStatus(order.id, 'PAID', s);

      return { status: 'SUCCESS', transactionId: tx.id };
    });
  }

  async handleWebhook(body: string, signature: string, secret: string) {
    if (!this.gateway.verifyWebhookSignature(body, signature, secret)) {
      throw new Error('Invalid Webhook Signature');
    }

    let event;
    try {
      event = JSON.parse(body);
    } catch (e) {
      console.error('Webhook JSON Parse Failed:', body);
      throw new Error('Invalid JSON Payload');
    }

    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;
      const paymentId = payment.id;

      await sql.begin(async (s) => {
        // Idempotency
        const existingTx = await this.repo.getTransactionByPaymentId(paymentId, s);
        if (existingTx) {
          console.log(`[PaymentService] Transaction ${paymentId} already processed.`);
          return;
        }

        const order = await this.repo.getOrderByGatewayId(orderId, s);
        if (!order) {
          console.error(`[PaymentService] Order ${orderId} not found`);
          return; // Can't process if order missing
        }

        const tx = new Transaction(
          uuidv4(),
          order.id,
          paymentId,
          'SUCCESS',
          payment.method,
          Number(payment.amount),
          new Date()
        );

        await this.repo.createTransaction(tx, s);
        await this.repo.updateOrderStatus(order.id, 'PAID', s);
        console.log(`[PaymentService] Processed payment.captured for order ${orderId}`);
      });
    }
  }
}
