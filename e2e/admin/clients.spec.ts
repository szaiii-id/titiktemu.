import { test, expect, SEED_USERS, uniqueEmail, uniqueUsername } from '../fixtures/auth';
import type { Browser } from '@playwright/test';

/**
 * Admin — Daftar Client
 *
 * Route: GET /admin/clients  → Admin\ClientController@index
 *
 * Behavior:
 * - Read-only list client (role=client)
 * - Search: nama, email, username (debounced 300ms)
 * - Pagination: default per_page=15
 * - Filter: query string `?search=...&per_page=...`
 *
 * Seed user client (dari UserSeeder):
 * - client@titiktemu.test / budiclient / "Budi Client"
 *
 * CATATAN PENTING:
 * - Halaman ini READ-ONLY, tidak ada form submit.
 * - Test "pagination" butuh >15 client. Kita register client baru
 *   via API /register langsung (bypass UI) supaya cepat.
 * - Test "search" pakai seed client (Budi Client).
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
/**
 * Register client baru via HTTP (bypass UI) — untuk seeding banyak data.
 *
 * ✅ OPSI A: Pakai browser.newContext() untuk tiap register.
 *
 * Kenapa?
 * - Setelah register #1, session browser otomatis login sebagai user #1.
 * - Register #2 akan kena middleware `guest` (redirect ke dashboard),
 *   sehingga user #2 TIDAK ter-register.
 * - Solusi: setiap register pakai context baru (session fresh = state guest).
 *
 * Kelebihan:
 * - Terisolasi sempurna, tidak ada state leak
 * - Tidak perlu tambah route test khusus
 * - Cermin real-world flow (guest → register)
 *
 * Kekurangan:
 * - Lebih lambat (~500ms per register vs ~50ms untuk endpoint khusus)
 * - 20x register ≈ 10 detik
 */
async function registerClientViaAPI(
    browser: Browser,
    data: { name: string; username: string; email: string },
): Promise<void> {
    // Context baru = session fresh = state guest
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        // Buka /register untuk dapat CSRF token di context baru
        await page.goto('/register');
        const csrfToken = await page.evaluate(() => {
            const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
            return match ? decodeURIComponent(match[1]) : '';
        });

        // POST /register langsung ke server (bypass Inertia)
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
        // Selalu tutup context, apapun yang terjadi
        await context.close();
    }
}

/**
 * Isi search field dan tunggu response Inertia selesai.
 */
