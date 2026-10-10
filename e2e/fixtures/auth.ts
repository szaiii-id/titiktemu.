import { test as base, expect, type Page } from '@playwright/test';
import { APP_URL } from '../config';

// ==========================================
// KONSTANTA AKUN SEED
// ==========================================
export const SEED_USERS = {
    admin: {
        email: 'admin@titiktemu.test',
        username: 'admin',
        password: 'password123',
        role: 'admin' as const,
        dashboardPath: '/admin/dashboard',
    },
    mitra: {
        email: 'mitra@titiktemu.test',
        username: 'mitra',
        password: 'password123',
        role: 'mitra' as const,
        dashboardPath: '/mitra/dashboard',
    },
    client: {
        email: 'client@titiktemu.test',
        username: 'budiclient',
        password: 'password123',
        role: 'client' as const,
        dashboardPath: '/client/dashboard',
    },
} as const;

export type SeedRole = keyof typeof SEED_USERS;

// ==========================================
// HELPER: PAKSA LOGOUT DARI SERVER
// ==========================================
/**
 * Paksa logout dari server, membersihkan session yang tersisa.
 *
 * `clearCookies()` hanya menghapus cookie di browser, tapi session
 * di server (tabel `sessions`) masih ada. Tanpa ini, test berurutan
 * dengan user yang sama akan gagal login karena server melihat
 * session lama masih aktif.
 */
export async function forceLogout(page: Page): Promise<void> {
    try {
        await page.goto('/');

        const csrfToken = await page.evaluate(() => {
            const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
            return match ? decodeURIComponent(match[1]) : '';
        });

        await page.request.post(`${APP_URL}/logout`, {
            headers: {
                'X-XSRF-TOKEN': csrfToken,
                Accept: 'text/html, application/xhtml+xml',
            },
            failOnStatusCode: false,
        });
    } catch {
        // Abaikan error — kalau belum login, logout memang akan gagal
    }

    // Bersihkan cookie di browser
    await page.context().clearCookies();
}

// ==========================================
// HELPER: LOGIN VIA UI
// ==========================================
/**
 * Login melalui halaman /login, lalu navigasi eksplisit ke dashboard.
 *
 * Strategi anti-flaky:
 *   1. forceLogout() dulu — pastikan tidak ada session sisa.
 *   2. Tunggu response POST /login selesai (bukan cuma waitForURL).
 *   3. Verifikasi status 302 + header Location.
 *   4. Beri jeda agar browser set cookie.
 *   5. page.goto(dashboardPath) eksplisit — tidak bergantung pada
 *      client-side redirect yang bisa menggantung di WebKit/Firefox.
 *   6. Cek URL akhir — kalau balik ke /login, throw error jelas.
 */
export async function loginViaUI(
    page: Page,
    role: SeedRole,
    options: {
        useEmail?: boolean;
        remember?: boolean;
    } = {}
): Promise<void> {
    const { useEmail = true, remember = false } = options;
    const user = SEED_USERS[role];

    // 1. Logout dulu dari server + clear cookies
    await forceLogout(page);
    await page.goto('/login');

    // Isi form
    await page.fill('input#identitas', useEmail ? user.email : user.username);
    await page.fill('input#password', user.password);

    if (remember) {
        await page.check('input#remember-me');
    }

    // 2. Tunggu response POST /login selesai
    const loginResponsePromise = page.waitForResponse(
        (res) =>
            res.url().includes('/login') &&
            res.request().method() === 'POST',
        { timeout: 15_000 }
    );

    await page.click('button[type="submit"]');
    const loginResponse = await loginResponsePromise;

    // 3. Verifikasi status 302 (redirect = sukses)
    if (loginResponse.status() !== 302) {
        throw new Error(
            `Login gagal untuk ${user.email}: ` +
            `status ${loginResponse.status()} (expected 302)`
        );
    }

    // Verifikasi header Location mengarah ke dashboard yang benar
    const location = loginResponse.headers()['location'] ?? '';
    if (!location.includes(user.dashboardPath)) {
        throw new Error(
            `Login redirect tidak sesuai untuk ${user.email}. ` +
            `Expected: ${user.dashboardPath}, Got: ${location || '(empty)'}`
        );
    }

    // 4. Beri jeda agar browser selesai set cookie session
    await page.waitForTimeout(500);

    // 5. Navigasi eksplisit ke dashboard — tidak bergantung pada
    //    client-side redirect yang bisa menggantung
    await page.goto(user.dashboardPath, {
        waitUntil: 'domcontentloaded',
        timeout: 15_000,
    });

    // 6. Cek apakah kita tidak di-redirect balik ke /login
    if (page.url().includes('/login')) {
        throw new Error(
            `Login sukses (302) tapi dashboard redirect balik ke /login. ` +
            `Kemungkinan cookie session tidak terkirim oleh browser. ` +
            `URL: ${page.url()}`
        );
    }
}

// ==========================================
// HELPER: LOGIN VIA HTTP (LEBIH CEPAT)
// ==========================================
export async function loginViaHTTP(
    page: Page,
    role: SeedRole
): Promise<void> {
    const user = SEED_USERS[role];

    await forceLogout(page);
    await page.goto('/login');

    const csrfToken = await page.evaluate(() => {
        const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : '';
    });

    await page.request.post(`${APP_URL}/login`, {
        form: {
            identitas: user.email,
            password: user.password,
        },
        headers: {
            'X-XSRF-TOKEN': csrfToken,
            Accept: 'text/html, application/xhtml+xml',
        },
    });

    await page.goto(user.dashboardPath, {
        waitUntil: 'domcontentloaded',
        timeout: 15_000,
    });
}

// ==========================================
// HELPER: LOGOUT
// ==========================================
export async function logout(page: Page): Promise<void> {
    await forceLogout(page);
}

// ==========================================
// HELPER: GENERATE EMAIL UNIK
// ==========================================
export function uniqueEmail(prefix = 'e2e'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    return `${prefix}-${timestamp}-${random}@titiktemu.test`;
}

export function uniqueUsername(prefix = 'e2e'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 6);
    return `${prefix}${timestamp}${random}`.toLowerCase();
}

// ==========================================
// CUSTOM TEST FIXTURE
// ==========================================
type AuthFixtures = {
    asAdmin: () => Promise<void>;
    asMitra: () => Promise<void>;
    asClient: () => Promise<void>;
    asGuest: () => Promise<void>;
};

export const test = base.extend<AuthFixtures>({
    asAdmin: async ({ page }, use) => {
        await use(async () => {
            await loginViaUI(page, 'admin');
        });
    },

    asMitra: async ({ page }, use) => {
        await use(async () => {
            await loginViaUI(page, 'mitra');
        });
    },

    asClient: async ({ page }, use) => {
        await use(async () => {
            await loginViaUI(page, 'client');
        });
    },

    asGuest: async ({ page }, use) => {
        await use(async () => {
            await forceLogout(page);
        });
    },
});

export { expect };