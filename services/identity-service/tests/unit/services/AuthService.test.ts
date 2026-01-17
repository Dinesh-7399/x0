// tests/unit/services/AuthService.test.ts
// Unit tests for AuthService

// Set test environment variables before any imports
process.env.ENCRYPTION_MASTER_KEY = 'test-encryption-key-min-32-chars-required';
process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL = 'redis://localhost:6379';

import { describe, it, expect, beforeEach, mock, spyOn } from 'bun:test';
import { AuthService } from '../../../src/application/services/AuthService.js';
import { User, UserStatus } from '../../../src/domain/entities/User.js';
import { RefreshToken } from '../../../src/domain/entities/RefreshToken.js';
import {
  UserExistsError,
  InvalidCredentialsError,
  UserNotFoundError,
  InvalidRefreshTokenError,
} from '../../../src/application/errors/AuthErrors.js';

// Mock implementations with any type to avoid strict type checking
const createMockUserRepository = () => ({
  findByEmail: mock(() => Promise.resolve(null as any)),
  findById: mock(() => Promise.resolve(null as any)),
  save: mock(() => Promise.resolve()),
  update: mock(() => Promise.resolve()),
});

const createMockRefreshTokenRepository = () => ({
  findByToken: mock(() => Promise.resolve(null as any)),
  findByUserId: mock(() => Promise.resolve([] as any)),
  save: mock(() => Promise.resolve()),
  update: mock(() => Promise.resolve()),
  revokeAllForUser: mock(() => Promise.resolve()),
});

const createMockJwtService = () => ({
  signAccessToken: mock(() => Promise.resolve({ accessToken: 'mock-access-token', expiresIn: 3600 })),
  verifyAccessToken: mock(() => Promise.resolve({ sub: 'user-id', email: 'test@example.com' })),
});

const createMockHashService = () => ({
  hash: mock(() => Promise.resolve('hashed-password')),
  compare: mock((_password: string, _hash: string) => Promise.resolve(true)),
});

const createMockMessageBus = () => ({
  publish: mock(() => Promise.resolve()),
});

describe('AuthService', () => {
  let authService: AuthService;
  let userRepo: ReturnType<typeof createMockUserRepository>;
  let refreshTokenRepo: ReturnType<typeof createMockRefreshTokenRepository>;
  let jwtService: ReturnType<typeof createMockJwtService>;
  let hashService: ReturnType<typeof createMockHashService>;
  let messageBus: ReturnType<typeof createMockMessageBus>;

  beforeEach(() => {
    userRepo = createMockUserRepository();
    refreshTokenRepo = createMockRefreshTokenRepository();
    jwtService = createMockJwtService();
    hashService = createMockHashService();
    messageBus = createMockMessageBus();

    authService = new AuthService(
      userRepo as any,
      refreshTokenRepo as any,
      jwtService as any,
      hashService as any,
      messageBus as any,
    );
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      userRepo.findByEmail.mockReturnValue(Promise.resolve(null));

      const result = await authService.register('test@example.com', 'password123');

      expect(result.user.email).toBe('test@example.com');
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBeDefined();
      expect(userRepo.save).toHaveBeenCalled();
      expect(messageBus.publish).toHaveBeenCalled();
    });

    it('should throw UserExistsError if email already registered', async () => {
      const existingUser = User.create({
        email: 'test@example.com',
        passwordHash: 'hash',
        emailVerified: true,
        phoneVerified: false,
        status: UserStatus.ACTIVE,
      });
      userRepo.findByEmail.mockReturnValue(Promise.resolve(existingUser));

      await expect(authService.register('test@example.com', 'password123'))
        .rejects.toThrow(UserExistsError);
    });

    it('should hash the password before saving', async () => {
      userRepo.findByEmail.mockReturnValue(Promise.resolve(null));

      await authService.register('test@example.com', 'mypassword');

      expect(hashService.hash).toHaveBeenCalledWith('mypassword');
    });
  });

  describe('login', () => {
    const mockUser = User.create({
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      emailVerified: true,
      phoneVerified: false,
      status: UserStatus.ACTIVE,
    });

    it('should login successfully with correct credentials', async () => {
      userRepo.findByEmail.mockReturnValue(Promise.resolve(mockUser));
      hashService.compare.mockReturnValue(Promise.resolve(true));

      const result = await authService.login('test@example.com', 'correct-password');

      expect(result.user.email).toBe('test@example.com');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw InvalidCredentialsError for wrong email', async () => {
      userRepo.findByEmail.mockReturnValue(Promise.resolve(null));

      await expect(authService.login('wrong@example.com', 'password'))
        .rejects.toThrow(InvalidCredentialsError);
    });

    it('should throw InvalidCredentialsError for wrong password', async () => {
      userRepo.findByEmail.mockReturnValue(Promise.resolve(mockUser));
      hashService.compare.mockReturnValue(Promise.resolve(false));

      await expect(authService.login('test@example.com', 'wrong-password'))
        .rejects.toThrow(InvalidCredentialsError);
    });
  });

  describe('refresh', () => {
    it('should refresh token successfully', async () => {
      const mockToken = RefreshToken.create('user-id', 3600);
      const mockUser = User.create({
        email: 'test@example.com',
        passwordHash: 'hash',
        emailVerified: true,
        phoneVerified: false,
        status: UserStatus.ACTIVE,
      });

      refreshTokenRepo.findByToken.mockReturnValue(Promise.resolve(mockToken));
      userRepo.findById.mockReturnValue(Promise.resolve(mockUser));

      const result = await authService.refresh(mockToken.token);

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.expiresIn).toBe(3600);
    });

    it('should throw InvalidRefreshTokenError for invalid token', async () => {
      refreshTokenRepo.findByToken.mockReturnValue(Promise.resolve(null));

      await expect(authService.refresh('invalid-token'))
        .rejects.toThrow(InvalidRefreshTokenError);
    });
  });

  describe('logout', () => {
    it('should revoke refresh token on logout', async () => {
      const mockToken = RefreshToken.create('user-id', 3600);
      refreshTokenRepo.findByToken.mockReturnValue(Promise.resolve(mockToken));

      const result = await authService.logout(mockToken.token);

      expect(result.message).toContain('successfully');
      expect(refreshTokenRepo.update).toHaveBeenCalled();
    });
  });

  describe('getCurrentUser', () => {
    it('should return user DTO for valid user', async () => {
      const mockUser = User.create({
        email: 'test@example.com',
        passwordHash: 'hash',
        emailVerified: true,
        phoneVerified: false,
        status: UserStatus.ACTIVE,
      });
      userRepo.findById.mockReturnValue(Promise.resolve(mockUser));

      const result = await authService.getCurrentUser(mockUser.id);

      expect(result.email).toBe('test@example.com');
      expect(result.emailVerified).toBe(true);
    });

    it('should throw UserNotFoundError for invalid user', async () => {
      userRepo.findById.mockReturnValue(Promise.resolve(null));

      await expect(authService.getCurrentUser('invalid-id'))
        .rejects.toThrow(UserNotFoundError);
    });
  });
});
