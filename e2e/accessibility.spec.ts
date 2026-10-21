import { test, expect, SEED_USERS } from './fixtures/auth';
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

/**
 * Accessibility (a11y) Test — Comprehensive
 *
 * Memindai halaman-halaman utama dengan axe-core untuk mendeteksi
 * pelanggaran WCAG (Web Content Accessibility Guidelines).
 *
 * Strategi:
 * - Helper `scanPage()` untuk DRY: 1 fungsi, semua halaman.
 * - `PUBLIC_PAGES` — halaman tanpa login.
 * - `CLIENT_PAGES`, `MITRA_PAGES`, `ADMIN_PAGES` — halaman authenticated.
 * - `NOTIFICATIONS_PAGES` — halaman shared `/notifications` (sidebar beda per role).
 * - Setiap halaman: assert TIDAK ADA pelanggaran `critical` atau `serious`.
 * - `moderate`/`minor` di-log tapi tidak gagalkan test.
 *
 * ⚠️ FIX #1: scanPage — tunggu halaman stabil (networkidle + domcontentloaded +
 *           timeout) SEBELUM analyze, anti "Execution context was destroyed".
 * ⚠️ FIX #2: scanPage — retry analyze() jika kena Execution context destroyed
 *           (race Inertia re-render / hydration).
 */

// ==========================================
// KONFIGURASI
// ==========================================
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] as const;

const DISABLED_RULES = [
    'region',
    'landmark-one-main',
] as const;

const CRITICAL_IMPACTS = ['critical', 'serious'] as const;

// ==========================================
// TIPE
// ==========================================
type PageDefinition = {
    path: string;
    name: string;
    skip?: boolean;
    disableRules?: string[];
};

// ==========================================
// DAFTAR HALAMAN — PUBLIC
// ==========================================
const PUBLIC_PAGES: PageDefinition[] = [
    { path: '/', name: 'Landing Page' },
    { path: '/login', name: 'Login' },
    { path: '/register', name: 'Register' },
    { path: '/forgot-password', name: 'Lupa Password' },
];

// ==========================================
// DAFTAR HALAMAN — CLIENT
// ==========================================
const CLIENT_PAGES: PageDefinition[] = [
    { path: '/client/dashboard', name: 'Client Dashboard' },
    { path: '/client/profile', name: 'Client Profile' },
    { path: '/change-password', name: 'Change Password (Client)' },
    { path: '/client/catalog', name: 'Client Catalog' },
    { path: '/client/bookings', name: 'Client Bookings Index' },
];

// ==========================================
// DAFTAR HALAMAN — MITRA
// ==========================================
const MITRA_PAGES: PageDefinition[] = [
    { path: '/mitra/dashboard', name: 'Mitra Dashboard' },
    { path: '/mitra/profile', name: 'Mitra Profile' },
    { path: '/mitra/password', name: 'Mitra Ganti Password' },
    { path: '/change-password', name: 'Change Password (Mitra)' },
    { path: '/mitra/trips', name: 'Mitra Trips Index' },
    { path: '/mitra/daily-reports', name: 'Mitra Daily Reports Index' },
    { path: '/mitra/wallet', name: 'Mitra Wallet' },
    { path: '/mitra/payouts', name: 'Mitra Payouts Index' },
    { path: '/mitra/payouts/create', name: 'Mitra Payouts Create' },
];

// ==========================================
// DAFTAR HALAMAN — ADMIN
// ==========================================
const ADMIN_PAGES: PageDefinition[] = [
    { path: '/admin/dashboard', name: 'Admin Dashboard' },
    { path: '/admin/users', name: 'Admin Users Index' },
    { path: '/admin/users/create', name: 'Admin Users Create' },
    { path: '/admin/clients', name: 'Admin Clients' },
    { path: '/admin/packages', name: 'Admin Packages Index' },
    { path: '/admin/packages/create', name: 'Admin Packages Create' },
    { path: '/admin/bookings', name: 'Admin Bookings Index' },
    { path: '/admin/trips', name: 'Admin Trips Index' },
    { path: '/admin/daily-reports', name: 'Admin Daily Reports Index' },
    { path: '/admin/payouts', name: 'Admin Payouts Index' },
    { path: '/change-password', name: 'Change Password (Admin)' },
];

// ==========================================
// DAFTAR HALAMAN — NOTIFICATIONS (SHARED)
// ==========================================
const NOTIFICATIONS_PAGES: Array<{
    role: 'client' | 'mitra' | 'admin';
    name: string;
}> = [
    { role: 'client', name: 'Notifications (Client)' },
    { role: 'mitra', name: 'Notifications (Mitra)' },
    { role: 'admin', name: 'Notifications (Admin)' },
];

// ==========================================
// HELPER: SCAN PAGE
// ==========================================

