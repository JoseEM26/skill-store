import { test, expect } from '@playwright/test';
import { getOrCreateE2EUser, loginAsUser } from './helpers/auth';

test.describe('Sesión en el header (login/logout)', () => {
  test('flujo completo de sesión visible en header y acceso a /admin', async ({ page, context }) => {
    // 1. Sin sesión (sin cookie), ir a "/" -> el header debe mostrar el link "Sign in with GitHub" (texto visible), NO debe existir [data-testid="user-menu-trigger"].
    await page.goto('/');
    const signInLink = page.getByRole('link', { name: 'Sign in with GitHub' });
    await expect(signInLink).toBeVisible();
    await expect(page.getByTestId('user-menu-trigger')).toHaveCount(0);

    // 2. Usar getOrCreateE2EUser('auth') + loginAsUser(context, user) para setear una sesión real, luego recargar "/" -> ahora debe existir [data-testid="user-menu-trigger"] (y YA NO debe estar el link "Sign in with GitHub").
    const user = await getOrCreateE2EUser('auth');
    await loginAsUser(context, user);
    await page.goto('/');
    const userMenuTrigger = page.getByTestId('user-menu-trigger');
    await expect(userMenuTrigger).toBeVisible();
    await expect(signInLink).toHaveCount(0);

    // 3. Ir a "/admin" con la sesión activa -> debe cargar el panel (NO redirigir a /api/auth/signin ni a /login).
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin/);
    expect(page.url()).not.toContain('/api/auth/signin');
    expect(page.url()).not.toContain('/login');

    // 4. Hacer click en [data-testid="user-menu-trigger"] -> debe aparecer [data-testid="user-menu-dropdown"] -> click en el botón con texto "Cerrar sesión" (es un <form action={signOutAction}> con un <button type="submit">, hace un POST real de Server Action).
    await userMenuTrigger.click();
    const dropdown = page.getByTestId('user-menu-dropdown');
    await expect(dropdown).toBeVisible();

    const logoutButton = dropdown.getByRole('button', { name: 'Cerrar sesión' });
    await logoutButton.click();

    // 5. Tras el logout, el signOutAction redirige a "/" y vuelve a aparecer el link "Sign in with GitHub".
    await expect(page).toHaveURL('/');
    const signInLinkAfterLogout = page.getByRole('link', { name: 'Sign in with GitHub' });
    await expect(signInLinkAfterLogout).toBeVisible();
    await expect(page.getByTestId('user-menu-trigger')).toHaveCount(0);

    // 6. Ir a "/admin" otra vez -> esta vez SÍ debe redirigir fuera de /admin (a /api/auth/signin o /login), confirmando que la sesión quedó cerrada de verdad.
    await page.goto('/admin');
    await expect(page).toHaveURL(/(\/login|\/api\/auth\/signin)/);
    await expect(page.getByRole('link', { name: 'Sign in with GitHub' })).toBeVisible();
  });
});
