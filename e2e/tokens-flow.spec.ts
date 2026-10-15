import { test, expect } from '@playwright/test';
import { getOrCreateE2EUser, loginAsUser, e2ePrisma } from './helpers/auth';
import { TOKEN_PREFIX } from '@/lib/auth/tokens';

test.describe('Crear token de acceso, ver su valor una sola vez, y revocarlo', () => {
  const timestamp = Date.now();
  const tokenLabel = `e2e-test-token-${timestamp}`;
  let testUser: { id: string; username: string };

  test.beforeAll(async () => {
    testUser = await getOrCreateE2EUser('tokens');
    await e2ePrisma.accessToken.deleteMany({
      where: { ownerId: testUser.id },
    });
  });

  test.afterAll(async () => {
    if (testUser?.id) {
      await e2ePrisma.accessToken.deleteMany({
        where: { ownerId: testUser.id },
      });
    }
  });

  test('debe crear un token de acceso, mostrarlo una sola vez en el modal y revocarlo', async ({
    page,
    context,
  }) => {
    // Aceptar confirmación en window.confirm para la revocación
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    // 1. Iniciar sesión como testUser e ingresar a /admin/tokens
    await loginAsUser(context, testUser);
    await page.goto('/admin/tokens');

    // Desplegar formulario si no se encuentra abierto
    const tokenInput = page.locator('#token-label');
    if (!(await tokenInput.isVisible())) {
      await page.getByRole('button', { name: '+ Generar Nuevo Token' }).click();
    }

    // 2. Llenar #token-label con un nombre único, marcar "read", click en "Generar Token"
    await page.locator('#token-label').fill(tokenLabel);

    const readCheckbox = page.locator('label', { hasText: 'read' }).locator('input[type="checkbox"]');
    await readCheckbox.check();

    await page.getByRole('button', { name: 'Generar Token' }).click();

    // 3. Confirmar que se abre el modal con [data-testid="raw-token-input"] visible
    // y que su valor empieza con TOKEN_PREFIX ('ccs_')
    const rawTokenInput = page.getByTestId('raw-token-input');
    await expect(rawTokenInput).toBeVisible();
    await expect(rawTokenInput).toHaveValue(new RegExp(`^${TOKEN_PREFIX}`));
    const rawTokenValue = await rawTokenInput.inputValue();

    // 4. Click en [data-testid="close-token-modal-btn"]
    await page.getByTestId('close-token-modal-btn').click();

    // 5. Confirmar que [data-testid="raw-token-input"] YA NO existe en la página
    // y que el valor crudo no quedó expuesto en ningún otro lado
    await expect(page.getByTestId('raw-token-input')).not.toBeVisible();
    await expect(page.getByText(rawTokenValue)).not.toBeVisible();

    // 6. Confirmar que el nombre del token aparece en la lista
    const tokenHeading = page.getByRole('heading', { level: 4, name: tokenLabel });
    await expect(tokenHeading).toBeVisible();

    // 7. Click en el botón "Revocar Token" de esa fila
    const tokenRow = page.locator('div').filter({
      has: tokenHeading,
      hasText: 'Revocar Token',
    }).last();
    await tokenRow.getByRole('button', { name: 'Revocar Token' }).click();

    // 8. Confirmar que aparece el texto "Revocado el:" en esa fila
    // Final assertion: tras revocar, la fila del token muestra "Revocado el:" con una fecha
    const revokedRow = page.locator('div').filter({
      has: tokenHeading,
      hasText: 'Revocado el:',
    }).last();
    await expect(revokedRow.getByText(/Revocado el:/)).toBeVisible();
  });
});
