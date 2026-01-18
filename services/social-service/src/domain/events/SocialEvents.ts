export interface SocialEvent {
  eventType: string;
  payload: any;
  timestamp: Date;
}

export class FollowEvent implements SocialEvent {
  public readonly eventType = 'social.follow';
  public readonly timestamp = new Date();
  constructor(public payload: {
    followerId: string;
    followingId: string;
    targetType: string;
  }) { }
}

export class UnfollowEvent implements SocialEvent {
  public readonly eventType = 'social.unfollow';
  public readonly timestamp = new Date();
  constructor(public payload: {
    followerId: string;
    followingId: string;
    targetType: string;
  }) { }
}

export class InteractionEvent implements SocialEvent {
  public readonly eventType = 'social.interaction.created';
  public readonly timestamp = new Date();
  constructor(public payload: {
    id: string; // Interaction ID (if available, or generated) - Actually Interaction entity has ID
    userId: string;
    targetId: string;
    targetType: string;
    interactionType: string;
  }) { }
}
