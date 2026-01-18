// src/domain/entities/Participant.ts

export enum ParticipantRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  READONLY = 'readonly',
}

export interface ParticipantProps {
  id: string;
  conversationId: string;
  userId: string;
  role: ParticipantRole;
  nickname?: string;
  lastReadAt?: Date;
  mutedUntil?: Date;
  joinedAt: Date;
  leftAt?: Date;
}

export class Participant {
  private constructor(public readonly props: ParticipantProps) { }

  get id(): string { return this.props.id; }
  get conversationId(): string { return this.props.conversationId; }
  get userId(): string { return this.props.userId; }
  get role(): ParticipantRole { return this.props.role; }
  get nickname(): string | undefined { return this.props.nickname; }
  get lastReadAt(): Date | undefined { return this.props.lastReadAt; }
  get mutedUntil(): Date | undefined { return this.props.mutedUntil; }
  get joinedAt(): Date { return this.props.joinedAt; }
  get leftAt(): Date | undefined { return this.props.leftAt; }

  get isActive(): boolean { return !this.props.leftAt; }
  get isMuted(): boolean {
    return !!this.props.mutedUntil && this.props.mutedUntil > new Date();
  }
  get isOwner(): boolean { return this.role === ParticipantRole.OWNER; }
  get isAdmin(): boolean {
    return this.role === ParticipantRole.OWNER || this.role === ParticipantRole.ADMIN;
  }
  get canSendMessages(): boolean {
    return this.isActive && this.role !== ParticipantRole.READONLY;
  }

  static create(
    conversationId: string,
    userId: string,
    role: ParticipantRole = ParticipantRole.MEMBER,
    nickname?: string
  ): Participant {
    return new Participant({
      id: crypto.randomUUID(),
      conversationId,
      userId,
      role,
      nickname,
      joinedAt: new Date(),
    });
  }

  static createOwner(conversationId: string, userId: string): Participant {
    return Participant.create(conversationId, userId, ParticipantRole.OWNER);
  }

  static fromPersistence(props: ParticipantProps): Participant {
    return new Participant(props);
  }

  markAsRead(messageId?: string): void {
    (this.props as { lastReadAt: Date }).lastReadAt = new Date();
  }

  mute(until: Date): void {
    (this.props as { mutedUntil: Date }).mutedUntil = until;
  }

  unmute(): void {
    (this.props as { mutedUntil: undefined }).mutedUntil = undefined;
  }

  leave(): void {
    if (this.isOwner) {
      throw new Error('Owner cannot leave. Transfer ownership first.');
    }
    (this.props as { leftAt: Date }).leftAt = new Date();
  }

  updateRole(newRole: ParticipantRole): void {
    if (this.isOwner && newRole !== ParticipantRole.OWNER) {
      throw new Error('Cannot demote owner directly. Use transferOwnership.');
    }
    (this.props as { role: ParticipantRole }).role = newRole;
  }

  setNickname(nickname: string): void {
    (this.props as { nickname: string }).nickname = nickname;
  }
}
