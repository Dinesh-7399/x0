export class FeedItem {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly actorId: string,
    public readonly actionType: string,
    public readonly targetId: string,
    public readonly targetType: string,
    public readonly metadata: any,
    public readonly createdAt: Date
  ) { }
}
