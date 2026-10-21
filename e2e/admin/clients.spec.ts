import { test, expect, SEED_USERS, uniqueEmail, uniqueUsername } from '../fixtures/auth';
import { APP_URL } from '../config';
import type { Browser, Locator, Page } from '@playwright/test';

/**
 * Admin — Daftar Client
 *
 * ⚠️ FIX #1: performSearch — polling URL params (search=query)
 * ⚠️ FIX #2: expectPagePath — toleran absolute URL
 * ⚠️ FIX #3: strict mode — `.first()` pada getByText
 * ⚠️ FIX #4: performSearch — tunggu input ready + terisi sebelum polling
 *           (anti race hydration: fill() sebelum handler siap → query kosong)
 */

// ==========================================
// KONSTANTA
// ==========================================
const SEED_CLIENT = {
    name: 'Budi Client',
    username: 'budiclient',
    email: 'client@titiktemu.test',
};

// ==========================================
// HELPER
// ==========================================

async function expectPagePath(
    page: Page,
    expectedPath: string | RegExp,
): Promise<void> {
    if (typeof expectedPath === 'string') {
        await expect
            .poll(
                () => new URL(page.url()).pathname,
                { timeout: 10_000, intervals: [100, 200, 500] },
            )
            .toBe(expectedPath);
    } else {
        await expect
            .poll(
                () => {
                    const path = new URL(page.url()).pathname;
                    return expectedPath.test(path);
                },
                { timeout: 10_000, intervals: [100, 200, 500] },
            )
            .toBe(true);
    }
}

async function registerClientViaAPI(
    browser: Browser,
    data: { name: string; username: string; email: string },
): Promise<void> {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        await page.goto('/register');
        const csrfToken = await page.evaluate(() => {
            const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
            return match ? decodeURIComponent(match[1]) : '';
        });

        await page.context().request.post('/register', {
            form: {
                name: data.name,
                username: data.username,
                email: data.email,
                password: 'password123',
                password_confirmation: 'password123',
            },
            headers: {
                'X-XSRF-TOKEN': csrfToken,
                Accept: 'text/html, application/xhtml+xml',
            },
            failOnStatusCode: false,
        });
    } finally {
        await context.close();
    }
}

/**
 * ✅ FIX #4: performSearch — anti race hydration.
 *
 * Kenapa: `page.fill()` bisa jalan SEBELUM Svelte hydration selesai.
 * Akibatnya nilai terisi di DOM, tapi handler `input`/`keydown` belum
 * terpasang → URL di-update dengan query kosong (`Received: ""`).
 *
 * Solusi:
 * 1. Tunggu networkidle (hydration selesai)
 * 2. Tunggu input visible & enabled
 * 3. Isi input, lalu VERIFIKASI nilai benar-benar masuk
 * 4. Baru polling URL
 */
async function performSearch(page: Page, query: string): Promise<void> {
    // ✅ 1. Tunggu halaman stabil (hydration selesai)
    await page.waitForLoadState('networkidle', { timeout: 15_000 });

    const input = page.locator('input[placeholder*="Cari"]');

    // ✅ 2. Tunggu input visible & enabled
    await input.waitFor({ state: 'visible', timeout: 10_000 });
    await expect(input).toBeEnabled({ timeout: 5_000 });

    // ✅ 3. Isi input, lalu VERIFIKASI nilai benar-benar masuk
    await input.fill(query);
    await expect(input).toHaveValue(query, { timeout: 5_000 });

    // ✅ 4. Tunggu handler search men-trigger perubahan URL
    await expect
        .poll(
            () => new URL(page.url()).searchParams.get('search') ?? '',
            { timeout: 15_000, intervals: [100, 200, 500] },
        )
        .toBe(query);
}

