// Simple wrapper around messaging package
// In a real scenario, this would initialize the RabbitMQ/Redis connection
// For now, we mock or use a shared instance if available

export async function publish(event: string, data: any): Promise<void> {
  console.log(`[Event Published] ${event}`, data);
  // Implementation would go here, e.g. rabbit.publish(...)
}
