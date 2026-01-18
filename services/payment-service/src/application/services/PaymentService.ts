import { IPaymentRepository, IPaymentGateway } from '../../application/interfaces/index.js';
import { PaymentOrder, Transaction } from '../../domain/entities/index.js';
import { v4 as uuidv4 } from 'uuid'; // Need uuid package or crypto.randomUUID

export class PaymentService {
  constructor(
    private repo: IPaymentRepository,
    private gateway: IPaymentGateway
  ) { }

  async createOrder(userId: string, amount: number, currency: string = 'INR', metadata: any = {}) {
    // 1. Create Gateway Order
    // Use a temp receipt ID. Ideally should be unique.
    const receipt = `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const gatewayOrder = await this.gateway.createOrder(amount, currency, receipt, { ...metadata, userId });

    // 2. Persist Order
    const order = new PaymentOrder(
      uuidv4(), // We generating ID or DB? Migration says gen_random_uuid().
      // If Migration generates, we need to return it.
      // But Repository expects specific ID?
      // Let's generate UUID here for consistency.
      // Need 'uuid' package or use crypto.
      gatewayOrder.id,
      userId,
      amount,
      currency,
      'CREATED',
      metadata,
      new Date(),
      new Date()
    );

    // Wait, createOrder impl in repo passes ID. So we must generate it.
    // I'll assume uuid is available or install it. "bun add uuid @types/uuid".

    await this.repo.createOrder(order);
    return order;
  }

  async verifyPayment(orderId: string, paymentId: string, signature: string) {
    // 1. Verify Signature
    const isValid = this.gateway.verifySignature(orderId, paymentId, signature);
    if (!isValid) throw new Error('Invalid Signature');

    // 2. Update Order Status
    const order = await this.repo.getOrderByGatewayId(orderId);
    if (!order) throw new Error('Order Not Found');

    if (order.status === 'PAID') return { status: 'ALREADY_PAID' };

    // 3. Fetch Payment Details for metadata (method, fees)
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

    await this.repo.createTransaction(tx);
    await this.repo.updateOrderStatus(order.id, 'PAID');

    // TODO: Publish Event 'payment.success'

    return { status: 'SUCCESS', transactionId: tx.id };
  }

  async handleWebhook(body: string, signature: string, secret: string) {
    if (!this.gateway.verifyWebhookSignature(body, signature, secret)) {
      throw new Error('Invalid Webhook Signature');
    }

    const event = JSON.parse(body);

    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;
      const paymentId = payment.id;

      // Idempotency: Check if Transaction exists
      const existingTx = await this.repo.getTransactionByPaymentId(paymentId);
      if (existingTx) {
        console.log(`[PaymentService] Transaction ${paymentId} already processed.`);
        return;
      }

      // Check Order
      const order = await this.repo.getOrderByGatewayId(orderId);
      if (!order) {
        console.error(`[PaymentService] Order ${orderId} not found for payment ${paymentId}`);
        return;
      }

      // Record Transaction
      const tx = new Transaction(
        uuidv4(),
        order.id,
        paymentId,
        'SUCCESS',
        payment.method,
        Number(payment.amount), // Amount is usually in paise
        new Date()
      );

      await this.repo.createTransaction(tx);
      await this.repo.updateOrderStatus(order.id, 'PAID');
      console.log(`[PaymentService] Processed payment.captured for order ${orderId}`);
    }
  }
}

