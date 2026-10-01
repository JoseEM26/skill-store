import { purgeExpiredRateLimits } from '../src/lib/rate-limit';
import { prisma } from '../src/lib/prisma';

async function main() {
  const maxAgeMs = process.env.RATE_LIMIT_MAX_AGE_MS
    ? parseInt(process.env.RATE_LIMIT_MAX_AGE_MS, 10)
    : 60_000;

  console.log(`🧹 Iniciando purga de registros de rate limit (antigüedad > ${maxAgeMs}ms)...\n`);

  const initialCount = await prisma.rateLimitHit.count();
  const result = await purgeExpiredRateLimits(maxAgeMs);
  const finalCount = await prisma.rateLimitHit.count();

  console.log(`✅ Registros purgados: ${result.deletedCount}`);
  console.log(`📊 Registros antes: ${initialCount} | Registros después: ${finalCount}`);
  console.log('\n✨ Purga finalizada correctamente.');

  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('❌ Error ejecutando la purga:', err);
  await prisma.$disconnect();
  process.exit(1);
});
