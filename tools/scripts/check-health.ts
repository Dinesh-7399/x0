import { fetch } from 'bun';

const SERVICES = [
  { name: 'api-gateway', url: 'http://localhost:80/health' },
  { name: 'identity-service', url: 'http://localhost:8081/health' },
  { name: 'user-service', url: 'http://localhost:8082/health' },
  { name: 'gym-service', url: 'http://localhost:8083/health' },
  { name: 'trainer-service', url: 'http://localhost:8085/health' },
  { name: 'chat-service', url: 'http://localhost:8084/health' },
];

async function checkHealth() {
  // Ensure logs dir exists
  const fs = await import('fs');
  const path = await import('path');
  const logDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
  const logFile = path.join(logDir, 'health_check.log');

  const log = (msg: string) => {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
  };

  log(`\n--- Health Check: ${new Date().toISOString()} ---`);
  log('🏥 Checking Ecosystem Health...\n');

  const results = await Promise.all(SERVICES.map(async (service) => {
    try {
      const start = performance.now();
      const res = await fetch(service.url);
      const latency = Math.round(performance.now() - start);

      return {
        name: service.name,
        ok: res.ok,
        status: res.status,
        latency,
      };
    } catch (e) {
      return {
        name: service.name,
        ok: false,
        error: (e as Error).message
      };
    }
  }));

  console.table(results);

  const allHealthy = results.every(r => r.ok);
  if (allHealthy) {
    log('\n✅ All services are HEALTHY');
    process.exit(0);
  } else {
    log('\n❌ Some services are UNHEALTHY or DOWN');
    process.exit(1);
  }
}

checkHealth();
