export class Plan {
  constructor(
    public id: string,
    public name: string,
    public description: string | null,
    public price: number,
    public currency: string,
    public durationDays: number,
    public isActive: boolean,
    public createdAt: Date,
    public updatedAt: Date
  ) { }
}

export type SubscriptionStatus = 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export class Subscription {
  constructor(
    public id: string,
    public userId: string,
    public planId: string,
    public status: SubscriptionStatus,
    public startDate: Date | null,
    public endDate: Date | null,
    public paymentOrderId: string | null,
    public createdAt: Date,
    public updatedAt: Date
  ) { }
}
