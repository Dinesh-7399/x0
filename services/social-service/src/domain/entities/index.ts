export type TargetType = 'USER' | 'TRAINER' | 'GYM';

export class Follow {
  constructor(
    public readonly id: string,
    public readonly followerId: string,
    public readonly followingId: string,
    public readonly targetType: TargetType,
    public readonly status: 'PENDING' | 'ACCEPTED' | 'BLOCKED',
    public readonly createdAt: Date
  ) { }

  static create(followerId: string, followingId: string, targetType: TargetType): Follow {
    // Default to ACCEPTED for MVP (unless private logic added later)
    return new Follow('', followerId, followingId, targetType, 'ACCEPTED', new Date());
  }
}

export type InteractionTargetType = 'POST' | 'COMMENT' | 'GYM' | 'WORKOUT';
export type ReactionType = 'LIKE' | 'LOVE' | 'FIRE' | 'MUSCLE';

export class Interaction {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly targetId: string,
    public readonly targetType: InteractionTargetType,
    public readonly type: ReactionType,
    public readonly createdAt: Date
  ) { }
}

export class Comment {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly targetId: string,
    public readonly targetType: 'POST' | 'WORKOUT',
    public readonly content: string,
    public readonly parentId: string | null,
    public readonly mentions: string[],
    public readonly isDeleted: boolean,
    public readonly createdAt: Date
  ) { }
}
