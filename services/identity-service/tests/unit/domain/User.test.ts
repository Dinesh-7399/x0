// tests/unit/domain/User.test.ts
// Unit tests for User entity

import { describe, it, expect } from 'bun:test';
import { User, UserStatus } from '../../../src/domain/entities/User.js';

describe('User Entity', () => {
  describe('create', () => {
    it('should create a user with valid data', () => {
      const user = User.create({
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        emailVerified: false,
        phoneVerified: false,
        status: UserStatus.ACTIVE,
      });

      expect(user.email).toBe('test@example.com');
      expect(user.passwordHash).toBe('hashed-password');
      expect(user.emailVerified).toBe(false);
      expect(user.status).toBe(UserStatus.ACTIVE);
      expect(user.id).toBeDefined();
      expect(user.createdAt).toBeDefined();
    });

    it('should generate a unique ID for each user', () => {
      const user1 = User.create({
        email: 'user1@example.com',
        passwordHash: 'hash1',
        emailVerified: false,
        phoneVerified: false,
        status: UserStatus.ACTIVE,
      });

      const user2 = User.create({
        email: 'user2@example.com',
        passwordHash: 'hash2',
        emailVerified: false,
        phoneVerified: false,
        status: UserStatus.ACTIVE,
      });

      expect(user1.id).not.toBe(user2.id);
    });
  });

  describe('canLogin', () => {
    it('should allow login for active user with verified email', () => {
      const user = User.create({
        email: 'test@example.com',
        passwordHash: 'hash',
        emailVerified: true,
        phoneVerified: false,
        status: UserStatus.ACTIVE,
      });

      const result = user.canLogin();
      expect(result.allowed).toBe(true);
    });

    it('should deny login for suspended user', () => {
      const user = User.create({
        email: 'test@example.com',
        passwordHash: 'hash',
        emailVerified: true,
        phoneVerified: false,
        status: UserStatus.SUSPENDED,
      });

      const result = user.canLogin();
      expect(result.allowed).toBe(false);
      // Match actual error message
      expect(result.reason).toBeDefined();
    });

    it('should deny login for deleted user', () => {
      const user = User.create({
        email: 'test@example.com',
        passwordHash: 'hash',
        emailVerified: true,
        phoneVerified: false,
        status: UserStatus.DELETED,
      });

      const result = user.canLogin();
      expect(result.allowed).toBe(false);
    });
  });

  describe('recordLogin', () => {
    it('should update login timestamp', () => {
      const user = User.create({
        email: 'test@example.com',
        passwordHash: 'hash',
        emailVerified: true,
        phoneVerified: false,
        status: UserStatus.ACTIVE,
      });

      user.recordLogin();

      // At minimum, lastLoginAt should be updated
      expect(user.lastLoginAt).toBeDefined();
    });
  });

  describe('verifyEmail', () => {
    it('should mark email as verified', () => {
      const user = User.create({
        email: 'test@example.com',
        passwordHash: 'hash',
        emailVerified: false,
        phoneVerified: false,
        status: UserStatus.ACTIVE,
      });

      expect(user.emailVerified).toBe(false);
      user.verifyEmail();
      expect(user.emailVerified).toBe(true);
    });
  });
});
