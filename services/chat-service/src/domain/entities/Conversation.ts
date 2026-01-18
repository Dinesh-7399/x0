// src/domain/entities/Conversation.ts

export enum ConversationType {
  DIRECT = 'direct',
  GROUP = 'group',
  TRAINER_CLIENT = 'trainer_client',
  GYM_BROADCAST = 'gym_broadcast',
}

export interface ConversationProps {
  id: string;
  type: ConversationType;
  name?: string;
  avatarUrl?: string;
  createdBy: string;
  gymId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export class Conversation {
  private constructor(public readonly props: ConversationProps) { }

  get id(): string { return this.props.id; }
  get type(): ConversationType { return this.props.type; }
  get name(): string | undefined { return this.props.name; }
  get avatarUrl(): string | undefined { return this.props.avatarUrl; }
  get createdBy(): string { return this.props.createdBy; }
  get gymId(): string | undefined { return this.props.gymId; }
  get metadata(): Record<string, unknown> { return this.props.metadata || {}; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  static create(
    createdBy: string,
    type: ConversationType = ConversationType.DIRECT,
    options?: { name?: string; avatarUrl?: string; gymId?: string; metadata?: Record<string, unknown> }
  ): Conversation {
    return new Conversation({
      id: crypto.randomUUID(),
      type,
      name: options?.name,
      avatarUrl: options?.avatarUrl,
      createdBy,
      gymId: options?.gymId,
      metadata: options?.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static fromPersistence(props: ConversationProps): Conversation {
    return new Conversation(props);
  }

  updateName(name: string): void {
    (this.props as { name: string }).name = name;
    (this.props as { updatedAt: Date }).updatedAt = new Date();
  }

  updateAvatar(avatarUrl: string): void {
    (this.props as { avatarUrl: string }).avatarUrl = avatarUrl;
    (this.props as { updatedAt: Date }).updatedAt = new Date();
  }

  isGroup(): boolean {
    return this.type === ConversationType.GROUP;
  }

  isDirect(): boolean {
    return this.type === ConversationType.DIRECT;
  }

  isGymScoped(): boolean {
    return !!this.gymId;
  }
}
