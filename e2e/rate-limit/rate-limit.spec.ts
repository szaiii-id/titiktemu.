import { test, expect, SEED_USERS, uniqueUsername } from '../fixtures/auth';
import { APP_URL } from '../config';

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

// ==========================================
// DEBUG MODE
// ==========================================
/**
 * DEBUG=true → aktifkan log verbose.
 *
 * Contoh pemakaian:
 *   DEBUG=1 bun run test:e2e:rate-limit
 */
const DEBUG = process.env.DEBUG === '1' || process.env.DEBUG === 'true';

function debugLog(...args: any[]): void {
    if (DEBUG) {
        console.log('[DEBUG]', ...args);
    }
}

// ==========================================
// BACA ENV OVERRIDE
// ==========================================
const LOGIN_LIMIT_RAW = Number(
    process.env.AUTH_THROTTLE_LOGIN_TEST_OVERRIDE ?? 0,
);
const REGISTER_LIMIT_RAW = Number(
    process.env.AUTH_THROTTLE_REGISTER_TEST_OVERRIDE ?? 0,
);
const FORGOT_LIMIT_RAW = Number(
    process.env.AUTH_THROTTLE_FORGOT_PASSWORD_TEST_OVERRIDE ?? 0,
);
const RESET_LIMIT_RAW = Number(
    process.env.AUTH_THROTTLE_RESET_PASSWORD_TEST_OVERRIDE ?? 0,
);

// Threshold: jika limit >= 100, berarti kita sedang menjalankan
// test fungsional (default 1000), bukan test rate limiting.
const RATE_LIMIT_THRESHOLD = 100;

const LOGIN_LIMIT = LOGIN_LIMIT_RAW;
const REGISTER_LIMIT = REGISTER_LIMIT_RAW;
const FORGOT_LIMIT = FORGOT_LIMIT_RAW;
const RESET_LIMIT = RESET_LIMIT_RAW;

const SHOULD_SKIP =
    LOGIN_LIMIT_RAW === 0 ||
    LOGIN_LIMIT_RAW >= RATE_LIMIT_THRESHOLD ||
    REGISTER_LIMIT_RAW === 0 ||
    REGISTER_LIMIT_RAW >= RATE_LIMIT_THRESHOLD ||
    FORGOT_LIMIT_RAW === 0 ||
    FORGOT_LIMIT_RAW >= RATE_LIMIT_THRESHOLD ||
    RESET_LIMIT_RAW === 0 ||
    RESET_LIMIT_RAW >= RATE_LIMIT_THRESHOLD;

// ==========================================
// DEBUG: Log config saat startup
// ==========================================
if (DEBUG) {
    console.log('\n[DEBUG] ======================================');
    console.log('[DEBUG] Rate Limit Config:');
    console.log(`[DEBUG]   LOGIN    = ${LOGIN_LIMIT_RAW}`);
    console.log(`[DEBUG]   REGISTER = ${REGISTER_LIMIT_RAW}`);
    console.log(`[DEBUG]   FORGOT   = ${FORGOT_LIMIT_RAW}`);
    console.log(`[DEBUG]   RESET    = ${RESET_LIMIT_RAW}`);
    console.log(`[DEBUG]   SHOULD_SKIP = ${SHOULD_SKIP}`);
    console.log(`[DEBUG]   APP_URL  = ${APP_URL}`);
    console.log('[DEBUG] ======================================\n');
}

