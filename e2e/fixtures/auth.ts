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
 * Login melalui halaman /login, lalu tunggu redirect ke dashboard.
 *
 * Menggunakan `waitUntil: 'commit'` agar tidak bergantung pada
 * event `load` yang bisa menggantung di WebKit/Firefox (penyebab
 * timeout di test sebelumnya).
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

    // Logout dulu dari server + clear cookies
    await forceLogout(page);
    await page.goto('/login');

    // Isi form
    await page.fill('input#identitas', useEmail ? user.email : user.username);
    await page.fill('input#password', user.password);

    if (remember) {
        await page.check('input#remember-me');
    }

    // Submit form
    await page.click('button[type="submit"]');

    // Tunggu redirect ke dashboard.
    // `waitUntil: 'commit'` — hanya tunggu URL berubah, tidak tunggu
    // event 'load' yang bisa menggantung di WebKit/Firefox.
    await page.waitForURL(`**${user.dashboardPath}`, {
        timeout: 15_000,
        waitUntil: 'commit',
    });
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