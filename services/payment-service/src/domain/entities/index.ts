export class PaymentOrder {
  constructor(
    public id: string,
    public gatewayOrderId: string,
    public userId: string,
    public amount: number,
    public currency: string,
    public status: 'CREATED' | 'ATTEMPTED' | 'PAID' | 'FAILED',
    public metadata: Record<string, any>,
    public createdAt: Date,
    public updatedAt: Date
  ) { }
}

export class Transaction {
  constructor(
    public id: string,
    public orderId: string,
    public gatewayPaymentId: string,
    public status: 'SUCCESS' | 'FAILED',
    public method: string | null,
    public amount: number,
    public createdAt: Date
  ) { }
}
