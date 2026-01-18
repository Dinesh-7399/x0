// tests/unit/domain/RefreshToken.test.ts
// Unit tests for RefreshToken entity

import { describe, it, expect } from 'bun:test';
import { RefreshToken } from '../../../src/domain/entities/RefreshToken.js';

describe('RefreshToken Entity', () => {
  describe('create', () => {
    it('should create a token with valid data', () => {
      const token = RefreshToken.create('user-123', 3600);

      expect(token.userId).toBe('user-123');
      expect(token.token).toBeDefined();
      expect(token.token.length).toBeGreaterThan(20);
      expect(token.expiresAt).toBeDefined();
      expect(token.revoked).toBe(false);
    });

    it('should include metadata when provided', () => {
      const token = RefreshToken.create('user-123', 3600, {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(token.ipAddress).toBe('192.168.1.1');
      expect(token.userAgent).toBe('Mozilla/5.0');
    });
  });

  describe('isValid', () => {
    it('should be valid for fresh token', () => {
      const token = RefreshToken.create('user-123', 3600);
      const validation = token.isValid();

      expect(validation.valid).toBe(true);
    });

    it('should be invalid when revoked', () => {
      const token = RefreshToken.create('user-123', 3600);
      token.revoke();

      const validation = token.isValid();
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('revoked');
    });

    it('should be invalid when expired', () => {
      const token = RefreshToken.create('user-123', -1); // Negative expiry = already expired

      const validation = token.isValid();
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('expired');
    });
  });

  describe('revoke', () => {
    it('should mark token as revoked', () => {
      const token = RefreshToken.create('user-123', 3600);
      expect(token.revoked).toBe(false);

      token.revoke();
      expect(token.revoked).toBe(true);
    });
  });

  describe('token generation', () => {
    it('should generate unique tokens', () => {
      const token1 = RefreshToken.create('user-123', 3600);
      const token2 = RefreshToken.create('user-123', 3600);

      expect(token1.token).not.toBe(token2.token);
    });
  });
});
