// src/infrastructure/services/EncryptionService.ts

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

/**
 * Encryption Service Interface
 */
export interface IEncryptionService {
  encrypt(plaintext: string): Promise<EncryptedData>;
  decrypt(data: EncryptedData): Promise<string>;
}

/**
 * Encrypted Data Structure
 */
export interface EncryptedData {
  ciphertext: string;  // Base64 encoded
  iv: string;          // Base64 encoded (nonce)
  tag: string;         // Base64 encoded (auth tag)
}

/**
 * EncryptionService
 * 
 * AES-256-GCM encryption for sensitive data like TOTP secrets.
 * Uses HKDF-like key derivation from master key.
 */
export class EncryptionService implements IEncryptionService {
  private readonly algorithm = 'aes-256-gcm' as const;
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 12;  // 96 bits for GCM
  private readonly tagLength = 16; // 128 bits
  private readonly masterKey: Buffer;

  constructor(masterKeyHex?: string) {
    const keySource = masterKeyHex || process.env.ENCRYPTION_MASTER_KEY;

    if (!keySource || keySource.length < 32) {
      throw new Error('ENCRYPTION_MASTER_KEY must be at least 32 characters');
    }

    // Derive 256-bit key using SHA-256 (HKDF-like)
    this.masterKey = this.deriveKey(keySource, 'gymato-2fa-encryption');
  }

  /**
   * Encrypt plaintext using AES-256-GCM
   */
  async encrypt(plaintext: string): Promise<EncryptedData> {
    // Generate random IV (nonce)
    const iv = randomBytes(this.ivLength);

    // Create cipher
    const cipher = createCipheriv(this.algorithm, this.masterKey, iv, {
      authTagLength: this.tagLength,
    });

    // Encrypt
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    // Get auth tag
    const tag = cipher.getAuthTag();

    return {
      ciphertext: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
    };
  }

  /**
   * Decrypt ciphertext using AES-256-GCM
   */
  async decrypt(data: EncryptedData): Promise<string> {
    const iv = Buffer.from(data.iv, 'base64');
    const tag = Buffer.from(data.tag, 'base64');
    const ciphertext = Buffer.from(data.ciphertext, 'base64');

    // Create decipher
    const decipher = createDecipheriv(this.algorithm, this.masterKey, iv, {
      authTagLength: this.tagLength,
    });

    // Set auth tag
    decipher.setAuthTag(tag);

    // Decrypt
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }

  /**
   * Derive encryption key using HKDF-like process
   */
  private deriveKey(masterSecret: string, info: string): Buffer {
    // Create salt from info
    const salt = createHash('sha256').update(info).digest();

    // HKDF extract: PRK = HMAC-SHA256(salt, masterSecret)
    const prk = createHash('sha256')
      .update(salt)
      .update(masterSecret)
      .digest();

    // HKDF expand: take first 32 bytes
    const key = createHash('sha256')
      .update(prk)
      .update(info)
      .update(Buffer.from([1]))
      .digest();

    return key.slice(0, this.keyLength);
  }
}

// Singleton instance
let encryptionService: EncryptionService | null = null;

export function getEncryptionService(): EncryptionService {
  if (!encryptionService) {
    encryptionService = new EncryptionService();
  }
  return encryptionService;
}
