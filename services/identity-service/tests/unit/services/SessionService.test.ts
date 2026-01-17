// tests/unit/services/SessionService.test.ts
// Unit tests for SessionService

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { SessionService } from '../../../src/application/services/SessionService.js';
import { RefreshToken } from '../../../src/domain/entities/RefreshToken.js';
import { User, UserStatus } from '../../../src/domain/entities/User.js';
import { UserNotFoundError, InvalidRefreshTokenError } from '../../../src/application/errors/AuthErrors.js';

const createMockRefreshTokenRepository = () => ({
  findByUserId: mock(() => Promise.resolve([])),
  update: mock(() => Promise.resolve()),
});

const createMockUserRepository = () => ({
  findById: mock(() => Promise.resolve(null)),
});

describe('SessionService', () => {
  let sessionService: SessionService;
  let refreshTokenRepo: ReturnType<typeof createMockRefreshTokenRepository>;
  let userRepo: ReturnType<typeof createMockUserRepository>;

  const mockUser = User.create({
    email: 'test@example.com',
    passwordHash: 'hash',
    emailVerified: true,
    phoneVerified: false,
    status: UserStatus.ACTIVE,
  });

  beforeEach(() => {
    refreshTokenRepo = createMockRefreshTokenRepository();
    userRepo = createMockUserRepository();
    sessionService = new SessionService(refreshTokenRepo as any, userRepo as any);
  });

  describe('listSessions', () => {
    it('should return empty list when no sessions', async () => {
      userRepo.findById.mockReturnValue(Promise.resolve(mockUser));
      refreshTokenRepo.findByUserId.mockReturnValue(Promise.resolve([]));

      const sessions = await sessionService.listSessions(mockUser.id);

      expect(sessions).toEqual([]);
    });

    it('should return active sessions only', async () => {
      userRepo.findById.mockReturnValue(Promise.resolve(mockUser));

      const activeToken = RefreshToken.create(mockUser.id, 3600);
      const expiredToken = RefreshToken.create(mockUser.id, -1); // Already expired

      refreshTokenRepo.findByUserId.mockReturnValue(
        Promise.resolve([activeToken, expiredToken])
      );

      const sessions = await sessionService.listSessions(mockUser.id);

      // Only active sessions returned
      expect(sessions.length).toBe(1);
      expect(sessions[0].id).toBe(activeToken.id);
    });

    it('should throw UserNotFoundError for invalid user', async () => {
      userRepo.findById.mockReturnValue(Promise.resolve(null));

      await expect(sessionService.listSessions('invalid-id'))
        .rejects.toThrow(UserNotFoundError);
    });

    it('should mark current session correctly', async () => {
      userRepo.findById.mockReturnValue(Promise.resolve(mockUser));

      const token = RefreshToken.create(mockUser.id, 3600);
      refreshTokenRepo.findByUserId.mockReturnValue(Promise.resolve([token]));

      const sessions = await sessionService.listSessions(mockUser.id, token.token);

      expect(sessions[0].isCurrent).toBe(true);
    });
  });

  describe('getSessionCount', () => {
    it('should return correct count of active sessions', async () => {
      const token1 = RefreshToken.create(mockUser.id, 3600);
      const token2 = RefreshToken.create(mockUser.id, 3600);
      refreshTokenRepo.findByUserId.mockReturnValue(Promise.resolve([token1, token2]));

      const count = await sessionService.getSessionCount(mockUser.id);

      expect(count).toBe(2);
    });
  });

  describe('revokeSession', () => {
    it('should revoke a specific session', async () => {
      const token = RefreshToken.create(mockUser.id, 3600);
      refreshTokenRepo.findByUserId.mockReturnValue(Promise.resolve([token]));

      const result = await sessionService.revokeSession(mockUser.id, token.id);

      expect(result.message).toContain('revoked');
      expect(refreshTokenRepo.update).toHaveBeenCalled();
    });

    it('should throw error for non-existent session', async () => {
      refreshTokenRepo.findByUserId.mockReturnValue(Promise.resolve([]));

      await expect(sessionService.revokeSession(mockUser.id, 'invalid-session'))
        .rejects.toThrow(InvalidRefreshTokenError);
    });
  });

  describe('revokeAllSessions', () => {
    it('should revoke all sessions', async () => {
      const tokens = [
        RefreshToken.create(mockUser.id, 3600),
        RefreshToken.create(mockUser.id, 3600),
      ];
      refreshTokenRepo.findByUserId.mockReturnValue(Promise.resolve(tokens));

      const result = await sessionService.revokeAllSessions(mockUser.id);

      expect(result.message).toContain('2');
      expect(refreshTokenRepo.update).toHaveBeenCalledTimes(2);
    });

    it('should keep current session when specified', async () => {
      const currentToken = RefreshToken.create(mockUser.id, 3600);
      const otherToken = RefreshToken.create(mockUser.id, 3600);
      refreshTokenRepo.findByUserId.mockReturnValue(Promise.resolve([currentToken, otherToken]));

      const result = await sessionService.revokeAllSessions(mockUser.id, currentToken.token);

      expect(result.message).toContain('1');
      expect(refreshTokenRepo.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('parseUserAgent', () => {
    it('should detect Chrome on Windows', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0';
      const result = sessionService.parseUserAgent(ua);

      expect(result.browser).toBe('Chrome');
      expect(result.os).toBe('Windows');
      expect(result.device).toBe('Desktop');
    });

    it('should detect Safari on iOS', () => {
      const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6) AppleWebKit/605.1.15 Safari/604.1';
      const result = sessionService.parseUserAgent(ua);

      expect(result.browser).toBe('Safari');
      expect(result.os).toBe('iOS');
      expect(result.device).toBe('Mobile');
    });

    it('should handle undefined user agent', () => {
      const result = sessionService.parseUserAgent(undefined);

      expect(result.browser).toBe('Unknown');
      expect(result.os).toBe('Unknown');
      expect(result.device).toBe('Unknown');
    });
  });
});
