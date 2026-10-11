import { test, expect, uniqueEmail, uniqueUsername } from '../fixtures/auth';

/**
 * Register — Alur Registrasi Client
 *
 * CATATAN:
 * - Route `/register` menggunakan `auth.throttle:register`.
 * - Throttle ini di-handle oleh `AuthThrottleResponse` dengan key
 *   `strtolower(email)|ip`.
 * - Di testing, `AUTH_THROTTLE_REGISTER_TEST_OVERRIDE` di-set ke 1000
 *   (default) agar test fungsional tidak ter-throttle.
 */

test.describe('Register — Alur Registrasi Client', () => {
    /**
     * Helper: submit form register dan tunggu response.
     */
    async function submitRegister(
        page: any,
        data: {
            name?: string;
            username?: string;
            email?: string;
            password?: string;
            password_confirmation?: string;
        },
    ): Promise<void> {
        if (data.name !== undefined) await page.fill('input#name', data.name);
        if (data.username !== undefined)
            await page.fill('input#username', data.username);
        if (data.email !== undefined)
            await page.fill('input#email', data.email);
        if (data.password !== undefined)
            await page.fill('input#password', data.password);
        if (data.password_confirmation !== undefined)
            await page.fill(
                'input#password_confirmation',
                data.password_confirmation,
            );

        await Promise.all([
            page.waitForResponse(
                (resp: any) =>
                    resp.url().includes('/register') &&
                    resp.request().method() === 'POST',
                { timeout: 15_000 },
            ),
            page.click('button[type="submit"]'),
        ]);
    }

    test.beforeEach(async ({ page }) => {
        await page.goto('/register');
    });

    /*
    |--------------------------------------------------------------------------
    | Happy Path — Alur Sukses
    |--------------------------------------------------------------------------
    */

    test('client baru bisa register dan langsung masuk dashboard', async ({
        page,
    }) => {
        const email = uniqueEmail('register');
        const username = uniqueUsername('reg');

        await submitRegister(page, {
            name: 'Budi Test E2E',
            username,
            email,
            password: 'password123',
            password_confirmation: 'password123',
        });

        // Setelah register, harus diarahkan ke dashboard client
        await expect(page).toHaveURL('/client/dashboard', { timeout: 15_000 });
    });

    /*
    |--------------------------------------------------------------------------
    | Negative Path — Validasi Form
    |--------------------------------------------------------------------------
    */

    test('gagal register jika email sudah terdaftar', async ({ page }) => {
        await submitRegister(page, {
            name: 'Duplikat',
            username: uniqueUsername('dup'),
            email: 'client@titiktemu.test', // Email sudah ada di seed
            password: 'password123',
            password_confirmation: 'password123',
        });

        // Tetap di halaman register
        await expect(page).toHaveURL('/register');

        // Pesan error harus muncul di bawah input email
        await expect(
            page.getByText(/Email ini sudah terdaftar/i),
        ).toBeVisible({ timeout: 10_000 });
    });

    test('gagal register jika username sudah dipakai', async ({ page }) => {
        await submitRegister(page, {
            name: 'Duplikat',
            username: 'admin', // Username sudah ada
            email: uniqueEmail('user'),
            password: 'password123',
            password_confirmation: 'password123',
        });

        await expect(page).toHaveURL('/register');
        await expect(
            page.getByText(/Username ini sudah digunakan/i),
        ).toBeVisible({ timeout: 10_000 });
    });

    test('gagal register jika password kurang dari 8 karakter', async ({
        page,
    }) => {
        await submitRegister(page, {
            name: 'Budi',
            username: uniqueUsername('short'),
            email: uniqueEmail('short'),
            password: 'short',
            password_confirmation: 'short',
        });

        await expect(page).toHaveURL('/register');
        await expect(
            page.getByText(/minimal harus 8 karakter/i),
        ).toBeVisible({ timeout: 10_000 });
    });

    test('gagal register jika konfirmasi password tidak cocok', async ({
        page,
    }) => {
        await page.fill('input#name', 'Budi');
        await page.fill('input#username', uniqueUsername('mismatch'));
        await page.fill('input#email', uniqueEmail('mismatch'));
        await page.fill('input#password', 'password123');
        await page.fill('input#password_confirmation', 'password456');

        // Karena passwordMismatch true di frontend, tombol disabled
        // Kita bisa cek tombol disabled atau cek pesan error real-time
        await expect(
            page.locator('text=Konfirmasi password tidak cocok'),
        ).toBeVisible();

        const submitButton = page.locator('button[type="submit"]');
        await expect(submitButton).toBeDisabled();
    });

    test('gagal register jika nama kosong', async ({ page }) => {
        // Isi field lain, tapi tidak isi nama
        await page.fill('input#username', uniqueUsername('noname'));
        await page.fill('input#email', uniqueEmail('noname'));
        await page.fill('input#password', 'password123');
        await page.fill('input#password_confirmation', 'password123');

        // Browser akan blokir submit karena input required
        await page.click('button[type="submit"]');

        // Tetap di halaman register
        await expect(page).toHaveURL('/register');
    });

    /*
    |--------------------------------------------------------------------------
    | Error Handling (Level UI)
    |--------------------------------------------------------------------------
    */

    test('error dari server ditampilkan sebagai teks merah di form', async ({
        page,
    }) => {
        await submitRegister(page, {
            name: 'Duplikat',
            username: uniqueUsername('err'),
            email: 'admin@titiktemu.test', // Email sudah ada
            password: 'password123',
            password_confirmation: 'password123',
        });

        // Pesan error harus berwarna merah (text-pink class)
        const errorMessage = page.locator('p.text-pink').first();
        await expect(errorMessage).toBeVisible({ timeout: 10_000 });

        // Verifikasi warnanya bukan hitam
        const color = await errorMessage.evaluate(
            (el) => getComputedStyle(el).color,
        );
        expect(color).not.toBe('rgb(0, 0, 0)');
    });

    /*
    |--------------------------------------------------------------------------
    | UI Interaction — Toggle Password & Strength
    |--------------------------------------------------------------------------
    */

    test('toggle password menampilkan dan menyembunyikan password', async ({
        page,
    }) => {
        const passwordInput = page.locator('input#password');
        await expect(passwordInput).toHaveAttribute('type', 'password');

        // Klik toggle pertama (untuk password)
        const toggle = page.getByLabel('Tampilkan password').first();
        await toggle.click();

        await expect(passwordInput).toHaveAttribute('type', 'text');
    });

    test('indikator kekuatan password muncul saat password diisi', async ({
        page,
    }) => {
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
        await expect(
            page.locator('label[for="password_confirmation"]'),
        ).toBeVisible();
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