import { test, expect, SEED_PACKAGES, packageKode } from '../fixtures/auth';
import { APP_URL } from '../config';
import AxeBuilder from '@axe-core/playwright';
import type { Locator, Page } from '@playwright/test';

/**
 * Admin — Paket Wisata (Index)
 *
 * ⚠️ FIX #1: performSearch, clickStatusTab, selectKategori — ganti waitForResponse ke expect.poll URL params
 * ⚠️ FIX #2: Text empty state disesuaikan dengan Svelte
 * ⚠️ FIX #3: clickStatusTab — skip jika tab count 0 (tab "Arsip" tidak trigger router)
 * ⚠️ FIX #4: performSearch — tunggu input ready + terisi sebelum polling
 *           (anti race hydration: fill() sebelum handler siap → query kosong)
 * ⚠️ FIX #5: clickStatusTab & selectKategori — tunggu hydration + verifikasi
 *           nilai sebelum polling URL (anti race serupa)
 */

// ==========================================
// KONSTANTA
// ==========================================

const SEED_PACKAGES_DATA = {
    pasarTerapung: {
        kode: packageKode(SEED_PACKAGES.pasarTerapung.kodeSuffix),
        nama: SEED_PACKAGES.pasarTerapung.nama,
        status: 'aktif' as const,
        kategori: 'budaya' as const,
        kategoriLabel: 'Budaya',
        durasiLabel: '2D1N',
        hargaOrang: 'Rp 850.000',
    },
    hutanKalimantan: {
        kode: packageKode(SEED_PACKAGES.hutanKalimantan.kodeSuffix),
        nama: SEED_PACKAGES.hutanKalimantan.nama,
        status: 'aktif' as const,
        kategori: 'petualangan' as const,
        kategoriLabel: 'Petualangan',
        durasiLabel: '3D2N',
        hargaOrang: 'Rp 1.500.000',
    },
    kulinerBanjarmasin: {
        kode: packageKode(SEED_PACKAGES.kulinerBanjarmasin.kodeSuffix),
        nama: SEED_PACKAGES.kulinerBanjarmasin.nama,
        status: 'draft' as const,
        kategori: 'kuliner' as const,
        kategoriLabel: 'Kuliner',
        durasiLabel: '1 Hari',
        hargaOrang: 'Rp 350.000',
    },
} as const;

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

/**
 * ✅ FIX #4: performSearch — anti race hydration.
 *
 * 1. Tunggu networkidle (hydration selesai)
 * 2. Tunggu input visible & enabled
 * 3. Isi input, lalu VERIFIKASI nilai benar-benar masuk
 * 4. Baru polling URL
 */
async function performSearch(page: Page, query: string): Promise<void> {
    await page.waitForLoadState('networkidle', { timeout: 15_000 });

    const input = page.locator('input[placeholder*="Cari"]');
    await input.waitFor({ state: 'visible', timeout: 10_000 });
    await expect(input).toBeEnabled({ timeout: 5_000 });

    await input.fill(query);
    await expect(input).toHaveValue(query, { timeout: 5_000 });

    await expect
        .poll(
            () => new URL(page.url()).searchParams.get('search') ?? '',
            { timeout: 15_000, intervals: [100, 200, 500] },
        )
        .toBe(query);
}

/**
 * ✅ FIX #5: clickStatusTab — anti race hydration + cek count 0.
 *
 * 1. Tunggu networkidle
 * 2. Tunggu tab visible & enabled
 * 3. Klik tab
 * 4. Jika count 0 (Arsip kosong) → Svelte tidak trigger router → return
 * 5. Jika count > 0 → polling URL sampai status berubah
 */
async function clickStatusTab(page: Page, label: string): Promise<void> {
    await page.waitForLoadState('networkidle', { timeout: 15_000 });

    const tab = page
        .getByRole('tab', { name: new RegExp(`^${label}`, 'i') })
        .first();

    await tab.waitFor({ state: 'visible', timeout: 10_000 });
    await expect(tab).toBeEnabled({ timeout: 5_000 });

    // Baca count sebelum klik
    const tabText = await tab.textContent();
    const countMatch = tabText?.match(/\((\d+)\)/);
    const count = countMatch ? Number(countMatch[1]) : -1;

    await tab.click();

    if (count === 0) {
        // Tab kosong → Svelte tidak trigger router
        return;
    }

    await expect
        .poll(
            () => new URL(page.url()).searchParams.get('status') ?? '',
            { timeout: 15_000, intervals: [100, 200, 500] },
        )
        .not.toBe('');
}

