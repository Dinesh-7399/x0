// src/domain/entities/Message.ts

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  FILE = 'file',
  WORKOUT_SHARE = 'workout_share',
  LOCATION = 'location',
  SYSTEM = 'system',
}

export interface MessageProps {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  content: string;
  mediaUrl?: string;
  replyToId?: string;
  editedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
}

export class Message {
  private constructor(public readonly props: MessageProps) { }

  get id(): string { return this.props.id; }
  get conversationId(): string { return this.props.conversationId; }
  get senderId(): string { return this.props.senderId; }
  get type(): MessageType { return this.props.type; }
  get content(): string { return this.props.content; }
  get mediaUrl(): string | undefined { return this.props.mediaUrl; }
  get replyToId(): string | undefined { return this.props.replyToId; }
  get editedAt(): Date | undefined { return this.props.editedAt; }
  get deletedAt(): Date | undefined { return this.props.deletedAt; }
  get createdAt(): Date { return this.props.createdAt; }

  get isEdited(): boolean { return !!this.props.editedAt; }
  get isDeleted(): boolean { return !!this.props.deletedAt; }
  get isReply(): boolean { return !!this.props.replyToId; }

  static create(
    conversationId: string,
    senderId: string,
    content: string,
    options?: { type?: MessageType; mediaUrl?: string; replyToId?: string }
  ): Message {
    return new Message({
      id: crypto.randomUUID(),
      conversationId,
      senderId,
      type: options?.type || MessageType.TEXT,
      content,
      mediaUrl: options?.mediaUrl,
      replyToId: options?.replyToId,
      createdAt: new Date(),
    });
  }

  static createSystemMessage(conversationId: string, content: string): Message {
    return new Message({
      id: crypto.randomUUID(),
      conversationId,
      senderId: 'system',
      type: MessageType.SYSTEM,
      content,
      createdAt: new Date(),
    });
  }

  static fromPersistence(props: MessageProps): Message {
    return new Message(props);
  }

  edit(newContent: string): void {
    if (this.isDeleted) {
      throw new Error('Cannot edit a deleted message');
    }
    (this.props as { content: string }).content = newContent;
    (this.props as { editedAt: Date }).editedAt = new Date();
  }

  softDelete(): void {
    (this.props as { deletedAt: Date }).deletedAt = new Date();
    (this.props as { content: string }).content = '[Message deleted]';
  }

  canBeEditedBy(userId: string): boolean {
    return this.senderId === userId && !this.isDeleted;
  }

  canBeDeletedBy(userId: string, isConversationAdmin: boolean): boolean {
    return this.senderId === userId || isConversationAdmin;
  }
}
