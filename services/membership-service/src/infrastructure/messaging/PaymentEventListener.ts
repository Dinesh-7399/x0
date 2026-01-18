import { Redis } from 'ioredis';
import { getConfig } from '../../config/index.js';
import { MembershipService } from '../../application/services/MembershipService.js';

export class PaymentEventListener {
  private redis: Redis;

  constructor(private service: MembershipService) {
    const config = getConfig();
    this.redis = new Redis(config.redisUrl);
    this.startConsumer();
  }

  async startConsumer() {
    const streamKey = 'payment-events';
    const groupName = 'membership-group';
    const consumerName = `membership-consumer-${process.pid}`;

    try {
      await this.redis.xgroup('CREATE', streamKey, groupName, '$', 'MKSTREAM');
    } catch (e: any) {
      if (!e.message.includes('BUSYGROUP')) {
        console.error('Redis XGROUP Error:', e);
      }
    }

    console.log(`[PaymentEventListener] Listening to ${streamKey}...`);

    while (true) {
      try {
        const results = await this.redis.call(
          'XREADGROUP',
          'GROUP', groupName, consumerName,
          'BLOCK', '5000',
          'COUNT', '1',
          'STREAMS', streamKey, '>'
        ) as any;

        if (results) {
          // XREADGROUP returns [ [stream, messages] ]
          // message = [id, fields]
          for (const [stream, messages] of results) {
            for (const [id, fields] of messages) {
              await this.processMessage(JSON.parse(fields[1]));
              await this.redis.xack(streamKey, groupName, id);
            }
          }
        }
      } catch (error) {
        console.error('Error processing payment event:', error);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  async processMessage(message: any) {
    if (message.event === 'payment.success') {
      const metadata = message.data.metadata;
      // Check if this payment is for membership
      if (metadata && metadata.type === 'MEMBERSHIP' && metadata.subscriptionId) {
        console.log(`[PaymentEventListener] Payment Success for Subscription: ${metadata.subscriptionId}`);
        await this.service.activateSubscription(metadata.subscriptionId, message.data.orderId);
      }
    }
  }
}
