import { test, expect, SEED_USERS, uniqueUsername } from '../fixtures/auth';

/**
 * Test Rate Limiting
 *
 * File ini dijalankan dengan env override agar limit rate rendah.
 *
 * Jalankan dengan perintah:
 *
 *   bun run test:e2e:rate-limit
 *
 * ATAU manual:
 *
 *   AUTH_THROTTLE_LOGIN_TEST_OVERRIDE=5 \
 *   AUTH_THROTTLE_REGISTER_TEST_OVERRIDE=3 \
 *   AUTH_THROTTLE_FORGOT_PASSWORD_TEST_OVERRIDE=3 \
 *   AUTH_THROTTLE_RESET_PASSWORD_TEST_OVERRIDE=5 \
 *   bun run test:e2e -- e2e/rate-limit/
 *
 * PENTING: Test ini HANYA berjalan jika `AUTH_THROTTLE_*_TEST_OVERRIDE`
 * di-set ke nilai KECIL (misal 5, 3, 3). Jika di-set ke 1000 (default
 * untuk test fungsional), test ini akan di-skip otomatis.
 */

// Nilai ini dibaca dari env. Jika tidak di-set, default ke 0.
// Test akan di-skip jika nilainya 0 ATAU >= 100 (default fungsional).
const LOGIN_LIMIT_RAW = Number(
    process.env.AUTH_THROTTLE_LOGIN_TEST_OVERRIDE ?? 0,
);
const REGISTER_LIMIT_RAW = Number(
    process.env.AUTH_THROTTLE_REGISTER_TEST_OVERRIDE ?? 0,
);
const FORGOT_LIMIT_RAW = Number(
    process.env.AUTH_THROTTLE_FORGOT_PASSWORD_TEST_OVERRIDE ?? 0,
);

// Threshold: jika limit >= 100, berarti kita sedang menjalankan
// test fungsional (default 1000), bukan test rate limiting.
const RATE_LIMIT_THRESHOLD = 100;

const LOGIN_LIMIT = LOGIN_LIMIT_RAW;
const REGISTER_LIMIT = REGISTER_LIMIT_RAW;
const FORGOT_LIMIT = FORGOT_LIMIT_RAW;

const SHOULD_SKIP =
    LOGIN_LIMIT_RAW === 0 ||
    LOGIN_LIMIT_RAW >= RATE_LIMIT_THRESHOLD ||
    REGISTER_LIMIT_RAW === 0 ||
    REGISTER_LIMIT_RAW >= RATE_LIMIT_THRESHOLD ||
    FORGOT_LIMIT_RAW === 0 ||
    FORGOT_LIMIT_RAW >= RATE_LIMIT_THRESHOLD;

