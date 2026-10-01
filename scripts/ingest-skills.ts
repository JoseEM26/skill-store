import path from 'path';
import { ingestAllSkills } from '../src/lib/skills/ingest';
import { prisma } from '../src/lib/prisma';

async function main() {
  const skillsDir = path.resolve(process.cwd(), 'skills');
  console.log(`📦 Iniciando ingesta de skills a PostgreSQL desde: ${skillsDir}\n`);

  const ownerUsername = process.env.GITHUB_REPOSITORY_OWNER || process.env.SKILLS_OWNER || 'Aybar-Corp';

  const result = await ingestAllSkills(skillsDir, { ownerUsername });

  console.log('--- Resultados de la Ingesta ---');
  for (const item of result.results) {
    if (item.success) {
      console.log(`✅ [${item.action.toUpperCase()}] ${item.slug} v${item.version} (Skill ID: ${item.skillId})`);
    } else {
      console.error(`❌ [ERROR] ${item.slug}: ${item.error}`);
    }
  }

  console.log('\n--- Resumen Final ---');
  console.log(`Total procesadas: ${result.total}`);
  console.log(`Ingestadas / actualizadas con éxito: ${result.successCount}`);
  console.log(`Fallos: ${result.errorCount}`);

  if (result.errorCount > 0) {
    console.error('\n❌ La ingesta terminó con errores.');
    await prisma.$disconnect();
    process.exit(1);
  }

  // Count total skills in DB
  const totalSkillsInDb = await prisma.skill.count();
  const totalVersionsInDb = await prisma.skillVersion.count();
  console.log(`\n📊 Estado en PostgreSQL: ${totalSkillsInDb} skills, ${totalVersionsInDb} versiones registradas.`);

  console.log('\n✨ Ingesta completada con éxito.');
  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('Error fatal durante la ingesta:', err);
  await prisma.$disconnect();
  process.exit(1);
});
