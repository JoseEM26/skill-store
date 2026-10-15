import { test, expect } from '@playwright/test';
import { getOrCreateE2EUser, loginAsUser, e2ePrisma } from './helpers/auth';

test.describe('Crear skill por contenido y verla pública en el catálogo', () => {
  const timestamp = Date.now();
  const skillSlug = `e2e-test-skill-${timestamp}`;
  let testUser: { id: string; username: string };

  test.beforeAll(async () => {
    testUser = await getOrCreateE2EUser('skillcreate');
  });

  test.afterAll(async () => {
    if (testUser?.id) {
      await e2ePrisma.skill.deleteMany({
        where: {
          slug: skillSlug,
          ownerId: testUser.id,
        },
      });
    }
  });

  test('debe crear la skill por contenido markdown y mostrarla pública en el catálogo', async ({
    page,
    context,
  }) => {
    // 1. Iniciar sesión con usuario aislado y acceder a /admin/skills
    await loginAsUser(context, testUser);
    await page.goto('/admin/skills');

    // 2. Abrir formulario y seleccionar pestaña de contenido
    await page.getByRole('button', { name: '+ Registrar Nueva Skill' }).click();
    await page.getByTestId('tab-content').click();

    // 3. Escribir SKILL.md mínimo válido con name y description
    const markdownContent = `---
name: ${skillSlug}
description: Skill de prueba E2E
---

# Test

Contenido de prueba.`;

    await page.getByTestId('skill-content-textarea').fill(markdownContent);

    // 4. Asegurar visibilidad pública y guardar
    const isPublicCheckbox = page.getByTestId('skill-content-isPublic-checkbox');
    if (!(await isPublicCheckbox.isChecked())) {
      await isPublicCheckbox.check();
    }
    await page.getByTestId('save-content-btn').click();

    // 5. Confirmar que la skill aparece en la lista con el badge "Pública"
    const skillItem = page.locator('div').filter({
      has: page.getByText(`(${testUser.username}/${skillSlug})`),
    });
    await expect(skillItem.getByRole('heading', { level: 4, name: skillSlug })).toBeVisible();
    await expect(skillItem.getByTestId('visibility-badge')).toHaveText('Pública');

    // 6. Navegar a la página de detalle pública y confirmar carga sin 404
    await page.goto(`/skills/${testUser.username}/${skillSlug}`);

    // Final assertion: la página de detalle pública muestra el nombre de la skill creada
    const pageHeading = page.getByRole('heading', { level: 1, name: skillSlug });
    await expect(pageHeading).toBeVisible();
  });
});
