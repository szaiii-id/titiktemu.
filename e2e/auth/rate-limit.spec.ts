import { test, expect, SEED_USERS, uniqueUsername } from '../fixtures/auth';

/**
 * Test Rate Limiting
 *
 * File ini dijalankan dengan env override agar limit rate rendah.
 * Jalankan dengan perintah:
 *
 *   bun run test:e2e:rate-limit
 *
 * atau manual:
 *
 *   AUTH_THROTTLE_LOGIN_TEST_OVERRIDE=5 \
 *   AUTH_THROTTLE_REGISTER_TEST_OVERRIDE=3 \
 *   AUTH_THROTTLE_FORGOT_PASSWORD_TEST_OVERRIDE=3 \
 *   AUTH_THROTTLE_RESET_PASSWORD_TEST_OVERRIDE=5 \
 *   bun run test:e2e -- e2e/auth/rate-limit.spec.ts
 *
 * Jika env override tidak di-set, test ini akan di-skip otomatis
 * agar tidak mengganggu test fungsional.
 */

const LOGIN_LIMIT = Number(process.env.AUTH_THROTTLE_LOGIN_TEST_OVERRIDE ?? 0);
const REGISTER_LIMIT = Number(process.env.AUTH_THROTTLE_REGISTER_TEST_OVERRIDE ?? 0);
const FORGOT_LIMIT = Number(process.env.AUTH_THROTTLE_FORGOT_PASSWORD_TEST_OVERRIDE ?? 0);