/**
 * ✅ FIX #5: selectKategori — anti race hydration.
 *
 * 1. Tunggu networkidle
 * 2. Tunggu select visible & enabled
 * 3. selectOption + VERIFIKASI nilai terpilih
 * 4. Baru polling URL
 */
async function selectKategori(page: Page, kategori: string): Promise<void> {
    await page.waitForLoadState('networkidle', { timeout: 15_000 });

    const select = page
        .locator('select[aria-label*="kategori"], select')
        .first();

    await select.waitFor({ state: 'visible', timeout: 10_000 });
    await expect(select).toBeEnabled({ timeout: 5_000 });

    await select.selectOption(kategori);
    await expect(select).toHaveValue(kategori, { timeout: 5_000 });

    await expect
        .poll(
            () => new URL(page.url()).searchParams.get('kategori') ?? '',
            { timeout: 15_000, intervals: [100, 200, 500] },
        )
        .toBe(kategori);
}

function rowByKode(page: Page, kode: string) {
    return page.locator('tbody tr').filter({ hasText: kode });
}

// ==========================================
// TEST SUITE
// ==========================================

test.describe('Admin — Paket Wisata (Index)', () => {
    test('guest tidak bisa akses index paket', async ({ page, asGuest }) => {
        await asGuest();
        await page.goto('/admin/packages', { waitUntil: 'domcontentloaded' });
        await expectPagePath(page, '/login');
    });

    test('client tidak bisa akses index paket', async ({ page, asClient }) => {
        await asClient();
        await page.goto('/admin/packages', { waitUntil: 'domcontentloaded' });
        await expectPagePath(page, '/client/dashboard');
    });

    test('mitra tidak bisa akses index paket', async ({ page, asMitra }) => {
        await asMitra();
        await page.goto('/admin/packages', { waitUntil: 'domcontentloaded' });
        await expectPagePath(page, '/mitra/dashboard');
    });

    test('admin bisa akses index paket', async ({ page, asAdmin }) => {
        await asAdmin();
        await page.goto('/admin/packages', { waitUntil: 'domcontentloaded' });
        await expectPagePath(page, '/admin/packages');
    });

    test.describe('Elemen Halaman', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/packages', { waitUntil: 'domcontentloaded' });
        });

        test('menampilkan heading "Paket Wisata"', async ({ page }) => {
            await expect(
                page.getByRole('heading', { name: /^Paket Wisata$/i }).first(),
            ).toBeVisible();
        });

        test('menampilkan deskripsi halaman', async ({ page }) => {
            await expect(
                page.getByText(/Kelola paket wisata, itinerary, HPP, dan fasilitas/i).first(),
            ).toBeVisible();
        });

        test('menampilkan tombol "Tambah Paket"', async ({ page }) => {
            await expect(
                page.getByRole('link', { name: /Tambah Paket/i }),
            ).toBeVisible();
        });

        test('tombol "Tambah Paket" mengarah ke /admin/packages/create', async ({ page }) => {
            await expect(
                page.getByRole('link', { name: /Tambah Paket/i }),
            ).toHaveAttribute('href', /\/admin\/packages\/create$/);
        });

        test('menampilkan input search', async ({ page }) => {
            const search = page.locator('input[placeholder*="Cari"]');
            await expect(search).toBeVisible();
            await expect(search).toHaveAttribute(
                'placeholder',
                /Cari nama, kode, atau deskripsi/i,
            );
        });

        test('menampilkan 3 status tab: Semua, Draft, Aktif, Arsip', async ({ page }) => {
            await expect(page.getByRole('tab', { name: /^Semua/i })).toBeVisible();
            await expect(page.getByRole('tab', { name: /^Draft/i })).toBeVisible();
            await expect(page.getByRole('tab', { name: /^Aktif/i })).toBeVisible();
            await expect(page.getByRole('tab', { name: /^Arsip/i })).toBeVisible();
        });

        test('menampilkan dropdown kategori', async ({ page }) => {
            const select = page.locator('select').first();
            await expect(select).toBeVisible();
        });

        test('menampilkan tabel dengan header yang benar', async ({ page }) => {
            await expect(page.getByRole('columnheader', { name: /^Paket$/i })).toBeVisible();
            await expect(page.getByRole('columnheader', { name: /^Kategori$/i })).toBeVisible();
            await expect(page.getByRole('columnheader', { name: /^Durasi$/i })).toBeVisible();
            await expect(page.getByRole('columnheader', { name: /Harga\/Orang/i })).toBeVisible();
            await expect(page.getByRole('columnheader', { name: /^Status$/i })).toBeVisible();
            await expect(page.getByRole('columnheader', { name: /^Aksi$/i })).toBeVisible();
        });
    });

    test.describe('Data Initialization', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/packages', { waitUntil: 'domcontentloaded' });
        });

        test('menampilkan seed paket Pasar Terapung', async ({ page }) => {
            const row = rowByKode(page, SEED_PACKAGES_DATA.pasarTerapung.kode);
            await expect(row).toBeVisible();
            await expect(row).toContainText(SEED_PACKAGES_DATA.pasarTerapung.nama);
        });

        test('menampilkan seed paket Hutan Kalimantan', async ({ page }) => {
            const row = rowByKode(page, SEED_PACKAGES_DATA.hutanKalimantan.kode);
            await expect(row).toBeVisible();
        });

        test('menampilkan seed paket Kuliner Banjarmasin (draft)', async ({ page }) => {
            const row = rowByKode(page, SEED_PACKAGES_DATA.kulinerBanjarmasin.kode);
            await expect(row).toBeVisible();
        });

        test('row paket menampilkan kategori dengan label', async ({ page }) => {
            const row = rowByKode(page, SEED_PACKAGES_DATA.pasarTerapung.kode);
            await expect(row).toContainText(SEED_PACKAGES_DATA.pasarTerapung.kategoriLabel);
        });

        test('row paket menampilkan durasi', async ({ page }) => {
            const row = rowByKode(page, SEED_PACKAGES_DATA.pasarTerapung.kode);
            await expect(row).toContainText(SEED_PACKAGES_DATA.pasarTerapung.durasiLabel);
        });

        test('row paket menampilkan harga per orang', async ({ page }) => {
            const row = rowByKode(page, SEED_PACKAGES_DATA.pasarTerapung.kode);
            await expect(row).toContainText(SEED_PACKAGES_DATA.pasarTerapung.hargaOrang);
        });

        test('row paket menampilkan badge status', async ({ page }) => {
            const rowAktif = rowByKode(page, SEED_PACKAGES_DATA.pasarTerapung.kode);
            await expect(rowAktif.getByText(/^Aktif$/i).first()).toBeVisible();

            const rowDraft = rowByKode(page, SEED_PACKAGES_DATA.kulinerBanjarmasin.kode);
            await expect(rowDraft.getByText(/^Draft$/i).first()).toBeVisible();
        });
    });

    test.describe('Navigasi', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/packages', { waitUntil: 'domcontentloaded' });
        });

        test('klik tombol "Detail" menuju halaman detail paket', async ({ page }) => {
            const row = rowByKode(page, SEED_PACKAGES_DATA.pasarTerapung.kode);
            await row.getByRole('link', { name: /Detail/i }).click();
            await expectPagePath(page, /^\/admin\/packages\/\d+$/);
        });

        test('klik "Tambah Paket" menuju halaman create', async ({ page }) => {
            await page.getByRole('link', { name: /Tambah Paket/i }).click();
            await expectPagePath(page, '/admin/packages/create');
        });
    });

    test.describe('Filter — Status Tabs', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/packages', { waitUntil: 'domcontentloaded' });
        });

        test('tab "Semua" aktif secara default', async ({ page }) => {
            const tab = page.getByRole('tab', { name: /^Semua/i });
            await expect(tab).toHaveClass(/bg-white/);
        });

        test('tab "Aktif" hanya menampilkan paket aktif', async ({ page }) => {
            await clickStatusTab(page, 'Aktif');
            const rowAktif = rowByKode(page, SEED_PACKAGES_DATA.pasarTerapung.kode);
            await expect(rowAktif).toBeVisible();

            const rowDraft = rowByKode(page, SEED_PACKAGES_DATA.kulinerBanjarmasin.kode);
            await expect(rowDraft).not.toBeVisible();
        });

        test('tab "Draft" hanya menampilkan paket draft', async ({ page }) => {
            await clickStatusTab(page, 'Draft');
            const rowDraft = rowByKode(page, SEED_PACKAGES_DATA.kulinerBanjarmasin.kode);
            await expect(rowDraft).toBeVisible();

            const rowAktif = rowByKode(page, SEED_PACKAGES_DATA.pasarTerapung.kode);
            await expect(rowAktif).not.toBeVisible();
        });

        test('tab "Arsip" → empty state (belum ada paket arsip di seed)', async ({ page }) => {
            await clickStatusTab(page, 'Arsip');
            await expect(
                page.getByText(/Tidak ada hasil ditemukan/i).first(),
            ).toBeVisible();
        });
    });

    test.describe('Filter — Kategori', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/packages', { waitUntil: 'domcontentloaded' });
        });

        test('filter kategori "budaya" hanya menampilkan paket budaya', async ({ page }) => {
            await selectKategori(page, 'budaya');
            const rowBudaya = rowByKode(page, SEED_PACKAGES_DATA.pasarTerapung.kode);
            await expect(rowBudaya).toBeVisible();

            const rowPetualangan = rowByKode(page, SEED_PACKAGES_DATA.hutanKalimantan.kode);
            await expect(rowPetualangan).not.toBeVisible();
        });

        test('filter kategori "petualangan" hanya menampilkan paket petualangan', async ({ page }) => {
            await selectKategori(page, 'petualangan');
            const rowPetualangan = rowByKode(page, SEED_PACKAGES_DATA.hutanKalimantan.kode);
            await expect(rowPetualangan).toBeVisible();

            const rowBudaya = rowByKode(page, SEED_PACKAGES_DATA.pasarTerapung.kode);
            await expect(rowBudaya).not.toBeVisible();
        });

        test('filter kategori "wisata_alam" → empty state (tidak ada di seed)', async ({ page }) => {
            await selectKategori(page, 'wisata_alam');
            await expect(
                page.getByText(/Tidak ada hasil ditemukan/i).first(),
            ).toBeVisible();
        });
    });

    test.describe('Filter — Search', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/packages', { waitUntil: 'domcontentloaded' });
        });

        test('search by nama paket menampilkan hasil yang sesuai', async ({ page }) => {
            await performSearch(page, 'Pasar Terapung');
            const row = rowByKode(page, SEED_PACKAGES_DATA.pasarTerapung.kode);
            await expect(row).toBeVisible();

            const otherRow = rowByKode(page, SEED_PACKAGES_DATA.hutanKalimantan.kode);
            await expect(otherRow).not.toBeVisible();
        });

        test('search by kode menampilkan hasil yang sesuai', async ({ page }) => {
            await performSearch(page, SEED_PACKAGES_DATA.pasarTerapung.kode);
            const row = rowByKode(page, SEED_PACKAGES_DATA.pasarTerapung.kode);
            await expect(row).toBeVisible();
        });

        test('search case-insensitive', async ({ page }) => {
            await performSearch(page, 'PASAR');
            const row = rowByKode(page, SEED_PACKAGES_DATA.pasarTerapung.kode);
            await expect(row).toBeVisible();
        });

        test('search tanpa hasil → empty state', async ({ page }) => {
            await performSearch(page, 'tidak-ada-paket-xyz-123');
            await expect(
                page.getByText(/Tidak ada hasil ditemukan/i).first(),
            ).toBeVisible();
            await expect(
                page.getByText(/Tidak ditemukan paket dengan filter yang Anda pilih/i).first(),
            ).toBeVisible();
        });

        test('empty state punya tombol "Hapus Pencarian"', async ({ page }) => {
            await performSearch(page, 'tidak-ada-paket-xyz-123');
            await expect(
                page.getByRole('button', { name: 'Hapus Pencarian', exact: true }),
            ).toBeVisible();
        });

        test('klik "Hapus Pencarian" reset hasil', async ({ page }) => {
            await performSearch(page, 'tidak-ada-paket-xyz-123');
            await expect(
                page.getByText(/Tidak ada hasil ditemukan/i).first(),
            ).toBeVisible();

            await page.getByRole('button', { name: 'Hapus Pencarian', exact: true }).click();
            const row = rowByKode(page, SEED_PACKAGES_DATA.pasarTerapung.kode);
            await expect(row).toBeVisible();
        });
    });

    test.describe('Error Handling — Empty State', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/packages', { waitUntil: 'domcontentloaded' });
        });

        test('empty state menampilkan pesan human-readable', async ({ page }) => {
            await performSearch(page, 'tidak-ada-xyz-999');
            await expect(
                page.getByText(/Tidak ada hasil ditemukan/i).first(),
            ).toBeVisible();
            await expect(
                page.getByText(/Tidak ditemukan paket dengan filter yang Anda pilih/i).first(),
            ).toBeVisible();
        });
    });

    test.describe('Accessibility', () => {
        test('halaman index paket tidak punya pelanggaran WCAG kritis', async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/packages', { waitUntil: 'domcontentloaded' });
            await page.waitForLoadState('networkidle', { timeout: 15_000 });

            const results = await new AxeBuilder({ page })
                .withTags(['wcag2a', 'wcag2aa'])
                .disableRules(['region', 'landmark-one-main'])
                .analyze();

            const critical = results.violations.filter((v) =>
                ['critical', 'serious'].includes(v.impact ?? ''),
            );
            expect(critical).toEqual([]);
        });

        test('tabel pakai semantic HTML', async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/packages', { waitUntil: 'domcontentloaded' });
            await expect(page.locator('table')).toBeVisible();
            await expect(page.locator('thead')).toBeVisible();
            await expect(page.locator('tbody')).toBeVisible();
        });

        test('tombol action punya aria-label', async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/packages', { waitUntil: 'domcontentloaded' });
            await expect(page.getByLabel('Lihat detail paket').first()).toBeVisible();
            await expect(page.getByLabel('Hapus paket').first()).toBeVisible();
        });

        test('search input punya placeholder deskriptif', async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/packages', { waitUntil: 'domcontentloaded' });
            await expect(
                page.locator('input[placeholder*="Cari"]'),
            ).toHaveAttribute('placeholder', /Cari nama, kode, atau deskripsi/i);
        });
    });

    test.describe('Responsive — Mobile Viewport', () => {
        test('halaman index paket usable di viewport mobile', async ({ page, asAdmin }) => {
            await asAdmin();
            await page.setViewportSize({ width: 375, height: 812 });
            await page.goto('/admin/packages', { waitUntil: 'domcontentloaded' });
            await expect(
                page.locator('input[placeholder*="Cari"]'),
            ).toBeVisible();

            const row = rowByKode(page, SEED_PACKAGES_DATA.pasarTerapung.kode);
            await expect(row).toBeVisible();
        });
    });

    test.describe.serial('Mutation — Hapus Paket', () => {
        test('admin bisa hapus paket draft (belum punya booking)', async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/packages', { waitUntil: 'domcontentloaded' });

            const row = rowByKode(page, SEED_PACKAGES_DATA.kulinerBanjarmasin.kode);
            await expect(row).toBeVisible();

            await row.getByLabel('Hapus paket').click();
            await expect(page.getByRole('heading', { name: /Hapus Paket\?/i })).toBeVisible();

            await Promise.all([
                page.waitForResponse(
                    (resp) =>
                        resp.url().includes('/admin/packages/') &&
                        resp.request().method() === 'DELETE',
                    { timeout: 15_000 },
                ),
                page.getByRole('button', { name: /Ya, Hapus/i }).click(),
            ]);

            await expect(page).toHaveURL('/admin/packages', { timeout: 15_000 });
            await expect(page.getByText(/Paket berhasil dihapus/i)).toBeVisible({ timeout: 10_000 });

            const deletedRow = rowByKode(page, SEED_PACKAGES_DATA.kulinerBanjarmasin.kode);
            await expect(deletedRow).not.toBeVisible();
        });

        test('admin TIDAK bisa hapus paket yang punya booking → flash error', async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/packages', { waitUntil: 'domcontentloaded' });

            const row = rowByKode(page, SEED_PACKAGES_DATA.pasarTerapung.kode);
            await expect(row).toBeVisible();

            await row.getByLabel('Hapus paket').click();
            await expect(page.getByRole('heading', { name: /Hapus Paket\?/i })).toBeVisible();

            await Promise.all([
                page.waitForResponse(
                    (resp) =>
                        resp.url().includes('/admin/packages/') &&
                        resp.request().method() === 'DELETE',
                    { timeout: 15_000 },
                ),
                page.getByRole('button', { name: /Ya, Hapus/i }).click(),
            ]);

            await expect(page).toHaveURL('/admin/packages', { timeout: 15_000 });
            await expect(page.getByText(/tidak bisa dihapus/i).first()).toBeVisible({ timeout: 10_000 });

            const stillExists = rowByKode(page, SEED_PACKAGES_DATA.pasarTerapung.kode);
            await expect(stillExists).toBeVisible();
        });
    });
});