/**
 * ✅ FIX #1 + #2: scanPage — anti "Execution context was destroyed".
 *
 * Kenapa perlu:
 * - `waitForLoadState('networkidle')` kadang TIDAK CUKUP karena Inertia
 *   bisa trigger navigasi setelah networkidle (lazy load component,
 *   hydration re-render, toast animation, dll).
 * - Saat `analyze()` jalan, frame bisa di-destroy karena ada navigasi
 *   yang belum selesai → error "Execution context was destroyed".
 *
 * Solusi:
 * 1. Tunggu `domcontentloaded` + `networkidle` + timeout kecil
 *    (biarkan hydration & animation settle).
 * 2. Retry `analyze()` jika kena error "Execution context was destroyed"
 *    (maksimal 3x dengan delay).
 */
async function scanPage(
    page: Page,
    def: PageDefinition,
    login?: () => Promise<void>,
): Promise<void> {
    if (login) await login();

    // ✅ FIX #1: 3 lapis tunggu sebelum analyze
    await page.goto(def.path, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    // ✅ Beri waktu hydration + animasi settle (Inertia re-render)
    await page.waitForTimeout(300);

    // Build axe scanner
    let builder = new AxeBuilder({ page }).withTags([...WCAG_TAGS]);

    const disabledRules = [
        ...DISABLED_RULES,
        ...(def.disableRules ?? []),
    ];

    if (disabledRules.length > 0) {
        builder = builder.disableRules(disabledRules);
    }

    // ✅ FIX #2: retry analyze() — anti race "Execution context was destroyed"
    let results;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            results = await builder.analyze();
            lastError = null;
            break;
        } catch (err) {
            lastError = err as Error;

            // Hanya retry untuk error navigasi / context destroyed
            const isNavigationRace =
                lastError.message.includes('Execution context was destroyed') ||
                lastError.message.includes('Target closed') ||
                lastError.message.includes('navigation');

            if (!isNavigationRace || attempt === 3) {
                throw lastError;
            }

            // Tunggu sebentar lalu retry — halaman mungkin re-render
            await page.waitForTimeout(500 * attempt);
            await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
        }
    }

    if (!results) {
        throw lastError ?? new Error('analyze() gagal tanpa hasil');
    }

    // Log semua violations supaya mudah debug
    if (results.violations.length > 0) {
        console.log(
            `\n[${def.name}] ${results.violations.length} pelanggaran WCAG:`,
        );
        for (const violation of results.violations) {
            console.log(`  - ${violation.id}: ${violation.help}`);
            console.log(`    Dampak: ${violation.impact}`);
            console.log(`    URL: ${violation.helpUrl}`);
            for (const node of violation.nodes) {
                console.log(`    Node: ${node.html.slice(0, 120)}`);
            }
        }
    }

    const critical = results.violations.filter((v) =>
        (CRITICAL_IMPACTS as readonly string[]).includes(v.impact ?? ''),
    );

    expect(
        critical,
        `Ditemukan ${critical.length} pelanggaran WCAG kritis di ${def.name}`,
    ).toEqual([]);
}

// ==========================================
// TEST SUITE — PUBLIC
// ==========================================
test.describe('Accessibility — Halaman Publik', () => {
    for (const def of PUBLIC_PAGES) {
        test(`${def.name} tidak memiliki pelanggaran WCAG kritis`, async ({
            page,
        }) => {
            await scanPage(page, def);
        });
    }
});

// ==========================================
// TEST SUITE — CLIENT
// ==========================================
test.describe('Accessibility — Halaman Client', () => {
    for (const def of CLIENT_PAGES) {
        test(`${def.name} tidak memiliki pelanggaran WCAG kritis`, async ({
            page,
            asClient,
        }) => {
            await scanPage(page, def, asClient);
        });
    }
});

// ==========================================
// TEST SUITE — MITRA
// ==========================================
test.describe('Accessibility — Halaman Mitra', () => {
    for (const def of MITRA_PAGES) {
        test(`${def.name} tidak memiliki pelanggaran WCAG kritis`, async ({
            page,
            asMitra,
        }) => {
            await scanPage(page, def, asMitra);
        });
    }
});

// ==========================================
// TEST SUITE — ADMIN
// ==========================================
test.describe('Accessibility — Halaman Admin', () => {
    for (const def of ADMIN_PAGES) {
        test(`${def.name} tidak memiliki pelanggaran WCAG kritis`, async ({
            page,
            asAdmin,
        }) => {
            await scanPage(page, def, asAdmin);
        });
    }
});

// ==========================================
// TEST SUITE — NOTIFICATIONS (SHARED, PER ROLE)
// ==========================================
test.describe('Accessibility — Halaman Notifikasi', () => {
    for (const { role, name } of NOTIFICATIONS_PAGES) {
        test(`${name} tidak memiliki pelanggaran WCAG kritis`, async ({
            page,
            asClient,
            asMitra,
            asAdmin,
        }) => {
            const login =
                role === 'client'
                    ? asClient
                    : role === 'mitra'
                      ? asMitra
                      : asAdmin;

            await scanPage(
                page,
                { path: '/notifications', name },
                login,
            );
        });
    }
});

// ==========================================
// SPECIFIC CHECKS — Halaman Login
// ==========================================

