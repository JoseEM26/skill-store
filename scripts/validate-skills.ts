import path from 'path';
import { validateAllSkills } from '../src/lib/skills/validation';
import { prisma } from '../src/lib/prisma';
import { compareVersions, sortVersionsDesc } from '../src/lib/skills/semver';

async function main() {
  const skillsDir = path.resolve(process.cwd(), 'skills');
  console.log(`🔍 Validando skills en: ${skillsDir}\n`);

  const summary = validateAllSkills(skillsDir);

  if (summary.total === 0) {
    console.warn('⚠️ No se encontraron skills para validar en el directorio skills/.');
    await prisma.$disconnect();
    process.exit(0);
  }

  let hasErrors = false;

  // Check database for version regressions if database is accessible
  let dbAccessible = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbAccessible = true;
  } catch {
    // Database might not be running in standalone lint mode
    dbAccessible = false;
  }

  for (const result of summary.results) {
    const relPath = result.filePath ? path.relative(process.cwd(), result.filePath) : 'unknown';
    
    if (result.valid && result.skill) {
      const skill = result.skill;
      let versionRegression = false;

      if (dbAccessible) {
        try {
          const existingSkill = await prisma.skill.findFirst({
            where: { slug: skill.slug },
            include: { versions: true },
          });

          if (existingSkill && existingSkill.versions.length > 0) {
            const versionsList = existingSkill.versions.map((v) => v.version);
            const maxVersion = sortVersionsDesc(versionsList)[0];

            if (compareVersions(skill.frontmatter.metadata.version, maxVersion) < 0) {
              versionRegression = true;
              hasErrors = true;
              result.valid = false;
              result.errors = [
                `Regresión de versión: La versión ${skill.frontmatter.metadata.version} es menor que la versión máxima ya registrada (${maxVersion})`,
              ];
            }
          }
        } catch (err: unknown) {
          console.warn(`Aviso al consultar base de datos para ${skill.slug}:`, err);
        }
      }

      if (!versionRegression) {
        console.log(`✅ [VALID] ${skill.slug} (v${skill.frontmatter.metadata.version}) - ${relPath}`);
      } else {
        console.error(`❌ [INVALID] ${relPath}`);
        for (const err of result.errors || []) {
          console.error(`   - ${err}`);
        }
      }
    } else {
      hasErrors = true;
      console.error(`❌ [INVALID] ${relPath}`);
      for (const err of result.errors || []) {
        console.error(`   - ${err}`);
      }
    }
  }

  const validCount = summary.results.filter((r) => r.valid).length;
  const invalidCount = summary.results.filter((r) => !r.valid).length;

  console.log('\n--- Resumen de Validación ---');
  console.log(`Total skills: ${summary.total}`);
  console.log(`Válidas: ${validCount}`);
  console.log(`Inválidas: ${invalidCount}`);

  await prisma.$disconnect();

  if (hasErrors) {
    console.error('\n❌ La validación de skills falló. Corrige los errores antes de continuar.');
    process.exit(1);
  }

  console.log('\n✨ Todas las skills cumplen con la especificación de frontmatter y SemVer.');
  process.exit(0);
}

main().catch(async (err) => {
  console.error('Error inesperado durante la validación:', err);
  await prisma.$disconnect();
  process.exit(1);
});