test.describe('Rate Limiting — Proteksi Endpoint Auth', () => {
    test.skip(
        SHOULD_SKIP,
        `Rate limit test memerlukan env override KECIL (misal 5, 3, 3). ` +
            `Saat ini: LOGIN=${LOGIN_LIMIT_RAW}, REGISTER=${REGISTER_LIMIT_RAW}, ` +
            `FORGOT=${FORGOT_LIMIT_RAW}. ` +
            `Jalankan dengan: bun run test:e2e:rate-limit`,
    );

    /*
    |--------------------------------------------------------------------------
    | Helper: Reset Rate Limiter
    |--------------------------------------------------------------------------
    */

    /**
     * Reset rate limiter via endpoint `/_test/clear-throttle`.
     *
     * PENTING: `key` harus SAMA dengan yang digunakan oleh
     * `AuthThrottleResponse::resolveKey()`.
     *
     * - login: `strtolower(identitas)|ip`
     * - register: `strtolower(email)|ip`
     * - forgot-password: `strtolower(email)|ip`
     * - reset-password: `strtolower(email)|ip`
     */
    async function resetRateLimiter(
        page: any,
        limiter: string,
        key: string,
    ): Promise<void> {
        await page.goto('/');
        const csrfToken = await page.evaluate(() => {
            const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
            return match ? decodeURIComponent(match[1]) : '';
        });

        const response = await page.request.post('/_test/clear-throttle', {
            form: { limiter, key },
            headers: { 'X-XSRF-TOKEN': csrfToken },
            failOnStatusCode: false,
        });

        if (!response.ok()) {
            throw new Error(
                `Gagal reset rate limiter: ${limiter} | ${key} ` +
                    `(status ${response.status()})`,
            );
        }
    }

    /**
     * Helper: submit form login dan tunggu response selesai.
     */
    async function submitLogin(
        page: any,
        identitas: string,
        password: string,
    ): Promise<void> {
        await page.fill('input#identitas', identitas);
        await page.fill('input#password', password);
        await Promise.all([
            page.waitForResponse(
                (resp: any) =>
                    resp.url().includes('/login') &&
                    resp.request().method() === 'POST',
                { timeout: 10_000 },
            ),
            page.click('button[type="submit"]'),
        ]);
    }

    /**
     * Helper: submit form register dan tunggu response selesai.
     */
    async function submitRegister(
        page: any,
        data: {
            name: string;
            username: string;
            email: string;
            password: string;
        },
    ): Promise<void> {
        await page.fill('input#name', data.name);
        await page.fill('input#username', data.username);
        await page.fill('input#email', data.email);
        await page.fill('input#password', data.password);
        await page.fill('input#password_confirmation', data.password);

        await Promise.all([
            page.waitForResponse(
                (resp: any) =>
                    resp.url().includes('/register') &&
                    resp.request().method() === 'POST',
                { timeout: 10_000 },
            ),
            page.click('button[type="submit"]'),
        ]);
    }

    /**
     * Helper: submit form forgot-password dan tunggu response selesai.
     */
    async function submitForgotPassword(
        page: any,
        email: string,
    ): Promise<void> {
        await page.fill('input#email', email);
        await Promise.all([
            page.waitForResponse(
                (resp: any) =>
                    resp.url().includes('/forgot-password') &&
                    resp.request().method() === 'POST',
                { timeout: 10_000 },
            ),
            page.click('button[type="submit"]'),
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Login Rate Limiting
    |--------------------------------------------------------------------------
    */

    test('login diblokir setelah melebihi limit', async ({ page }) => {
        const testEmail = SEED_USERS.client.email;
        const key = `${testEmail.toLowerCase()}|127.0.0.1`;

        await resetRateLimiter(page, 'login', key);

        await page.goto('/login');

        // Coba login (limit + 1) kali
        for (let i = 0; i < LOGIN_LIMIT + 1; i++) {
            await submitLogin(page, testEmail, 'password-salah');
        }

        // Pesan rate limit harus muncul
        await expect(
            page.getByText(/Terlalu banyak percobaan login/i),
        ).toBeVisible({ timeout: 10_000 });
    });

    test('pesan rate limit menyertakan waktu tunggu', async ({ page }) => {
        const testEmail = SEED_USERS.client.email;
        await resetRateLimiter(
            page,
            'login',
            `${testEmail.toLowerCase()}|127.0.0.1`,
        );

        await page.goto('/login');

        for (let i = 0; i < LOGIN_LIMIT + 1; i++) {
            await submitLogin(page, testEmail, 'password-salah');
        }

        const errorText = await page
            .locator('p.text-pink')
            .first()
            .textContent();
        expect(errorText).toMatch(/(menit|detik)/i);
    });

    /*
    |--------------------------------------------------------------------------
    | Register Rate Limiting
    |--------------------------------------------------------------------------
    */

    test('register diblokir setelah melebihi limit', async ({ page }) => {
        // Gunakan email yang sudah ada di seed agar setiap percobaan
        // gagal dengan validasi "email duplikat" (bukan sukses).
        // Ini menjaga key rate limiter konsisten.
        const duplicateEmail = SEED_USERS.admin.email;
        const key = `${duplicateEmail.toLowerCase()}|127.0.0.1`;

        // Reset rate limiter untuk key yang benar
        await resetRateLimiter(page, 'register', key);

        // Percobaan sebanyak limit + 1
        for (let i = 0; i < REGISTER_LIMIT + 1; i++) {
            await page.goto('/register');
            await submitRegister(page, {
                name: `Test Rate ${i}`,
                username: uniqueUsername(`rate${i}`),
                email: duplicateEmail,
                password: 'password123',
            });
        }

        // Pesan rate limit harus muncul
        await expect(
            page.getByText(/Terlalu banyak percobaan pendaftaran/i),
        ).toBeVisible({ timeout: 10_000 });
    });

    /*
    |--------------------------------------------------------------------------
    | Forgot Password Rate Limiting
    |--------------------------------------------------------------------------
    */

    test('forgot password diblokir setelah melebihi limit', async ({ page }) => {
        const testEmail = SEED_USERS.client.email;
        const key = `${testEmail.toLowerCase()}|127.0.0.1`;

        await resetRateLimiter(page, 'forgot-password', key);

        // Percobaan sebanyak limit + 1
        for (let i = 0; i < FORGOT_LIMIT + 1; i++) {
            await page.goto('/forgot-password');
            await submitForgotPassword(page, testEmail);
        }

        // Pesan rate limit harus muncul
        await expect(
            page.getByText(/Terlalu banyak permintaan reset password/i),
        ).toBeVisible({ timeout: 10_000 });
    });

    /*
    |--------------------------------------------------------------------------
    | Rate Limiter Isolation
    |--------------------------------------------------------------------------
    */

    test('rate limit login akun A tidak mempengaruhi akun B', async ({
        page,
    }) => {
        const emailA = SEED_USERS.client.email;
        const emailB = SEED_USERS.admin.email;

        // Reset rate limiter untuk kedua akun
        await resetRateLimiter(
            page,
            'login',
            `${emailA.toLowerCase()}|127.0.0.1`,
        );
        await resetRateLimiter(
            page,
            'login',
            `${emailB.toLowerCase()}|127.0.0.1`,
        );

        // Blokir akun A dengan (limit + 1) percobaan gagal
        await page.goto('/login');
        for (let i = 0; i < LOGIN_LIMIT + 1; i++) {
            await submitLogin(page, emailA, 'password-salah');
        }

        // Konfirmasi akun A diblokir
        await expect(
            page.getByText(/Terlalu banyak percobaan login/i),
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