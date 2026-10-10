import { test as base, expect, type Page } from '@playwright/test';
import { APP_URL } from '../config';

// ==========================================
// KONSTANTA AKUN SEED
// ==========================================
// Sesuai dengan database/seeders/UserSeeder.php
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
// HELPER: LOGIN VIA UI
// ==========================================
/**
 * Login melalui halaman /login menggunakan email atau username.
 * Setelah sukses, user akan berada di dashboard sesuai role.
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

    await page.goto('/login');

    // Isi identitas (email atau username)
    await page.fill(
        'input#identitas',
        useEmail ? user.email : user.username
    );

    // Isi password
    await page.fill('input#password', user.password);

    // Centang "Ingat saya" jika diminta
    if (remember) {
        await page.check('input#remember-me');
    }

    // Submit form
    await page.click('button[type="submit"]');

    // Tunggu redirect ke dashboard
    await page.waitForURL(`**${user.dashboardPath}`, {
        timeout: 15_000,
    });
}

// ==========================================
// HELPER: LOGIN VIA HTTP (LEBIH CEPAT)
// ==========================================
/**
 * Login tanpa melalui UI — langsung POST ke /login.
 * Cocok untuk test yang tidak menguji form login itu sendiri.
 *
 * Catatan: tetap memerlukan kunjungan pertama ke aplikasi
 * untuk mendapatkan CSRF token dan session cookie.
 */
export async function loginViaHTTP(
    page: Page,
    role: SeedRole
): Promise<void> {
    const user = SEED_USERS[role];

    // Kunjungi halaman login dulu untuk mendapatkan CSRF token
    await page.goto('/login');

    // Ambil CSRF token dari cookie XSRF-TOKEN atau meta tag
    const csrfToken = await page.evaluate(() => {
        const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : '';
    });

    // POST ke /login
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

    // Navigasi ke dashboard untuk memverifikasi login berhasil
    await page.goto(user.dashboardPath);
    await page.waitForURL(`**${user.dashboardPath}`);
}

// ==========================================
// HELPER: LOGOUT
// ==========================================
export async function logout(page: Page): Promise<void> {
    // Cari form logout atau tombol logout di navbar
    // Karena aplikasi Anda menggunakan POST /logout,
    // kita trigger via request
    await page.goto('/');

    const csrfToken = await page.evaluate(() => {
        const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : '';
    });

    await page.request.post(`${APP_URL}/logout`, {
        headers: {
            'X-XSRF-TOKEN': csrfToken,
        },
    });
}

// ==========================================
// HELPER: GENERATE EMAIL UNIK
// ==========================================
/**
 * Membuat email unik untuk test register.
 * Format: e2e-{timestamp}-{random}@titiktemu.test
 */
export function uniqueEmail(prefix = 'e2e'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    return `${prefix}-${timestamp}-${random}@titiktemu.test`;
}

/**
 * Membuat username unik.
 */
export function uniqueUsername(prefix = 'e2e'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 6);
    return `${prefix}${timestamp}${random}`.toLowerCase();
}

// ==========================================
// CUSTOM TEST FIXTURE
// ==========================================
/**
 * Extend base test dengan fixture tambahan.
 *
 * Contoh penggunaan:
 *   test('admin bisa akses dashboard', async ({ page, asAdmin }) => {
 *       await asAdmin();
 *       await expect(page).toHaveURL('/admin/dashboard');
 *   });
 */
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
            // Tidak melakukan apa-apa — hanya memastikan state bersih
            await page.context().clearCookies();
        });
    },
});

export { expect };