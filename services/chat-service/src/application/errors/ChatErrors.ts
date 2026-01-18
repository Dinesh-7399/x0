// src/application/errors/ChatErrors.ts

export class ChatError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = 'ChatError';
  }
}

// Conversation Errors
export class ConversationNotFoundError extends ChatError {
  constructor(conversationId?: string) {
    super(
      'CONVERSATION_NOT_FOUND',
      conversationId
        ? `Conversation ${conversationId} not found`
        : 'Conversation not found',
      404
    );
  }
}

export class NotAParticipantError extends ChatError {
  constructor() {
    super('NOT_A_PARTICIPANT', 'You are not a participant in this conversation', 403);
  }
}

export class CannotLeaveAsOwnerError extends ChatError {
  constructor() {
    super('CANNOT_LEAVE_AS_OWNER', 'Owner cannot leave. Transfer ownership first.', 400);
  }
}

export class MaxParticipantsReachedError extends ChatError {
  constructor(max: number) {
    super('MAX_PARTICIPANTS_REACHED', `Maximum of ${max} participants allowed`, 400);
  }
}

export class AlreadyParticipantError extends ChatError {
  constructor() {
    super('ALREADY_PARTICIPANT', 'User is already a participant', 400);
  }
}

// Message Errors
export class MessageNotFoundError extends ChatError {
  constructor(messageId?: string) {
    super(
      'MESSAGE_NOT_FOUND',
      messageId ? `Message ${messageId} not found` : 'Message not found',
      404
    );
  }
}

export class CannotEditMessageError extends ChatError {
  constructor() {
    super('CANNOT_EDIT_MESSAGE', 'You can only edit your own messages', 403);
  }
}

export class CannotDeleteMessageError extends ChatError {
  constructor() {
    super('CANNOT_DELETE_MESSAGE', 'You cannot delete this message', 403);
  }
}

export class MessageTooLongError extends ChatError {
  constructor(maxLength: number) {
    super('MESSAGE_TOO_LONG', `Message exceeds maximum length of ${maxLength} characters`, 400);
  }
}

export class CannotSendMessageError extends ChatError {
  constructor(reason: string) {
    super('CANNOT_SEND_MESSAGE', reason, 403);
  }
}

// Permission Errors
export class InsufficientPermissionsError extends ChatError {
  constructor(action: string) {
    super('INSUFFICIENT_PERMISSIONS', `You don't have permission to ${action}`, 403);
  }
}