test.describe('Rate Limiting — Proteksi Endpoint Auth', () => {
    test.skip(
        LOGIN_LIMIT === 0 || REGISTER_LIMIT === 0 || FORGOT_LIMIT === 0,
        'Rate limit test memerlukan env override. Jalankan dengan `bun run test:e2e:rate-limit`.'
    );

    /*
    |--------------------------------------------------------------------------
    | Helper: Reset Rate Limiter
    |--------------------------------------------------------------------------
    */

    async function resetRateLimiter(
        page: any,
        limiter: string,
        key: string
    ): Promise<void> {
        await page.goto('/');
        const csrfToken = await page.evaluate(() => {
            const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
            return match ? decodeURIComponent(match[1]) : '';
        });

        await page.request.post('/_test/clear-throttle', {
            form: { limiter, key },
            headers: { 'X-XSRF-TOKEN': csrfToken },
        });
    }

    /*
    |--------------------------------------------------------------------------
    | Login Rate Limiting
    |--------------------------------------------------------------------------
    */

    test('login diblokir setelah melebihi limit', async ({ page }) => {
        const testEmail = SEED_USERS.client.email;
        const key = `${testEmail}|127.0.0.1`;

        await resetRateLimiter(page, 'login', key);

        await page.goto('/login');

        // Coba login (limit + 1) kali
        for (let i = 0; i < LOGIN_LIMIT + 1; i++) {
            await page.fill('input#identitas', testEmail);
            await page.fill('input#password', 'password-salah');
            await page.click('button[type="submit"]');
            await page.waitForLoadState('networkidle');
        }

        // Pesan rate limit harus muncul
        await expect(
            page.getByText(/Terlalu banyak percobaan login/i)
        ).toBeVisible({ timeout: 10_000 });
    });

    test('pesan rate limit menyertakan waktu tunggu', async ({ page }) => {
        const testEmail = SEED_USERS.client.email;
        await resetRateLimiter(page, 'login', `${testEmail}|127.0.0.1`);

        await page.goto('/login');

        for (let i = 0; i < LOGIN_LIMIT + 1; i++) {
            await page.fill('input#identitas', testEmail);
            await page.fill('input#password', 'password-salah');
            await page.click('button[type="submit"]');
            await page.waitForLoadState('networkidle');
        }

        const errorText = await page.locator('p.text-pink').first().textContent();
        expect(errorText).toMatch(/(menit|detik)/i);
    });

    /*
    |--------------------------------------------------------------------------
    | Register Rate Limiting
    |--------------------------------------------------------------------------
    */

    test('register diblokir setelah melebihi limit', async ({ page }) => {
        // Reset rate limiter untuk IP 127.0.0.1
        await resetRateLimiter(page, 'register', '127.0.0.1');

        // Gunakan email yang sudah ada di seed agar setiap percobaan
        // gagal dengan validasi "email duplikat" (bukan sukses).
        // Ini menjaga key rate limiter konsisten.
        const duplicateEmail = SEED_USERS.admin.email;

        // Percobaan sebanyak limit + 1
        for (let i = 0; i < REGISTER_LIMIT + 1; i++) {
            await page.goto('/register');
            await page.fill('input#name', `Test Rate ${i}`);
            await page.fill('input#username', uniqueUsername(`rate${i}`));
            await page.fill('input#email', duplicateEmail);
            await page.fill('input#password', 'password123');
            await page.fill('input#password_confirmation', 'password123');
            await page.click('button[type="submit"]');
            await page.waitForLoadState('networkidle');
        }

        // Pesan rate limit harus muncul
        await expect(
            page.getByText(/Terlalu banyak percobaan pendaftaran/i)
        ).toBeVisible({ timeout: 10_000 });
    });

    /*
    |--------------------------------------------------------------------------
    | Forgot Password Rate Limiting
    |--------------------------------------------------------------------------
    */

    test('forgot password diblokir setelah melebihi limit', async ({ page }) => {
        const testEmail = SEED_USERS.client.email;

        await resetRateLimiter(
            page,
            'forgot-password',
            `${testEmail}|127.0.0.1`
        );

        // Percobaan sebanyak limit + 1
        for (let i = 0; i < FORGOT_LIMIT + 1; i++) {
            await page.goto('/forgot-password');
            await page.fill('input#email', testEmail);
            await page.click('button[type="submit"]');
            await page.waitForLoadState('networkidle');
        }

        // Pesan rate limit harus muncul
        await expect(
            page.getByText(/Terlalu banyak permintaan reset password/i)
        ).toBeVisible({ timeout: 10_000 });
    });

    /*
    |--------------------------------------------------------------------------
    | Rate Limiter Isolation
    |--------------------------------------------------------------------------
    */

    test('rate limit login akun A tidak mempengaruhi akun B', async ({ page }) => {
        const emailA = SEED_USERS.client.email;
        const emailB = SEED_USERS.admin.email;

        // Reset rate limiter untuk kedua akun
        await resetRateLimiter(page, 'login', `${emailA}|127.0.0.1`);
        await resetRateLimiter(page, 'login', `${emailB}|127.0.0.1`);

        // Blokir akun A dengan (limit + 1) percobaan gagal
        await page.goto('/login');
        for (let i = 0; i < LOGIN_LIMIT + 1; i++) {
            await page.fill('input#identitas', emailA);
            await page.fill('input#password', 'password-salah');
            await page.click('button[type="submit"]');
            await page.waitForLoadState('networkidle');
        }

        // Konfirmasi akun A diblokir
        await expect(
            page.getByText(/Terlalu banyak percobaan login/i)
        ).toBeVisible({ timeout: 10_000 });

        // ============================================
        // PENTING: Bersihkan state browser sebelum pindah ke akun B.
        // Karena flash `retry_after` dari akun A masih ada di session,
        // tombol submit di halaman login berikutnya akan disabled.
        // ============================================

        // Buat browser context baru agar tidak ada cookie/flash yang bocor
        const newContext = await page.context().browser()!.newContext({
            baseURL: page.context()._options.baseURL,
        });
        const newPage = await newContext.newPage();

        try {
            // Login sebagai akun B — harus berhasil
            await newPage.goto('/login');
            await newPage.fill('input#identitas', emailB);
            await newPage.fill('input#password', SEED_USERS.admin.password);
            await newPage.click('button[type="submit"]');

            await expect(newPage).toHaveURL('/admin/dashboard', {
                timeout: 15_000,
            });
        } finally {
            await newContext.close();
        }
    });
});