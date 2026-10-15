import { test, expect } from '@playwright/test';
import { getOrCreateE2EUser, loginAsUser, e2ePrisma } from './helpers/auth';

test.describe('Flujo de grupos de skills (crear grupo y agregar skill)', () => {
  const createdGroupIds: string[] = [];
  const createdSkillIds: string[] = [];
  let testUserId: string | null = null;

  test.afterAll(async () => {
    // Limpieza de datos creados en el test
    if (createdGroupIds.length > 0) {
      await e2ePrisma.skillGroupItem.deleteMany({
        where: { groupId: { in: createdGroupIds } },
      });
      await e2ePrisma.skillGroup.deleteMany({
        where: { id: { in: createdGroupIds } },
      });
    }

    if (createdSkillIds.length > 0) {
      await e2ePrisma.skillGroupItem.deleteMany({
        where: { skillId: { in: createdSkillIds } },
      });
      await e2ePrisma.skill.deleteMany({
        where: { id: { in: createdSkillIds } },
      });
    }

    // Limpieza adicional defensiva por si quedó algún remanente del prefijo e2e
    if (testUserId) {
      const leftoverGroups = await e2ePrisma.skillGroup.findMany({
        where: { ownerId: testUserId, name: { startsWith: 'e2e-grupo-' } },
      });
      if (leftoverGroups.length > 0) {
        const ids = leftoverGroups.map((g) => g.id);
        await e2ePrisma.skillGroupItem.deleteMany({ where: { groupId: { in: ids } } });
        await e2ePrisma.skillGroup.deleteMany({ where: { id: { in: ids } } });
      }

      const leftoverSkills = await e2ePrisma.skill.findMany({
        where: { ownerId: testUserId, slug: { startsWith: 'e2e-group-skill-' } },
      });
      if (leftoverSkills.length > 0) {
        const ids = leftoverSkills.map((s) => s.id);
        await e2ePrisma.skillGroupItem.deleteMany({ where: { skillId: { in: ids } } });
        await e2ePrisma.skill.deleteMany({ where: { id: { in: ids } } });
      }
    }
  });

  test('crear un grupo de skills y agregarle una skill', async ({ page, context }) => {
    // 1. Usar getOrCreateE2EUser('groups') + loginAsUser para sesión real.
    const user = await getOrCreateE2EUser('groups');
    testUserId = user.id;
    await loginAsUser(context, user);

    // 2. Crear, vía Prisma directo (fixture, antes de ir a la página), una skill propia del usuario de prueba.
    const timestamp = Date.now();
    const skillSlug = `e2e-group-skill-${timestamp}`;
    const skillName = `Skill E2E ${timestamp}`;
    const fixtureSkill = await e2ePrisma.skill.create({
      data: {
        slug: skillSlug,
        name: skillName,
        description: 'Skill creada para verificar inclusión en grupo',
        ownerId: user.id,
        isPublic: true,
      },
    });
    createdSkillIds.push(fixtureSkill.id);

    // 3. Ir a "/admin/groups".
    await page.goto('/admin/groups');
    await expect(page.getByRole('heading', { name: 'Mis Grupos de Skills' })).toBeVisible();

    // 4. Click en "+ Crear Nuevo Grupo", llenar el input con un nombre único, click en "Crear Grupo".
    const groupName = `e2e-grupo-${timestamp}`;
    await page.getByRole('button', { name: '+ Crear Nuevo Grupo' }).click();
    await page.getByLabel('Nombre del Grupo').fill(groupName);
    await page.getByRole('button', { name: 'Crear Grupo', exact: true }).click();

    // 5. Confirmar que aparece el nuevo grupo en la lista (buscá el texto del nombre).
    await expect(page.getByText(groupName)).toBeVisible();

    // 6. Consultar la DB con Prisma para obtener el groupId real recién creado.
    const createdGroup = await e2ePrisma.skillGroup.findFirst({
      where: { name: groupName, ownerId: user.id },
    });
    expect(createdGroup).not.toBeNull();
    const groupId = createdGroup!.id;
    createdGroupIds.push(groupId);

    // Verificar que el badge de conteo inicialmente indica "0 skills"
    const countBadge = page.getByTestId(`group-count-badge-${groupId}`);
    await expect(countBadge).toHaveText('0 skills');

    // 7. Marcar el checkbox [data-testid="skill-checkbox-<groupId>-<skillId_de_la_skill_fixture>"].
    const skillCheckbox = page.getByTestId(`skill-checkbox-${groupId}-${fixtureSkill.id}`);
    await expect(skillCheckbox).toBeVisible();
    await skillCheckbox.click();

    // 8. Confirmar que [data-testid="group-count-badge-<groupId>"] ahora muestra "1 skill" (antes mostraba "0 skills").
    await expect(countBadge).toHaveText('1 skill');
    await expect(skillCheckbox).toBeChecked();
  });
});