// ==========================================
// TEST SUITE
// ==========================================
test.describe('Admin — Daftar Client', () => {
    /*
    |--------------------------------------------------------------------------
    | Access Control
    |--------------------------------------------------------------------------
    */

    test('guest tidak bisa akses halaman daftar client', async ({ page, asGuest }) => {
        await asGuest();
        await page.goto('/admin/clients', { waitUntil: 'domcontentloaded' });
        await expectPagePath(page, '/login');
    });

    test('client tidak bisa akses halaman daftar client', async ({ page, asClient }) => {
        await asClient();
        await page.goto('/admin/clients', { waitUntil: 'domcontentloaded' });
        await expectPagePath(page, '/client/dashboard');
    });

    test('mitra tidak bisa akses halaman daftar client', async ({ page, asMitra }) => {
        await asMitra();
        await page.goto('/admin/clients', { waitUntil: 'domcontentloaded' });
        await expectPagePath(page, '/mitra/dashboard');
    });

    test('admin bisa akses halaman daftar client', async ({ page, asAdmin }) => {
        await asAdmin();
        await page.goto('/admin/clients', { waitUntil: 'domcontentloaded' });
        await expectPagePath(page, '/admin/clients');
    });

    /*
    |--------------------------------------------------------------------------
    | Contract — Elemen Halaman
    |--------------------------------------------------------------------------
    */

    test.describe('Elemen Halaman', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/clients', { waitUntil: 'domcontentloaded' });
        });

        test('menampilkan heading "Daftar Client"', async ({ page }) => {
            await expect(
                page.getByRole('heading', { name: /^Daftar Client$/i }).first(),
            ).toBeVisible();
        });

        test('menampilkan deskripsi "Read-only"', async ({ page }) => {
            await expect(
                page.getByText(/Read-only — tidak bisa diedit atau dihapus/i),
            ).toBeVisible();
        });

        test('menampilkan badge jumlah client terdaftar', async ({ page }) => {
            await expect(page.getByText(/Client Terdaftar/i).first()).toBeVisible();
        });

        test('menampilkan input search', async ({ page }) => {
            const searchInput = page.locator('input[placeholder*="Cari"]');
            await expect(searchInput).toBeVisible();
            await expect(searchInput).toHaveAttribute(
                'placeholder',
                /Cari nama, email, atau username/i,
            );
        });

        test('menampilkan label "Mode Read-only"', async ({ page }) => {
            await expect(page.getByText(/Mode Read-only/i).first()).toBeVisible();
        });

        test('menampilkan tabel dengan header yang benar', async ({ page }) => {
            await expect(
                page.getByRole('columnheader', { name: /^Client$/i }),
            ).toBeVisible();
            await expect(
                page.getByRole('columnheader', { name: /^Username$/i }),
            ).toBeVisible();
            await expect(
                page.getByRole('columnheader', { name: /^Terdaftar$/i }),
            ).toBeVisible();
        });

        test('TIDAK menampilkan tombol edit/hapus', async ({ page }) => {
            await expect(
                page.getByRole('button', { name: /^Edit$/i }),
            ).not.toBeVisible();
            await expect(
                page.getByRole('button', { name: /^Hapus$/i }),
            ).not.toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Data Initialization
    |--------------------------------------------------------------------------
    */

    test.describe('Data Initialization', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/clients', { waitUntil: 'domcontentloaded' });
        });

        test('menampilkan seed client (Budi Client)', async ({ page }) => {
            await expect(
                page.getByText(SEED_CLIENT.name, { exact: true }).first(),
            ).toBeVisible();
        });

        test('menampilkan email seed client', async ({ page }) => {
            await expect(
                page.getByText(SEED_CLIENT.email).first(),
            ).toBeVisible();
        });

        test('menampilkan username seed client dengan @ prefix', async ({ page }) => {
            await expect(
                page.getByText(`@${SEED_CLIENT.username}`).first(),
            ).toBeVisible();
        });

        test('menampilkan minimal 1 row data', async ({ page }) => {
            const rows = page.locator('tbody tr');
            await expect(rows).not.toHaveCount(0);
        });

        test('tidak menampilkan user role lain (admin, mitra) di tabel', async ({ page }) => {
            const tableBody = page.locator('tbody');

            await expect(
                tableBody.getByText(SEED_USERS.admin.email),
            ).not.toBeVisible();
            await expect(
                tableBody.getByText(SEED_USERS.mitra.email),
            ).not.toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Search Behavior
    |--------------------------------------------------------------------------
    */

    test.describe('Search', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/clients', { waitUntil: 'domcontentloaded' });
        });

        test('search by name menampilkan hasil yang sesuai', async ({ page }) => {
            await performSearch(page, 'Budi Client');

            await expect(
                page.getByText(SEED_CLIENT.name, { exact: true }).first(),
            ).toBeVisible();
        });

        test('search by email menampilkan hasil yang sesuai', async ({ page }) => {
            await performSearch(page, 'client@titiktemu.test');

            await expect(
                page.getByText(SEED_CLIENT.name, { exact: true }).first(),
            ).toBeVisible();
        });

        test('search by username menampilkan hasil yang sesuai', async ({ page }) => {
            await performSearch(page, 'budiclient');

            await expect(
                page.getByText(SEED_CLIENT.name, { exact: true }).first(),
            ).toBeVisible();
        });

        test('search case-insensitive', async ({ page }) => {
            await performSearch(page, 'BUDI');

            await expect(
                page.getByText(SEED_CLIENT.name, { exact: true }).first(),
            ).toBeVisible();
        });

        test('search tanpa hasil menampilkan empty state', async ({ page }) => {
            await performSearch(page, 'tidak-ada-client-xyz-123');

            await expect(
                page.getByText(/Tidak ada hasil ditemukan/i).first(),
            ).toBeVisible();
            await expect(
                page.getByText(/Tidak ditemukan client dengan kata kunci/i).first(),
            ).toBeVisible();
        });

        test('tombol clear search muncul saat ada keyword', async ({ page }) => {
            await performSearch(page, 'Budi');

            const clearButton = page.getByLabel('Hapus pencarian');
            await expect(clearButton).toBeVisible();
        });

        test('klik clear search mengosongkan input dan reset hasil', async ({ page }) => {
            await performSearch(page, 'Budi');
            await expect(
                page.locator('input[placeholder*="Cari"]'),
            ).toHaveValue('Budi');

            await page.getByLabel('Hapus pencarian').click();

            await expect(
                page.locator('input[placeholder*="Cari"]'),
            ).toHaveValue('');
            await expect(
                page.getByText(SEED_CLIENT.name, { exact: true }).first(),
            ).toBeVisible();
        });

        test('search tersimpan di URL (shareable)', async ({ page }) => {
            await performSearch(page, 'Budi');

            await page.reload();
            await expect(
                page.locator('input[placeholder*="Cari"]'),
            ).toHaveValue('Budi');
            await expect(
                page.getByText(SEED_CLIENT.name, { exact: true }).first(),
            ).toBeVisible();
        });

        test('empty state punya tombol "Hapus Pencarian"', async ({ page }) => {
            await performSearch(page, 'tidak-ada-client-xyz-123');

            await expect(
                page.getByRole('button', { name: 'Hapus Pencarian', exact: true }),
            ).toBeVisible();
        });

        test('klik "Hapus Pencarian" di empty state reset hasil', async ({ page }) => {
            await performSearch(page, 'tidak-ada-client-xyz-123');
            await expect(
                page.getByText(/Tidak ada hasil ditemukan/i).first(),
            ).toBeVisible();

            await page
                .getByRole('button', { name: 'Hapus Pencarian', exact: true })
                .click();

            await expect(
                page.getByText(SEED_CLIENT.name, { exact: true }).first(),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Pagination
    |--------------------------------------------------------------------------
    */

    test.describe('Pagination', () => {
        test.slow();
        test('tidak menampilkan pagination jika client <= per_page', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await page.goto('/admin/clients', { waitUntil: 'domcontentloaded' });

            await expect(
                page.getByText(/Menampilkan \d+–\d+ dari \d+ client/i).first(),
            ).not.toBeVisible();
        });

        test('menampilkan pagination jika client > per_page', async ({
            page,
            browser,
            asAdmin,
        }) => {
            for (let i = 0; i < 20; i++) {
                await registerClientViaAPI(browser, {
                    name: `Test Client ${i}`,
                    username: uniqueUsername(`tc${i}`),
                    email: uniqueEmail(`tc${i}`),
                });
            }

            await asAdmin();
            await page.goto('/admin/clients', { waitUntil: 'domcontentloaded' });

            await expect(
                page.getByText(/Menampilkan \d+–\d+ dari \d+ client/i).first(),
            ).toBeVisible({ timeout: 10_000 });

            const paginationLinks = page.locator(
                'a[href*="/admin/clients?page="], a[href*="page="]',
            );
            await expect(paginationLinks).not.toHaveCount(0);
        });

        test('total client di badge sesuai dengan data', async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/clients', { waitUntil: 'domcontentloaded' });

            const badgeText = await page
                .locator('text=/\\d+ Client Terdaftar/i')
                .first()
                .textContent();

            const total = Number(badgeText?.match(/\d+/)?.[0] ?? 0);
            expect(total).toBeGreaterThan(0);
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Read-Only Behavior
    |--------------------------------------------------------------------------
    */

    test.describe('Read-Only', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/clients', { waitUntil: 'domcontentloaded' });
        });

        test('tidak ada link/form untuk edit client', async ({ page }) => {
            await expect(
                page.locator('a[href*="/admin/clients/"][href*="/edit"]'),
            ).not.toBeVisible();
        });

        test('tidak ada tombol delete di row', async ({ page }) => {
            await expect(
                page.locator('button:has-text("Hapus")'),
            ).not.toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Accessibility (a11y)
    |--------------------------------------------------------------------------
    */

    test.describe('Accessibility', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/clients', { waitUntil: 'domcontentloaded' });
        });

        test('tabel menggunakan semantic HTML', async ({ page }) => {
            await expect(page.locator('table')).toBeVisible();
            await expect(page.locator('thead')).toBeVisible();
            await expect(page.locator('tbody')).toBeVisible();
        });

        test('input search punya placeholder yang deskriptif', async ({ page }) => {
            await expect(
                page.locator('input[placeholder*="Cari"]'),
            ).toHaveAttribute('placeholder', /Cari nama, email, atau username/i);
        });

        test('tombol clear search punya aria-label', async ({ page }) => {
            await performSearch(page, 'Budi');

            await expect(
                page.getByLabel('Hapus pencarian'),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Role-Based Data Filter
    |--------------------------------------------------------------------------
    */

    test.describe('Role Filter', () => {
        test('hanya menampilkan user dengan role=client', async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/clients', { waitUntil: 'domcontentloaded' });

            const emails = await page
                .locator('tbody tr td p:last-child')
                .allTextContents();

            for (const email of emails) {
                expect(email.trim()).not.toBe(SEED_USERS.admin.email);
                expect(email.trim()).not.toBe(SEED_USERS.mitra.email);
            }
        });
    });
});