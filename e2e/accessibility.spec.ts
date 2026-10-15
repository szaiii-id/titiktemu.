import { test, expect, SEED_USERS } from './fixtures/auth';
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

/**
 * Accessibility (a11y) Test
 *
 * Memindai halaman-halaman utama dengan axe-core untuk mendeteksi
 * pelanggaran WCAG (Web Content Accessibility Guidelines).
 *
 * Strategi:
 * - Helper `scanPage()` untuk DRY: 1 fungsi, semua halaman.
 * - `PUBLIC_PAGES` — halaman tanpa login.
 * - `CLIENT_PAGES`, `MITRA_PAGES`, `ADMIN_PAGES` — halaman authenticated.
 * - Setiap halaman: assert TIDAK ADA pelanggaran `critical` atau `serious`.
 * - `moderate`/`minor` di-log tapi tidak gagalkan test.
 *
 * Referensi:
 * - https://www.deque.com/axe/core-documentation/api-documentation/
 * - https://www.w3.org/WAI/WCAG21/quickref/
 */

// ==========================================
// KONFIGURASI
// ==========================================
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] as const;

// Rules yang di-disable karena Svelte + Tailwind sering tidak comply
// dan bukan prioritas (bisa diaktifkan nanti setelah refactor besar).
const DISABLED_RULES = [
    'region',              // Halaman SPA sering tidak punya <main> explicit
    'landmark-one-main',   // Sama
] as const;

const CRITICAL_IMPACTS = ['critical', 'serious'] as const;

// ==========================================
// TIPE
// ==========================================
type PageDefinition = {
    path: string;
    name: string;
    /**
     * Kalau true, halaman skip scan (mis. butuh data dinamis).
     * Pakai untuk sementara sampai test-nya siap.
     */
    skip?: boolean;
    /** Rule axe yang di-disable khusus halaman ini. */
    disableRules?: string[];
};

// ==========================================
// DAFTAR HALAMAN
// ==========================================
const PUBLIC_PAGES: PageDefinition[] = [
    { path: '/', name: 'Landing Page' },
    { path: '/login', name: 'Login' },
    { path: '/register', name: 'Register' },
    { path: '/forgot-password', name: 'Lupa Password' },
];

const CLIENT_PAGES: PageDefinition[] = [
    { path: '/client/dashboard', name: 'Client Dashboard' },
    { path: '/client/profile', name: 'Client Profile' },
    { path: '/change-password', name: 'Change Password (Client)' },
];

const MITRA_PAGES: PageDefinition[] = [
    { path: '/mitra/dashboard', name: 'Mitra Dashboard' },
    { path: '/mitra/profile', name: 'Mitra Profile' },
    { path: '/mitra/password', name: 'Mitra Ganti Password' },
    { path: '/change-password', name: 'Change Password (Mitra)' },
];

const ADMIN_PAGES: PageDefinition[] = [
    { path: '/admin/dashboard', name: 'Admin Dashboard' },
    { path: '/admin/users', name: 'Admin Users Index' },
    { path: '/admin/users/create', name: 'Admin Users Create' },
    { path: '/admin/clients', name: 'Admin Clients' },
    { path: '/change-password', name: 'Change Password (Admin)' },
];

// ==========================================
// HELPER: SCAN PAGE
// ==========================================
/**
 * Scan satu halaman dengan axe-core.
 *
 * @param page       Playwright Page
 * @param def        Definisi halaman (path, name, disableRules)
 * @param login      Fungsi async untuk login (opsional, untuk halaman auth)
 */
async function scanPage(
    page: Page,
    def: PageDefinition,
    login?: () => Promise<void>,
): Promise<void> {
    if (login) await login();

    await page.goto(def.path);
    await page.waitForLoadState('networkidle');

    // Build axe scanner
    let builder = new AxeBuilder({ page }).withTags([...WCAG_TAGS]);

    // Gabung disabled rules: default + per-halaman
    const disabledRules = [
        ...DISABLED_RULES,
        ...(def.disableRules ?? []),
    ];

    if (disabledRules.length > 0) {
        builder = builder.disableRules(disabledRules);
    }

    const results = await builder.analyze();

    // Log semua violations supaya mudah debug
    if (results.violations.length > 0) {
        console.log(`\n[${def.name}] ${results.violations.length} pelanggaran WCAG:`);
        for (const violation of results.violations) {
            console.log(`  - ${violation.id}: ${violation.help}`);
            console.log(`    Dampak: ${violation.impact}`);
            console.log(`    URL: ${violation.helpUrl}`);
            for (const node of violation.nodes) {
                console.log(`    Node: ${node.html.slice(0, 120)}`);
            }
        }
    }

    // Hanya gagalkan untuk `critical` atau `serious`
    const critical = results.violations.filter((v) =>
        (CRITICAL_IMPACTS as readonly string[]).includes(v.impact ?? ''),
    );

    expect(
        critical,
        `Ditemukan ${critical.length} pelanggaran WCAG kritis di ${def.name}`,
    ).toEqual([]);
}

// ==========================================
// TEST SUITE
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
// SPECIFIC CHECKS — Halaman Login
// ==========================================

test.describe('Accessibility — Login: Detail', () => {
    test('semua input punya label yang terasosiasi', async ({ page }) => {
        await page.goto('/login');

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
        await page.goto('/login');

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
        await page.goto('/login');

        const results = await new AxeBuilder({ page })
            .withTags(['wcag2aa'])
            .disableRules(['region', 'landmark-one-main'])
            .analyze();

        const contrastViolations = results.violations.filter(
            (v) => v.id === 'color-contrast',
        );

        if (contrastViolations.length > 0) {
            console.warn(`\n[Login] ${contrastViolations.length} pelanggaran kontras warna:`);
            for (const violation of contrastViolations) {
                for (const node of violation.nodes) {
                    console.warn(`  - ${node.html.slice(0, 100)}`);
                    console.warn(`    ${node.failureSummary}`);
                }
            }
        }

        // Threshold 3 — desain ada yang intentionally kontras rendah
        expect(contrastViolations.length).toBeLessThanOrEqual(3);
    });

    test('memiliki bahasa dokumen yang valid', async ({ page }) => {
        await page.goto('/login');

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
        await page.goto('/login');

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
        await page.goto('/login');

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
        await page.goto('/admin/users');

        // Buka modal hapus (row Budi Santoso = mitra, tombol Hapus muncul)
        const mitraRow = page
            .locator('tbody tr')
            .filter({ hasText: SEED_USERS.mitra.email });

        await mitraRow.getByLabel('Hapus user').click();

        // Modal muncul
        const modal = page.locator('[role="dialog"]');
        await expect(modal).toBeVisible();
        await expect(modal).toHaveAttribute('aria-modal', 'true');
    });

    test('DeleteConfirmModal tidak punya pelanggaran WCAG kritis', async ({
        page,
        asAdmin,
    }) => {
        await asAdmin();
        await page.goto('/admin/users');

        const mitraRow = page
            .locator('tbody tr')
            .filter({ hasText: SEED_USERS.mitra.email });

        await mitraRow.getByLabel('Hapus user').click();
        await expect(page.locator('[role="dialog"]')).toBeVisible();

        const results = await new AxeBuilder({ page })
            .include('[role="dialog"]')
            .withTags([...WCAG_TAGS])
            .analyze();

        const critical = results.violations.filter((v) =>
            (CRITICAL_IMPACTS as readonly string[]).includes(v.impact ?? ''),
        );

        expect(critical).toEqual([]);
    });
});