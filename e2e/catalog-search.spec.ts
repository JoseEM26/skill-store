import { test, expect } from '@playwright/test';
import { e2ePrisma, getOrCreateE2EUser } from './helpers/auth';

test.describe('Catálogo público - Búsqueda y detalle sin login', () => {
  let testUser: { id: string; username: string };
  let skillName: string;
  let skillSlug: string;
  let skillDesc: string;
  let createdSkillId: string | undefined;
  let createdUserId: string | undefined;

  test.beforeAll(async () => {
    const timestamp = Date.now();
    testUser = await getOrCreateE2EUser(`search-${timestamp}`);
    createdUserId = testUser.id;

    skillName = `e2e-searchable-skill-${timestamp}`;
    skillSlug = `e2e-searchable-skill-${timestamp}`;
    skillDesc = `Fixture de búsqueda E2E ${timestamp}`;

    const skill = await e2ePrisma.skill.create({
      data: {
        name: skillName,
        slug: skillSlug,
        description: skillDesc,
        ownerId: testUser.id,
        isPublic: true,
        isPaused: false,
        isArchived: false,
      },
    });
    createdSkillId = skill.id;
  });

  test.afterAll(async () => {
    if (createdSkillId) {
      await e2ePrisma.skill.deleteMany({ where: { id: createdSkillId } });
    }
    if (createdUserId) {
      await e2ePrisma.user.deleteMany({ where: { id: createdUserId } });
    }
  });

  test('debe permitir buscar una skill pública en el catálogo sin estar logueado y ver su detalle', async ({
    page,
    context,
  }) => {
    // 2. Ir a "/" SIN ninguna cookie de sesión
    await page.goto('/');

    // Asegurar que no hay sesión activa
    const cookies = await context.cookies();
    const sessionCookie = cookies.find((c) => c.name.includes('session-token'));
    expect(sessionCookie).toBeUndefined();

    // 3. Escribir el término de búsqueda en [data-testid="search-input"] y confirmar
    const searchInput = page.getByTestId('search-input');
    await searchInput.fill(skillName);
    await searchInput.press('Enter');

    // Esperar a que la URL refleje la búsqueda
    await expect(page).toHaveURL(new RegExp(`q=${encodeURIComponent(skillName)}`));

    // 4. Confirmar que aparece exactamente un [data-testid="skill-card"] que contiene el nombre de la skill
    const skillCards = page.getByTestId('skill-card');
    await expect(skillCards).toHaveCount(1);
    await expect(skillCards.first()).toContainText(skillName);

    // 5. Click en el link "Ver detalle" de esa card -> debe navegar a "/skills/<owner>/<slug>"
    const detailLink = skillCards.first().getByRole('link', { name: /ver detalle/i });
    await detailLink.click();
    await expect(page).toHaveURL(`/skills/${testUser.username}/${skillSlug}`);

    // 6. En la página de detalle, confirmar que se ve el nombre de la skill y su descripción
    const skillHeading = page.getByRole('heading', { level: 1, name: skillName });
    await expect(skillHeading).toBeVisible();
    await expect(page.getByText(skillDesc)).toBeVisible();

    // Aserción final: la página de detalle muestra el nombre exacto de la skill de fixture
    await expect(skillHeading).toHaveText(skillName);
  });
});