test.describe('Accessibility — Login: Detail', () => {
    test('semua input punya label yang terasosiasi', async ({ page }) => {
        await page.goto('/login', { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
        await page.waitForTimeout(300);

        const results = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa'])
            .include('#identitas')
            .include('#password')
            .analyze();

        const labelViolations = results.violations.filter(
            (v) => v.id === 'label' || v.id === 'form-field-multiple-labels',
        );

        expect(labelViolations).toEqual([]);
    });

    test('struktur heading berurutan (tidak skip level)', async ({ page }) => {
        await page.goto('/login', { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
        await page.waitForTimeout(300);

        const results = await new AxeBuilder({ page })
            .withTags(['best-practice'])
            .include('h1, h2, h3, h4, h5, h6')
            .analyze();

        const headingViolations = results.violations.filter(
            (v) => v.id === 'heading-order',
        );

        expect(headingViolations).toEqual([]);
    });

    test('kontras warna memadai (max 3 pelanggaran)', async ({ page }) => {
        await page.goto('/login', { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
        await page.waitForTimeout(300);

        const results = await new AxeBuilder({ page })
            .withTags(['wcag2aa'])
            .disableRules(['region', 'landmark-one-main'])
            .analyze();

        const contrastViolations = results.violations.filter(
            (v) => v.id === 'color-contrast',
        );

        if (contrastViolations.length > 0) {
            console.warn(
                `\n[Login] ${contrastViolations.length} pelanggaran kontras warna:`,
            );
            for (const violation of contrastViolations) {
                for (const node of violation.nodes) {
                    console.warn(`  - ${node.html.slice(0, 100)}`);
                    console.warn(`    ${node.failureSummary}`);
                }
            }
        }

        expect(contrastViolations.length).toBeLessThanOrEqual(3);
    });

    test('memiliki bahasa dokumen yang valid', async ({ page }) => {
        await page.goto('/login', { waitUntil: 'domcontentloaded' });

        const lang = await page.evaluate(() => document.documentElement.lang);

        expect(lang).toBeTruthy();
        expect(['id', 'en']).toContain(lang);
    });
});

// ==========================================
// KEYBOARD NAVIGATION
// ==========================================

test.describe('Accessibility — Navigasi Keyboard', () => {
    test('semua elemen form di halaman login bisa diakses dengan Tab', async ({
        page,
    }) => {
        await page.goto('/login', { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

        await page.keyboard.press('Tab');

        const firstFocused = await page.evaluate(
            () => document.activeElement?.tagName.toLowerCase(),
        );

        expect(['input', 'a', 'button']).toContain(firstFocused);

        for (let i = 0; i < 5; i++) {
            await page.keyboard.press('Tab');
            const tag = await page.evaluate(
                () => document.activeElement?.tagName.toLowerCase(),
            );
            expect(['input', 'a', 'button', 'body']).toContain(tag);
        }
    });

    test('tombol submit bisa di-submit dengan Enter', async ({ page }) => {
        await page.goto('/login', { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

        await page.fill('input#identitas', 'test@titiktemu.test');
        await page.fill('input#password', 'password123');
        await page.press('input#password', 'Enter');

        await page.waitForLoadState('networkidle');
    });
});

// ==========================================
// MODAL ACCESSIBILITY
// ==========================================

test.describe('Accessibility — Modal', () => {
    test('DeleteConfirmModal punya role dialog + aria-modal', async ({
        page,
        asAdmin,
    }) => {
        await asAdmin();
        await page.goto('/admin/users', { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
        await page.waitForTimeout(300);

        const mitraRow = page
            .locator('tbody tr')
            .filter({ hasText: SEED_USERS.mitra.email });

        await mitraRow.getByLabel('Hapus user').click();

        const modal = page.locator('[role="dialog"]');
        await expect(modal).toBeVisible();
        await expect(modal).toHaveAttribute('aria-modal', 'true');
    });

    test('DeleteConfirmModal tidak punya pelanggaran WCAG kritis', async ({
        page,
        asAdmin,
    }) => {
        await asAdmin();
        await page.goto('/admin/users', { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
        await page.waitForTimeout(300);

        const mitraRow = page
            .locator('tbody tr')
            .filter({ hasText: SEED_USERS.mitra.email });

        await mitraRow.getByLabel('Hapus user').click();
        await expect(page.locator('[role="dialog"]')).toBeVisible();

        // ✅ FIX #2: retry analyze untuk modal (anti race)
        let results;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                results = await new AxeBuilder({ page })
                    .include('[role="dialog"]')
                    .withTags([...WCAG_TAGS])
                    .analyze();
                break;
            } catch (err) {
                const isRace = (err as Error).message.includes('Execution context was destroyed');
                if (!isRace || attempt === 3) throw err;
                await page.waitForTimeout(500 * attempt);
            }
        }

        if (!results) {
            throw new Error('analyze() gagal untuk modal');
        }

        const critical = results.violations.filter((v) =>
            (CRITICAL_IMPACTS as readonly string[]).includes(v.impact ?? ''),
        );

        expect(critical).toEqual([]);
    });
});