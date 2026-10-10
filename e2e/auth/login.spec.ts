import { test, expect, loginViaUI, SEED_USERS, logout } from '../fixtures/auth';

test.describe('Login — Alur Masuk Pengguna', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
    });

    /*
    |--------------------------------------------------------------------------
    | Happy Path — Login Manual
    |--------------------------------------------------------------------------
    */

    test('login dengan email berhasil dan redirect ke dashboard client', async ({ page }) => {
        await page.fill('input#identitas', SEED_USERS.client.email);
        await page.fill('input#password', SEED_USERS.client.password);
        await page.click('button[type="submit"]');

        await expect(page).toHaveURL('/client/dashboard', { timeout: 15_000 });
    });

    test('login dengan username berhasil (dual-login)', async ({ page }) => {
        await page.fill('input#identitas', SEED_USERS.client.username);
        await page.fill('input#password', SEED_USERS.client.password);
        await page.click('button[type="submit"]');

        await expect(page).toHaveURL('/client/dashboard', { timeout: 15_000 });
    });

    test('admin diarahkan ke dashboard admin setelah login', async ({ page }) => {
        await loginViaUI(page, 'admin');
        await expect(page).toHaveURL('/admin/dashboard');
    });

    test('mitra diarahkan ke dashboard mitra setelah login', async ({ page }) => {
        await loginViaUI(page, 'mitra');
        await expect(page).toHaveURL('/mitra/dashboard');
    });

    test('client diarahkan ke dashboard client setelah login', async ({ page }) => {
        await loginViaUI(page, 'client');
        await expect(page).toHaveURL('/client/dashboard');
    });

    /*
    |--------------------------------------------------------------------------
    | Negative Path — Kredensial Salah
    |--------------------------------------------------------------------------
    */

    test('gagal login jika password salah', async ({ page }) => {
        await page.fill('input#identitas', SEED_USERS.client.email);
        await page.fill('input#password', 'password-salah');
        await page.click('button[type="submit"]');

        // Tetap di halaman login
        await expect(page).toHaveURL('/login');

        // Pesan error muncul
        await expect(
            page.getByText(/Kredensial yang diberikan tidak cocok/i)
        ).toBeVisible();
    });

    test('gagal login jika email tidak terdaftar', async ({ page }) => {
        await page.fill('input#identitas', 'tidak-ada@titiktemu.test');
        await page.fill('input#password', 'password123');
        await page.click('button[type="submit"]');

        await expect(page).toHaveURL('/login');
        await expect(
            page.getByText(/Kredensial yang diberikan tidak cocok/i)
        ).toBeVisible();
    });

    test('gagal login jika identitas kosong', async ({ page }) => {
        await page.fill('input#password', 'password123');
        await page.click('button[type="submit"]');

        // Browser blokir karena `required`, tetap di halaman login
        await expect(page).toHaveURL('/login');
    });

    test('gagal login jika password kosong', async ({ page }) => {
        await page.fill('input#identitas', SEED_USERS.client.email);
        await page.click('button[type="submit"]');

        await expect(page).toHaveURL('/login');
    });

    /*
    |--------------------------------------------------------------------------
    | Remember Me
    |--------------------------------------------------------------------------
    */

    test('login dengan remember me membuat sesi tetap aktif', async ({ page }) => {
        await page.fill('input#identitas', SEED_USERS.client.email);
        await page.fill('input#password', SEED_USERS.client.password);
        await page.check('input#remember-me');
        await page.click('button[type="submit"]');

        await expect(page).toHaveURL('/client/dashboard');

        // Cek cookie remember_web_* ada
        const cookies = await page.context().cookies();
        const rememberCookie = cookies.find((c) =>
            c.name.startsWith('remember_')
        );
        expect(rememberCookie).toBeDefined();
        expect(rememberCookie?.value).toBeTruthy();
    });

    test('login tanpa remember me tidak membuat cookie remember', async ({ page }) => {
        await page.fill('input#identitas', SEED_USERS.client.email);
        await page.fill('input#password', SEED_USERS.client.password);
        // Tidak centang remember
        await page.click('button[type="submit"]');

        await expect(page).toHaveURL('/client/dashboard');

        const cookies = await page.context().cookies();
        const rememberCookie = cookies.find((c) =>
            c.name.startsWith('remember_')
        );
        expect(rememberCookie).toBeUndefined();
    });

    /*
    |--------------------------------------------------------------------------
    | Logout
    |--------------------------------------------------------------------------
    */

    test('logout menghapus sesi dan redirect ke landing page', async ({ page, asClient }) => {
        await asClient();

        // Logout
        await logout(page);

        // Setelah logout, akses dashboard harus redirect ke login
        await page.goto('/client/dashboard');
        await expect(page).toHaveURL('/login');
    });

    test('setelah logout, tidak bisa akses dashboard admin', async ({ page, asAdmin }) => {
        await asAdmin();
        await logout(page);

        await page.goto('/admin/dashboard');
        await expect(page).toHaveURL('/login');
    });

    /*
    |--------------------------------------------------------------------------
    | Security — Guest Only
    |--------------------------------------------------------------------------
    */

    test('user yang sudah login tidak bisa akses halaman login', async ({ page, asClient }) => {
        await asClient();

        await page.goto('/login');

        // Harus di-redirect ke dashboard
        await expect(page).not.toHaveURL('/login');
    });

    /*
    |--------------------------------------------------------------------------
    | UI Interaction
    |--------------------------------------------------------------------------
    */

    test('toggle password menampilkan dan menyembunyikan password', async ({ page }) => {
        const passwordInput = page.locator('input#password');
        await expect(passwordInput).toHaveAttribute('type', 'password');

        const toggle = page.getByLabel('Tampilkan password').first();
        await toggle.click();
        await expect(passwordInput).toHaveAttribute('type', 'text');

        await page.getByLabel('Sembunyikan password').first().click();
        await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    /*
    |--------------------------------------------------------------------------
    | Accessibility (a11y)
    |--------------------------------------------------------------------------
    */

    test('semua input memiliki label yang terasosiasi', async ({ page }) => {
        await expect(page.locator('label[for="identitas"]')).toBeVisible();
        await expect(page.locator('label[for="password"]')).toBeVisible();
        await expect(page.locator('label[for="remember-me"]')).toBeVisible();
    });

    test('tombol toggle password memiliki aria-label', async ({ page }) => {
        const toggle = page.getByLabel('Tampilkan password').first();
        await expect(toggle).toBeVisible();
        await expect(toggle).toHaveAttribute('type', 'button');
    });

    /*
    |--------------------------------------------------------------------------
    | Error Handling (Level UI)
    |--------------------------------------------------------------------------
    */

    test('error dari server ditampilkan sebagai teks merah di form', async ({ page }) => {
        await page.fill('input#identitas', SEED_USERS.client.email);
        await page.fill('input#password', 'password-salah');
        await page.click('button[type="submit"]');

        const errorMessage = page.locator('p.text-pink').first();
        await expect(errorMessage).toBeVisible();

        const color = await errorMessage.evaluate(
            (el) => getComputedStyle(el).color
        );
        expect(color).not.toBe('rgb(0, 0, 0)');
    });
});