// src/domain/value-objects/Password.ts

/**
 * Password Value Object
 * 
 * Immutable password with validation and hashing.
 * Uses Bun's native password API.
 */

export class Password {
  private static readonly MIN_LENGTH = 8;

  private constructor(private readonly hashedValue: string) { }

  /**
   * Create Password from plain text (will be hashed)
   */
  static async create(plainPassword: string): Promise<Password> {
    // Validate password strength
    Password.validate(plainPassword);

    // Hash the password using Bun's native API
    const hashed = await Bun.password.hash(plainPassword, {
      algorithm: 'bcrypt',
      cost: 12,
    });

    return new Password(hashed);
  }

  /**
   * Reconstitute from hashed value (already hashed)
   */
  static fromHash(hashedValue: string): Password {
    return new Password(hashedValue);
  }

  /**
   * Validate password strength
   */
  private static validate(plainPassword: string): void {
    if (!plainPassword) {
      throw new Error('Password cannot be empty');
    }

    if (plainPassword.length < Password.MIN_LENGTH) {
      throw new Error(`Password must be at least ${Password.MIN_LENGTH} characters`);
    }

    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(plainPassword)) {
      throw new Error('Password must contain at least one uppercase letter');
    }

    // Check for at least one lowercase letter
    if (!/[a-z]/.test(plainPassword)) {
      throw new Error('Password must contain at least one lowercase letter');
    }

    // Check for at least one digit
    if (!/\d/.test(plainPassword)) {
      throw new Error('Password must contain at least one number');
    }

    // Check for at least one special character
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(plainPassword)) {
      throw new Error('Password must contain at least one special character');
    }
  }

  /**
   * Compare plain password with hashed password
   */
  async compare(plainPassword: string): Promise<boolean> {
    return Bun.password.verify(plainPassword, this.hashedValue);
  }

  /**
   * Get hashed value (for persistence)
   */
  getHash(): string {
    return this.hashedValue;
  }
}