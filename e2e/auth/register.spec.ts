import { test, expect, uniqueEmail, uniqueUsername } from '../fixtures/auth';

test.describe('Register — Alur Registrasi Client', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/register');
    });

    /*
    |--------------------------------------------------------------------------
    | Happy Path — Alur Sukses
    |--------------------------------------------------------------------------
    */

    test('client baru bisa register dan langsung masuk dashboard', async ({ page }) => {
        const email = uniqueEmail('register');
        const username = uniqueUsername('reg');

        await page.fill('input#name', 'Budi Test E2E');
        await page.fill('input#username', username);
        await page.fill('input#email', email);
        await page.fill('input#password', 'password123');
        await page.fill('input#password_confirmation', 'password123');

        await page.click('button[type="submit"]');

        // Setelah register, harus diarahkan ke dashboard client
        await expect(page).toHaveURL('/client/dashboard', { timeout: 15_000 });

        // Verifikasi nama user tampil di dashboard (jika ada)
        // await expect(page.locator('text=Budi Test E2E')).toBeVisible();
    });

    /*
    |--------------------------------------------------------------------------
    | Negative Path — Validasi Form
    |--------------------------------------------------------------------------
    */

    test('gagal register jika email sudah terdaftar', async ({ page }) => {
        // Gunakan email yang sudah ada di seed
        await page.fill('input#name', 'Duplikat');
        await page.fill('input#username', uniqueUsername('dup'));
        await page.fill('input#email', 'client@titiktemu.test');
        await page.fill('input#password', 'password123');
        await page.fill('input#password_confirmation', 'password123');

        await page.click('button[type="submit"]');

        // Tetap di halaman register
        await expect(page).toHaveURL('/register');

        // Pesan error harus muncul di bawah input email
        await expect(page.locator('text=Email ini sudah terdaftar')).toBeVisible();
    });

    test('gagal register jika username sudah dipakai', async ({ page }) => {
        await page.fill('input#name', 'Duplikat');
        await page.fill('input#username', 'admin'); // username yang sudah ada
        await page.fill('input#email', uniqueEmail('user'));
        await page.fill('input#password', 'password123');
        await page.fill('input#password_confirmation', 'password123');

        await page.click('button[type="submit"]');

        await expect(page).toHaveURL('/register');
        await expect(page.locator('text=Username ini sudah digunakan')).toBeVisible();
    });

    test('gagal register jika password kurang dari 8 karakter', async ({ page }) => {
        await page.fill('input#name', 'Budi');
        await page.fill('input#username', uniqueUsername('short'));
        await page.fill('input#email', uniqueEmail('short'));
        await page.fill('input#password', 'short');
        await page.fill('input#password_confirmation', 'short');

        await page.click('button[type="submit"]');

        await expect(page).toHaveURL('/register');
        await expect(page.getByText(/minimal harus 8 karakter/i)).toBeVisible();
    });

    test('gagal register jika konfirmasi password tidak cocok', async ({ page }) => {
        await page.fill('input#name', 'Budi');
        await page.fill('input#username', uniqueUsername('mismatch'));
        await page.fill('input#email', uniqueEmail('mismatch'));
        await page.fill('input#password', 'password123');
        await page.fill('input#password_confirmation', 'password456');

        // Karena passwordMismatch true di frontend, tombol disabled
        // Kita bisa cek tombol disabled atau cek pesan error real-time
        await expect(page.locator('text=Konfirmasi password tidak cocok')).toBeVisible();

        const submitButton = page.locator('button[type="submit"]');
        await expect(submitButton).toBeDisabled();
    });

    test('gagal register jika nama kosong', async ({ page }) => {
        await page.fill('input#username', uniqueUsername('noname'));
        await page.fill('input#email', uniqueEmail('noname'));
        await page.fill('input#password', 'password123');
        await page.fill('input#password_confirmation', 'password123');

        // Browser akan blokir submit karena input required
        // Kita klik dan verifikasi masih di halaman
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/register');
    });

    /*
    |--------------------------------------------------------------------------
    | Error Handling (Level UI)
    |--------------------------------------------------------------------------
    */

    test('error dari server ditampilkan sebagai teks merah di form', async ({ page }) => {
        // Register dengan email yang sudah ada
        await page.fill('input#name', 'Duplikat');
        await page.fill('input#username', uniqueUsername('err'));
        await page.fill('input#email', 'admin@titiktemu.test');
        await page.fill('input#password', 'password123');
        await page.fill('input#password_confirmation', 'password123');

        await page.click('button[type="submit"]');

        // Pesan error harus berwarna merah (text-pink class)
        const errorMessage = page.locator('p.text-pink').first();
        await expect(errorMessage).toBeVisible();

        // Verifikasi warnanya
        const color = await errorMessage.evaluate(
            (el) => getComputedStyle(el).color
        );
        expect(color).not.toBe('rgb(0, 0, 0)');
    });

    /*
    |--------------------------------------------------------------------------
    | UI Interaction — Toggle Password & Strength
    |--------------------------------------------------------------------------
    */

    test('toggle password menampilkan dan menyembunyikan password', async ({ page }) => {
        const passwordInput = page.locator('input#password');
        await expect(passwordInput).toHaveAttribute('type', 'password');

        // Klik toggle pertama (untuk password)
        const toggle = page.getByLabel('Tampilkan password').first();
        await toggle.click();

        await expect(passwordInput).toHaveAttribute('type', 'text');
    });

    test('indikator kekuatan password muncul saat password diisi', async ({ page }) => {
        await page.fill('input#password', 'abc');
        await expect(page.locator('text=Lemah')).toBeVisible();

        await page.fill('input#password', 'Abcdefg1');
        await expect(page.locator('text=Kuat')).toBeVisible();

        await page.fill('input#password', 'Abcdefgh123!');
        await expect(page.locator('text=Sangat Kuat')).toBeVisible();
    });

    /*
    |--------------------------------------------------------------------------
    | Usability & Accessibility (a11y)
    |--------------------------------------------------------------------------
    */

    test('semua input memiliki label yang terasosiasi', async ({ page }) => {
        await expect(page.locator('label[for="name"]')).toBeVisible();
        await expect(page.locator('label[for="username"]')).toBeVisible();
        await expect(page.locator('label[for="email"]')).toBeVisible();
        await expect(page.locator('label[for="password"]')).toBeVisible();
        await expect(page.locator('label[for="password_confirmation"]')).toBeVisible();
    });

    test('tombol toggle password memiliki aria-label', async ({ page }) => {
        const toggle = page.getByLabel('Tampilkan password').first();
        await expect(toggle).toBeVisible();
        await expect(toggle).toHaveAttribute('type', 'button');
    });

    test('user yang sudah login tidak bisa akses halaman register', async ({
        page,
        asClient,
    }) => {
        await asClient();

        // Coba akses /register
        await page.goto('/register');

        // Harus di-redirect ke halaman lain (dashboard atau home)
        await expect(page).not.toHaveURL('/register');
    });
});