// ==========================================
// TEST SUITE
// ==========================================
test.describe('Rate Limiting — Proteksi Endpoint Auth', () => {
    test.skip(
        SHOULD_SKIP,
        `Rate limit test memerlukan env override KECIL (misal 5, 3, 3, 5). ` +
            `Saat ini: LOGIN=${LOGIN_LIMIT_RAW}, REGISTER=${REGISTER_LIMIT_RAW}, ` +
            `FORGOT=${FORGOT_LIMIT_RAW}, RESET=${RESET_LIMIT_RAW}. ` +
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
        debugLog(`resetRateLimiter: limiter=${limiter}, key=${key}`);

        await page.goto('/');
        const csrfToken = await page.evaluate(() => {
            const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
            return match ? decodeURIComponent(match[1]) : '';
        });

        debugLog(`CSRF token: ${csrfToken ? '✓ didapat' : '✗ kosong'}`);

        const response = await page.request.post('/_test/clear-throttle', {
            form: { limiter, key },
            headers: { 'X-XSRF-TOKEN': csrfToken },
            failOnStatusCode: false,
        });

        debugLog(`Response status: ${response.status()}`);

        if (!response.ok()) {
            const body = await response.text().catch(() => '(no body)');
            debugLog(`Response body: ${body}`);
            throw new Error(
                `Gagal reset rate limiter: ${limiter} | ${key} ` +
                    `(status ${response.status()})`,
            );
        }

        debugLog(`✓ Rate limiter ${limiter} berhasil di-reset`);
    }

    /**
     * Helper: submit form login dan tunggu response selesai.
     */
    async function submitLogin(
        page: any,
        identitas: string,
        password: string,
        iteration?: number,
    ): Promise<void> {
        const label = iteration !== undefined ? `[iter ${iteration}]` : '';
        debugLog(`${label} submitLogin: ${identitas}`);

        await page.fill('input#identitas', identitas);
        await page.fill('input#password', password);

        const response = await Promise.all([
            page.waitForResponse(
                (resp: any) =>
                    resp.url().includes('/login') &&
                    resp.request().method() === 'POST',
                { timeout: 10_000 },
            ),
            page.click('button[type="submit"]'),
        ]);

        const resp = response[0];
        debugLog(`${label} Login response status: ${resp.status()}`);
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
        iteration?: number,
    ): Promise<void> {
        const label = iteration !== undefined ? `[iter ${iteration}]` : '';
        debugLog(`${label} submitRegister: ${data.email}`);

        await page.fill('input#name', data.name);
        await page.fill('input#username', data.username);
        await page.fill('input#email', data.email);
        await page.fill('input#password', data.password);
        await page.fill('input#password_confirmation', data.password);

        const response = await Promise.all([
            page.waitForResponse(
                (resp: any) =>
                    resp.url().includes('/register') &&
                    resp.request().method() === 'POST',
                { timeout: 10_000 },
            ),
            page.click('button[type="submit"]'),
        ]);

        const resp = response[0];
        debugLog(`${label} Register response status: ${resp.status()}`);
    }

    /**
     * Helper: submit form forgot-password dan tunggu response selesai.
     */
    async function submitForgotPassword(
        page: any,
        email: string,
        iteration?: number,
    ): Promise<void> {
        const label = iteration !== undefined ? `[iter ${iteration}]` : '';
        debugLog(`${label} submitForgotPassword: ${email}`);

        await page.fill('input#email', email);

        const response = await Promise.all([
            page.waitForResponse(
                (resp: any) =>
                    resp.url().includes('/forgot-password') &&
                    resp.request().method() === 'POST',
                { timeout: 10_000 },
            ),
            page.click('button[type="submit"]'),
        ]);

        const resp = response[0];
        debugLog(`${label} Forgot-password response status: ${resp.status()}`);
    }

    /**
     * Helper: submit form reset-password dan tunggu response selesai.
     */
    async function submitResetPassword(
        page: any,
        data: {
            token: string;
            email: string;
            password: string;
        },
        iteration?: number,
    ): Promise<void> {
        const label = iteration !== undefined ? `[iter ${iteration}]` : '';
        debugLog(`${label} submitResetPassword: token=${data.token}`);

        await page.goto(
            `/reset-password/${data.token}?email=${encodeURIComponent(data.email)}`,
        );

        await page.fill('input#password', data.password);
        await page.fill('input#password_confirmation', data.password);

        const response = await Promise.all([
            page.waitForResponse(
                (resp: any) =>
                    resp.url().includes('/reset-password') &&
                    resp.request().method() === 'POST',
                { timeout: 10_000 },
            ),
            page.click('button[type="submit"]'),
        ]);

        const resp = response[0];
        debugLog(`${label} Reset-password response status: ${resp.status()}`);
        debugLog(`${label} Reset-password redirect: ${resp.headers()['location']}`);
    }

    /*
    |--------------------------------------------------------------------------
    | Login Rate Limiting
    |--------------------------------------------------------------------------
    */

    test('login diblokir setelah melebihi limit', async ({ page }) => {
        const testEmail = SEED_USERS.client.email;
        const key = `${testEmail.toLowerCase()}|127.0.0.1`;

        debugLog(`\n=== Test: login rate limit ===`);
        debugLog(`Limit: ${LOGIN_LIMIT}`);

        await resetRateLimiter(page, 'login', key);

        await page.goto('/login');

        // Coba login (limit + 1) kali
        for (let i = 0; i < LOGIN_LIMIT + 1; i++) {
            await submitLogin(page, testEmail, 'password-salah', i + 1);
        }

        // Cek DOM sebelum assertion
        if (DEBUG) {
            const pageText = await page.locator('body').textContent();
            debugLog(`Page text (first 500 chars): ${pageText?.slice(0, 500)}`);
        }

        // Pesan rate limit harus muncul
        await expect(
            page.getByText(/Terlalu banyak percobaan login/i),
        ).toBeVisible({ timeout: 10_000 });
    });

    test('pesan rate limit menyertakan waktu tunggu', async ({ page }) => {
        const testEmail = SEED_USERS.client.email;
        const key = `${testEmail.toLowerCase()}|127.0.0.1`;

        debugLog(`\n=== Test: pesan rate limit menyertakan waktu tunggu ===`);

        await resetRateLimiter(page, 'login', key);

        await page.goto('/login');

        for (let i = 0; i < LOGIN_LIMIT + 1; i++) {
            await submitLogin(page, testEmail, 'password-salah', i + 1);
        }

        const errorText = await page
            .locator('p.text-pink')
            .first()
            .textContent();

        debugLog(`Error text: "${errorText}"`);

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

        debugLog(`\n=== Test: register rate limit ===`);
        debugLog(`Limit: ${REGISTER_LIMIT}`);

        // Reset rate limiter untuk key yang benar
        await resetRateLimiter(page, 'register', key);

        // Percobaan sebanyak limit + 1
        for (let i = 0; i < REGISTER_LIMIT + 1; i++) {
            await page.goto('/register');
            await submitRegister(
                page,
                {
                    name: `Test Rate ${i}`,
                    username: uniqueUsername(`rate${i}`),
                    email: duplicateEmail,
                    password: 'password123',
                },
                i + 1,
            );
        }

        if (DEBUG) {
            const pageText = await page.locator('body').textContent();
            debugLog(`Page text (first 500 chars): ${pageText?.slice(0, 500)}`);
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

        debugLog(`\n=== Test: forgot-password rate limit ===`);
        debugLog(`Limit: ${FORGOT_LIMIT}`);

        await resetRateLimiter(page, 'forgot-password', key);

        // Percobaan sebanyak limit + 1
        for (let i = 0; i < FORGOT_LIMIT + 1; i++) {
            await page.goto('/forgot-password');
            await submitForgotPassword(page, testEmail, i + 1);
        }

        if (DEBUG) {
            const pageText = await page.locator('body').textContent();
            debugLog(`Page text (first 500 chars): ${pageText?.slice(0, 500)}`);
        }

        // Pesan rate limit harus muncul
        await expect(
            page.getByText(/Terlalu banyak permintaan reset password/i),
        ).toBeVisible({ timeout: 10_000 });
    });

    /*
    |--------------------------------------------------------------------------
    | Reset Password Rate Limiting (BARU)
    |--------------------------------------------------------------------------
    |
    | PENTING: Test ini bergantung pada asumsi bahwa `AuthThrottleResponse`
    | untuk limiter `reset-password` pakai key `strtolower(email)|ip`
    | dari request body.
    |
    | Kalau key-nya beda (mis. pakai token), test ini akan FLAKY.
    | Cek `AuthThrottleResponse::resolveKey()` dulu.
    |
    | Test pakai token PALSU — rate limiter hit SEBELUM validasi token,
    | jadi token tidak perlu valid.
    |--------------------------------------------------------------------------
    */

    test('reset password diblokir setelah melebihi limit', async ({ page }) => {
        const testEmail = SEED_USERS.client.email;
        const key = `${testEmail.toLowerCase()}|127.0.0.1`;
        const fakeToken = 'token-palsu-e2e-rate-limit';

        debugLog(`\n=== Test: reset-password rate limit ===`);
        debugLog(`Limit: ${RESET_LIMIT}`);
        debugLog(`Email: ${testEmail}`);
        debugLog(`Key: ${key}`);

        await resetRateLimiter(page, 'reset-password', key);

        // Percobaan sebanyak limit + 1
        for (let i = 0; i < RESET_LIMIT + 1; i++) {
            await submitResetPassword(
                page,
                {
                    token: fakeToken,
                    email: testEmail,
                    password: 'password-baru-123',
                },
                i + 1,
            );
        }

        if (DEBUG) {
            const pageText = await page.locator('body').textContent();
            debugLog(`Page text (first 500 chars): ${pageText?.slice(0, 500)}`);

            const errorLocator = page.locator('p.text-pink, .text-red-600, .text-red-700');
            const errorCount = await errorLocator.count();
            debugLog(`Error elements found: ${errorCount}`);
            for (let i = 0; i < errorCount; i++) {
                const text = await errorLocator.nth(i).textContent();
                debugLog(`  Error ${i}: "${text}"`);
            }
        }

        // Pesan rate limit harus muncul
        // Coba beberapa selector karena pesan bisa muncul di lokasi beda
        await expect(
            page.getByText(/Terlalu banyak .+ reset password/i),
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

        debugLog(`\n=== Test: rate limit isolation ===`);
        debugLog(`Akun A (diblokir): ${emailA}`);
        debugLog(`Akun B (harus login): ${emailB}`);

        // Reset rate limiter untuk kedua akun
        await resetRateLimiter(page, 'login', `${emailA.toLowerCase()}|127.0.0.1`);
        await resetRateLimiter(page, 'login', `${emailB.toLowerCase()}|127.0.0.1`);

        // Blokir akun A dengan (limit + 1) percobaan gagal
        await page.goto('/login');
        for (let i = 0; i < LOGIN_LIMIT + 1; i++) {
            await submitLogin(page, emailA, 'password-salah', i + 1);
        }

        // Konfirmasi akun A diblokir
        await expect(
            page.getByText(/Terlalu banyak percobaan login/i),
        ).toBeVisible({ timeout: 10_000 });

        debugLog(`✓ Akun A diblokir`);

        // ============================================
        // PENTING: Bersihkan state browser sebelum pindah ke akun B.
        // Karena flash `retry_after` dari akun A masih ada di session,
        // tombol submit di halaman login berikutnya akan disabled.
        // ============================================

        debugLog(`Membuat browser context baru untuk akun B...`);

        // Buat browser context baru agar tidak ada cookie/flash yang bocor
        const newContext = await page.context().browser()!.newContext({
            baseURL: APP_URL,
        });
        const newPage = await newContext.newPage();

        try {
            // Login sebagai akun B — harus berhasil
            await newPage.goto('/login');
            await newPage.fill('input#identitas', emailB);
            await newPage.fill('input#password', SEED_USERS.admin.password);

            debugLog(`Submit login akun B...`);

            await newPage.click('button[type="submit"]');

            await expect(newPage).toHaveURL('/admin/dashboard', {
                timeout: 15_000,
            });

            debugLog(`✓ Akun B berhasil login (rate limit isolation OK)`);
        } catch (error) {
            // Debug kalau gagal
            if (DEBUG) {
                debugLog(`Current URL: ${newPage.url()}`);
                const text = await newPage.locator('body').textContent();
                debugLog(`Body text (first 500 chars): ${text?.slice(0, 500)}`);
            }
            throw error;
        } finally {
            await newContext.close();
        }
    });
});