import { sign } from 'hono/jwt';
import { getConfig } from '../../config/index.js';

export class SocialServiceClient {
  private get baseUrl() {
    return process.env.SOCIAL_SERVICE_URL || 'http://social-service:8080';
  }

  async getFollowers(userId: string): Promise<string[]> {
    try {
      const config = getConfig();
      const token = await sign({ sub: 'feed-service', role: 'service' }, config.jwtSecret);

      // Internal URL
      const url = `${this.baseUrl}/social/users/${userId}/followers`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        console.error(`Failed to fetch followers: ${res.status}`);
        return [];
      }

      const data = await res.json() as any;
      return data.map((f: any) => f.followerId);
    } catch (error) {
      console.error('Error fetching followers:', error);
      return [];
    }
  }
}