async function performSearch(page: any, query: string): Promise<void> {
    await Promise.all([
        page.waitForResponse(
            (resp: any) =>
                resp.url().includes('/admin/clients') &&
                resp.request().method() === 'GET' &&
                resp.url().includes('search='),
            { timeout: 15_000 },
        ),
        page.fill('input[placeholder*="Cari"]', query),
    ]);
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
        await page.goto('/admin/clients');
        await expect(page).toHaveURL('/login');
    });

    test('client tidak bisa akses halaman daftar client', async ({ page, asClient }) => {
        await asClient();
        await page.goto('/admin/clients');
        await expect(page).toHaveURL('/client/dashboard');
    });

    test('mitra tidak bisa akses halaman daftar client', async ({ page, asMitra }) => {
        await asMitra();
        await page.goto('/admin/clients');
        await expect(page).toHaveURL('/mitra/dashboard');
    });

    test('admin bisa akses halaman daftar client', async ({ page, asAdmin }) => {
        await asAdmin();
        await page.goto('/admin/clients');
        await expect(page).toHaveURL('/admin/clients');
    });

    /*
    |--------------------------------------------------------------------------
    | Contract — Elemen Halaman
    |--------------------------------------------------------------------------
    */

    test.describe('Elemen Halaman', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/clients');
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
            await expect(page.getByText(/Client Terdaftar/i)).toBeVisible();
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
            await expect(page.getByText(/Mode Read-only/i)).toBeVisible();
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
            // Halaman read-only — tidak boleh ada tombol edit/hapus
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
            await page.goto('/admin/clients');
        });

        test('menampilkan seed client (Budi Client)', async ({ page }) => {
            await expect(
                page.getByText(SEED_CLIENT.name, { exact: true }),
            ).toBeVisible();
        });

        test('menampilkan email seed client', async ({ page }) => {
            await expect(
                page.getByText(SEED_CLIENT.email),
            ).toBeVisible();
        });

        test('menampilkan username seed client dengan @ prefix', async ({ page }) => {
            await expect(
                page.getByText(`@${SEED_CLIENT.username}`),
            ).toBeVisible();
        });

        test('menampilkan minimal 1 row data', async ({ page }) => {
            const rows = page.locator('tbody tr');
            await expect(rows).not.toHaveCount(0);
        });

        test('tidak menampilkan user role lain (admin, mitra) di tabel', async ({ page }) => {
            // ✅ Scope ke tbody, karena email admin/mitra tetap muncul
            // di sidebar dan topbar (karena admin yang login).
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
            await page.goto('/admin/clients');
        });

        test('search by name menampilkan hasil yang sesuai', async ({ page }) => {
            await performSearch(page, 'Budi Client');

            await expect(page).toHaveURL(/search=Budi/i);
            await expect(
                page.getByText(SEED_CLIENT.name, { exact: true }),
            ).toBeVisible();
        });

        test('search by email menampilkan hasil yang sesuai', async ({ page }) => {
            await performSearch(page, 'client@titiktemu.test');

            await expect(
                page.getByText(SEED_CLIENT.name, { exact: true }),
            ).toBeVisible();
        });

        test('search by username menampilkan hasil yang sesuai', async ({ page }) => {
            await performSearch(page, 'budiclient');

            await expect(
                page.getByText(SEED_CLIENT.name, { exact: true }),
            ).toBeVisible();
        });

        test('search case-insensitive', async ({ page }) => {
            await performSearch(page, 'BUDI');

            await expect(
                page.getByText(SEED_CLIENT.name, { exact: true }),
            ).toBeVisible();
        });

        test('search tanpa hasil menampilkan empty state', async ({ page }) => {
            await performSearch(page, 'tidak-ada-client-xyz-123');

            await expect(
                page.getByText(/Tidak ada hasil ditemukan/i),
            ).toBeVisible();
            await expect(
                page.getByText(/Tidak ditemukan client dengan kata kunci/i),
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

            // Klik clear (yang di dalam input)
            await page.getByLabel('Hapus pencarian').click();

            await expect(
                page.locator('input[placeholder*="Cari"]'),
            ).toHaveValue('');
            await expect(
                page.getByText(SEED_CLIENT.name, { exact: true }),
            ).toBeVisible();
        });

        test('search tersimpan di URL (shareable)', async ({ page }) => {
            await performSearch(page, 'Budi');

            await expect(page).toHaveURL(/search=Budi/i);

            // Reload — hasil tetap sama
            await page.reload();
            await expect(
                page.locator('input[placeholder*="Cari"]'),
            ).toHaveValue('Budi');
            await expect(
                page.getByText(SEED_CLIENT.name, { exact: true }),
            ).toBeVisible();
        });

        test('empty state punya tombol "Hapus Pencarian"', async ({ page }) => {
            await performSearch(page, 'tidak-ada-client-xyz-123');

            // ✅ Pakai exact match (case-sensitive) untuk bedakan
            // dari tombol clear input yang punya aria-label="Hapus pencarian"
            // (lowercase p).
            await expect(
                page.getByRole('button', { name: 'Hapus Pencarian', exact: true }),
            ).toBeVisible();
        });

        test('klik "Hapus Pencarian" di empty state reset hasil', async ({ page }) => {
            await performSearch(page, 'tidak-ada-client-xyz-123');
            await expect(
                page.getByText(/Tidak ada hasil ditemukan/i),
            ).toBeVisible();

            // ✅ Pakai exact match
            await page
                .getByRole('button', { name: 'Hapus Pencarian', exact: true })
                .click();

            await expect(
                page.getByText(SEED_CLIENT.name, { exact: true }),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Pagination
    |--------------------------------------------------------------------------
    |
    | CATATAN: Seed cuma punya 1 client. Untuk test pagination, kita
    | register client baru via API supaya total > 15 (default per_page).
    |
    | ✅ OPSI A: Pakai browser.newContext() per register (lihat helper).
    | Tidak perlu logout dulu karena context-nya fresh.
    |--------------------------------------------------------------------------
    */

    test.describe('Pagination', () => {
        test('tidak menampilkan pagination jika client <= per_page', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await page.goto('/admin/clients');

            // Dengan seed 1 client, pagination tidak boleh muncul
            await expect(
                page.getByText(/Menampilkan \d+–\d+ dari \d+ client/i),
            ).not.toBeVisible();
        });

        test('menampilkan pagination jika client > per_page', async ({
            page,
            browser,
            asAdmin,
        }) => {
            // Register 20 client, tiap register pakai context baru
            // (tidak perlu logout dulu — context-nya fresh)
            for (let i = 0; i < 20; i++) {
                await registerClientViaAPI(browser, {
                    name: `Test Client ${i}`,
                    username: uniqueUsername(`tc${i}`),
                    email: uniqueEmail(`tc${i}`),
                });
            }

            // Login admin
            await asAdmin();
            await page.goto('/admin/clients');

            // Debug: log total client
            const badgeText = await page
                .locator('text=/\\d+ Client Terdaftar/i')
                .first()
                .textContent();
            console.log(`[E2E] Total client setelah register 20: ${badgeText}`);

            // Info pagination muncul (>15 client)
            await expect(
                page.getByText(/Menampilkan \d+–\d+ dari \d+ client/i),
            ).toBeVisible({ timeout: 10_000 });

            // Ada tombol next/prev
            const paginationLinks = page.locator(
                'a[href*="/admin/clients?page="], a[href*="page="]',
            );
            await expect(paginationLinks).not.toHaveCount(0);
        });

        test('total client di badge sesuai dengan data', async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/clients');

            // Ambil angka dari badge
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
            await page.goto('/admin/clients');
        });

        test('tidak ada link/form untuk edit client', async ({ page }) => {
            // Tidak ada route edit untuk client (read-only)
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
            await page.goto('/admin/clients');
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
            await page.goto('/admin/clients');

            // Ambil semua email yang muncul di tabel
            const emails = await page
                .locator('tbody tr td p:last-child')
                .allTextContents();

            // Setiap email tidak boleh = admin atau mitra
            for (const email of emails) {
                expect(email.trim()).not.toBe(SEED_USERS.admin.email);
                expect(email.trim()).not.toBe(SEED_USERS.mitra.email);
            }
        });
    });
});