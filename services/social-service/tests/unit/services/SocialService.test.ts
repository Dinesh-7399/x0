import { describe, it, expect, mock } from "bun:test";
import { SocialService } from "../../src/application/services/SocialService";
import { PostgresSocialRepository } from "../../src/infrastructure/database/PostgresSocialRepository";

describe('SocialService', () => {
  const mockRepo = new PostgresSocialRepository() as any;
  // Mock methods
  mockRepo.createFollow = mock(() => Promise.resolve());
  mockRepo.removeFollow = mock(() => Promise.resolve());
  mockRepo.addInteraction = mock(() => Promise.resolve());
  mockRepo.removeInteraction = mock(() => Promise.resolve());

  const service = new SocialService(mockRepo);

  it('should follow a user', async () => {
    await service.followUser('follower-1', 'target-1');
    expect(mockRepo.createFollow).toHaveBeenCalled();
  });

  it('should not allow self-follow', async () => {
    expect(service.followUser('me', 'me')).rejects.toThrow('Cannot follow self');
  });

  it('should react to a post', async () => {
    await service.reactToEntity('user-1', 'post-1', 'POST', 'LIKE');
    expect(mockRepo.addInteraction).toHaveBeenCalled();
  });
});
