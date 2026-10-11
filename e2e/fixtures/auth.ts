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
        // Abaikan error
    }

    await page.context().clearCookies();
}

// ==========================================
// HELPER: LOGIN VIA HTTP (BYPASS INERTIA)
// ==========================================
/**
 * Login dengan mengirim POST /login via `page.request` (HTTP).
 *
 * Kenapa TIDAK via klik form?
 * Karena Inertia meng-intercept form submit sebagai XHR dengan
 * header `X-Inertia: true`. Response 302 di-handle berbeda oleh
 * Inertia, dan Playwright tidak selalu bisa mendeteksi navigasi
 * hasilnya.
 *
 * Dengan mengirim POST langsung via `page.request` (tanpa header
 * `X-Inertia`), server return redirect HTML standar, cookie session
 * di-set dengan benar, dan browser bisa follow redirect.
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

    // 1. Bersihkan state lama
    await forceLogout(page);

    // 2. Buka halaman login untuk dapat CSRF token
    await page.goto('/login');

    const csrfToken = await page.evaluate(() => {
        const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : '';
    });

    // 3. POST /login via page.request (bypass Inertia)
    const response = await page.context().request.post(`${APP_URL}/login`, {
        form: {
            identitas: useEmail ? user.email : user.username,
            password: user.password,
            remember: remember ? '1' : '',
        },
        headers: {
            'X-XSRF-TOKEN': csrfToken,
            Accept: 'text/html, application/xhtml+xml',
        },
        maxRedirects: 0,
        failOnStatusCode: false,
    });

    // 4. Verifikasi status 302
    if (response.status() !== 302) {
        throw new Error(
            `Login gagal untuk ${user.email}: ` +
            `status ${response.status()} (expected 302)`
        );
    }

    const location = response.headers()['location'] ?? '';
    if (!location.includes(user.dashboardPath)) {
        throw new Error(
            `Login redirect tidak sesuai untuk ${user.email}. ` +
            `Expected: ${user.dashboardPath}, Got: ${location}`
        );
    }

    // 5. Navigasi ke dashboard
    await page.goto(user.dashboardPath, {
        waitUntil: 'commit',
        timeout: 15_000,
    });

    // 6. Pastikan tidak redirect balik ke /login
    if (page.url().includes('/login')) {
        throw new Error(
            `Login sukses tapi dashboard redirect balik ke /login. ` +
            `URL: ${page.url()}`
        );
    }
}

// ==========================================
// HELPER: LOGIN VIA HTTP (ALIAS)
// ==========================================
export async function loginViaHTTP(
    page: Page,
    role: SeedRole
): Promise<void> {
    await loginViaUI(page, role);
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