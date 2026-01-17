// src/infrastructure/services/HashService.ts
/**
 * Hash Service
 * 
 * Uses Bun's native password hashing (Argon2id by default).
 */
export class HashService {
  /**
   * Hash a password using Bun's native password API
   */
  async hash(password: string): Promise<string> {
    return Bun.password.hash(password, {
      algorithm: 'bcrypt',
      cost: 12,
    });
  }

  /**
   * Compare plain password with hash
   */
  async compare(password: string, hash: string): Promise<boolean> {
    return Bun.password.verify(password, hash);
  }

  /**
   * Generate a random token (for refresh tokens, reset tokens, etc.)
   */
  generateToken(): string {
    return crypto.randomUUID();
  }

  /**
   * Generate a 6-digit verification code
   */
  generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

// Singleton instance
let hashService: HashService | null = null;

export function getHashService(): HashService {
  if (!hashService) {
    hashService = new HashService();
  }
  return hashService;
}
