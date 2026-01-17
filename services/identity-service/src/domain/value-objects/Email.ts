// src/domain/value-objects/Email.ts

/**
 * Email Value Object
 * 
 * Immutable, self-validating email address.
 */

export class Email {
  private static readonly EMAIL_REGEX =
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  private constructor(private readonly value: string) {}

  /**
   * Create Email from string (with validation)
   */
  static create(email: string): Email {
    const normalized = email.toLowerCase().trim();

    if (!normalized) {
      throw new Error('Email cannot be empty');
    }

    if (!Email.EMAIL_REGEX.test(normalized)) {
      throw new Error('Invalid email format');
    }

    if (normalized.length > 255) {
      throw new Error('Email too long (max 255 characters)');
    }

    return new Email(normalized);
  }

  /**
   * Get email value
   */
  getValue(): string {
    return this.value;
  }

  /**
   * Compare with another email
   */
  equals(other: Email): boolean {
    return this.value === other.value;
  }

  /**
   * Convert to string
   */
  toString(): string {
    return this.value;
  }
}