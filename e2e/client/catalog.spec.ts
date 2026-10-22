import { test, expect } from '../fixtures/auth';
import {
    SEED_PACKAGES,
    packageKode,
} from '../fixtures/auth';
import { APP_URL } from '../config';
import AxeBuilder from '@axe-core/playwright';
import type { Locator, Page } from '@playwright/test';

/**
 * Client — Katalog Paket (DEBUG VERSION)
 *
 * ⚠️ FIX #1: emptyState.locator('svg') — strict mode (2 SVG) → .first()
 * ⚠️ FIX #2: expectPath() — toleran absolute URL (Ziggy)
 * ⚠️ FIX #3: performSearch/selectKategori/selectSort — 4 LAPIS TUNGGU
 *           (networkidle + toBeEnabled + toHaveValue + polling URL)
 *           — anti hydration race
 * ⚠️ FIX #4: toHaveURL → expectPagePath (toleran absolute)
 * ⚠️ FIX #5: CTA href regex — polling
 * 🔍 DEBUG: console.log di setiap langkah filter — untuk lihat persis
 *           di mana gagal (nilai select, URL sebelum/sesudah)
 */

// ==========================================
// HELPER
// ==========================================

async function expectPath(locator: Locator, expectedPath: string | RegExp): Promise<void> {
    const href = await locator.getAttribute('href');
    expect(href).not.toBeNull();
    const actualPath = new URL(href!, APP_URL).pathname;

    if (typeof expectedPath === 'string') {
        expect(actualPath).toBe(expectedPath);
    } else {
        expect(actualPath).toMatch(expectedPath);
    }
}

async function expectPagePath(page: Page, expectedPath: string | RegExp): Promise<void> {
    await expect
        .poll(
            () => {
                const path = new URL(page.url()).pathname;
                if (typeof expectedPath === 'string') {
                    return path === expectedPath;
                }
                return expectedPath.test(path);
            },
            { timeout: 10_000, intervals: [100, 200, 500] },
        )
        .toBe(true);
}

/**
 * ✅ FIX #3 + 🔍 DEBUG: performSearch — 4 lapis tunggu + log.
 */
async function performSearch(page: Page, query: string): Promise<void> {
    console.log(`\n[DEBUG performSearch] query="${query}"`);

    // ✅ 1. Tunggu hydration selesai
    console.log('[DEBUG performSearch] waitForLoadState(networkidle)...');
    await page.waitForLoadState('networkidle', { timeout: 15_000 });
    console.log('[DEBUG performSearch] ✅ networkidle');

    const input = page.locator('input[placeholder*="Cari"]');

    // ✅ 2. Tunggu input visible & enabled
    await input.waitFor({ state: 'visible', timeout: 10_000 });
    await expect(input).toBeEnabled({ timeout: 5_000 });
    console.log('[DEBUG performSearch] ✅ input visible & enabled');

    // ✅ 3. Isi input + verifikasi nilai masuk
    await input.fill(query);
    await expect(input).toHaveValue(query, { timeout: 5_000 });
    console.log(`[DEBUG performSearch] ✅ input.fill("${query}") — value terverifikasi`);

    // ✅ 4. Tunggu handler trigger URL update
    await expect
        .poll(
            () => new URL(page.url()).searchParams.get('search') ?? '',
            { timeout: 15_000, intervals: [100, 200, 500] },
        )
        .toBe(query);
    console.log(`[DEBUG performSearch] ✅ URL search="${query}" — OK\n`);
}

/**
 * ✅ FIX #3 + 🔍 DEBUG: selectKategori — 4 lapis tunggu + log.
 */
async function selectKategori(page: Page, kategori: string): Promise<void> {
    console.log(`\n[DEBUG selectKategori] kategori="${kategori}"`);

    // ✅ 1. Tunggu hydration selesai
    console.log('[DEBUG selectKategori] waitForLoadState(networkidle)...');
    await page.waitForLoadState('networkidle', { timeout: 15_000 });
    console.log('[DEBUG selectKategori] ✅ networkidle');

    const select = page.locator('select[aria-label="Filter kategori"]');

    // ✅ 2. Tunggu select visible & enabled
    await select.waitFor({ state: 'visible', timeout: 10_000 });
    await expect(select).toBeEnabled({ timeout: 5_000 });
    console.log('[DEBUG selectKategori] ✅ select visible & enabled');

    // 🔍 DEBUG: cek nilai select SEBELUM selectOption
    const valueBefore = await select.inputValue();
    const urlBefore = page.url();
    console.log(`[DEBUG selectKategori] SEBELUM: value="${valueBefore}", url="${urlBefore}"`);

    // ✅ 3. selectOption + verifikasi nilai benar-benar masuk
    await select.selectOption(kategori);

    // 🔍 DEBUG: cek nilai select SESUDAH selectOption
    const valueAfter = await select.inputValue();
    console.log(`[DEBUG selectKategori] SESUDAH selectOption: value="${valueAfter}"`);

    await expect(select).toHaveValue(kategori, { timeout: 5_000 });
    console.log(`[DEBUG selectKategori] ✅ select value terverifikasi = "${kategori}"`);

    // ✅ 4. Tunggu handler trigger URL update
    await expect
        .poll(
            () => new URL(page.url()).searchParams.get('kategori') ?? '',
            { timeout: 15_000, intervals: [100, 200, 500] },
        )
        .toBe(kategori);
    console.log(`[DEBUG selectKategori] ✅ URL kategori="${kategori}" — OK\n`);
}

/**
 * ✅ FIX #3 + 🔍 DEBUG: selectSort — 4 lapis tunggu + log.
 */
async function selectSort(page: Page, sort: string): Promise<void> {
    console.log(`\n[DEBUG selectSort] sort="${sort}"`);

    // ✅ 1. Tunggu hydration selesai
    console.log('[DEBUG selectSort] waitForLoadState(networkidle)...');
    await page.waitForLoadState('networkidle', { timeout: 15_000 });
    console.log('[DEBUG selectSort] ✅ networkidle');

    const select = page.locator('select[aria-label="Urutkan"]');

    // ✅ 2. Tunggu select visible & enabled
    await select.waitFor({ state: 'visible', timeout: 10_000 });
    await expect(select).toBeEnabled({ timeout: 5_000 });
    console.log('[DEBUG selectSort] ✅ select visible & enabled');

    // 🔍 DEBUG: cek nilai select SEBELUM selectOption
    const valueBefore = await select.inputValue();
    console.log(`[DEBUG selectSort] SEBELUM: value="${valueBefore}"`);

    // ✅ 3. selectOption + verifikasi nilai benar-benar masuk
    await select.selectOption(sort);

    // 🔍 DEBUG: cek nilai select SESUDAH selectOption
    const valueAfter = await select.inputValue();
    console.log(`[DEBUG selectSort] SESUDAH selectOption: value="${valueAfter}"`);

    await expect(select).toHaveValue(sort, { timeout: 5_000 });
    console.log(`[DEBUG selectSort] ✅ select value terverifikasi = "${sort}"`);

    // ✅ 4. Tunggu handler trigger URL update
    await expect
        .poll(
            () => new URL(page.url()).searchParams.get('sort') ?? '',
            { timeout: 15_000, intervals: [100, 200, 500] },
        )
        .toBe(sort);
    console.log(`[DEBUG selectSort] ✅ URL sort="${sort}" — OK\n`);
}

// ==========================================
// KONSTANTA
// ==========================================

const SEED_CATALOG = {
    pasarTerapung: {
        kode: packageKode(SEED_PACKAGES.pasarTerapung.kodeSuffix),
        nama: SEED_PACKAGES.pasarTerapung.nama,
        slug: 'wisata-pasar-terapung-2d1n',
        kategori: 'budaya',
    },
    hutanKalimantan: {
        kode: packageKode(SEED_PACKAGES.hutanKalimantan.kodeSuffix),
        nama: SEED_PACKAGES.hutanKalimantan.nama,
        slug: 'petualangan-hutan-kalimantan-3d2n',
        kategori: 'petualangan',
    },
    kulinerBanjarmasin: {
        kode: packageKode(SEED_PACKAGES.kulinerBanjarmasin.kodeSuffix),
        nama: SEED_PACKAGES.kulinerBanjarmasin.nama,
        slug: 'wisata-kuliner-banjarmasin-1d',
        kategori: 'kuliner',
    },
} as const;

// ==========================================
// TEST SUITE
// ==========================================

test.describe('Client — Katalog Paket', () => {
    /*
    |--------------------------------------------------------------------------
    | Access Control
    |--------------------------------------------------------------------------
    */

    test('guest tidak bisa akses katalog (redirect ke /login)', async ({
        page,
        asGuest,
    }) => {
        await asGuest();
        await page.goto('/client/catalog', { waitUntil: 'domcontentloaded' });
        await expectPagePath(page, '/login');
    });

    test('admin tidak bisa akses katalog client (redirect ke admin dashboard)', async ({
        page,
        asAdmin,
    }) => {
        await asAdmin();
        await page.goto('/client/catalog', { waitUntil: 'domcontentloaded' });
        await expectPagePath(page, '/admin/dashboard');
    });

    test('mitra tidak bisa akses katalog client (redirect ke mitra dashboard)', async ({
        page,
        asMitra,
    }) => {
        await asMitra();
        await page.goto('/client/catalog', { waitUntil: 'domcontentloaded' });
        await expectPagePath(page, '/mitra/dashboard');
    });

    test('client bisa akses katalog', async ({ page, asClient }) => {
        await asClient();
        await page.goto('/client/catalog', { waitUntil: 'domcontentloaded' });
        await expectPagePath(page, '/client/catalog');
    });

    /*
    |--------------------------------------------------------------------------
    | Contract — Elemen Halaman Index
    |--------------------------------------------------------------------------
    */

    test.describe('Elemen Halaman Index', () => {
        test.beforeEach(async ({ page, asClient }) => {
            await asClient();
            await page.goto('/client/catalog', { waitUntil: 'domcontentloaded' });
        });

        test('menampilkan heading "Katalog Paket Wisata"', async ({ page }) => {
            await expect(
                page
                    .getByRole('heading', { name: /Katalog Paket Wisata/i })
                    .first(),
            ).toBeVisible();
        });

        test('menampilkan deskripsi halaman', async ({ page }) => {
            await expect(
                page.getByText(/Temukan paket wisata menarik/i),
            ).toBeVisible();
        });

        test('menampilkan input search', async ({ page }) => {
            const search = page.locator('input[placeholder*="Cari"]');
            await expect(search).toBeVisible();
            await expect(search).toHaveAttribute(
                'placeholder',
                /Cari paket wisata/i,
            );
        });

        test('menampilkan dropdown filter kategori', async ({ page }) => {
            const select = page.locator('select[aria-label="Filter kategori"]');
            await expect(select).toBeVisible();
            await expect(select).toHaveValue('');
        });

        test('dropdown kategori punya 6 opsi (Semua + 5 kategori)', async ({
            page,
        }) => {
            const options = page.locator(
                'select[aria-label="Filter kategori"] option',
            );
            await expect(options).toHaveCount(6);
        });

        test('menampilkan dropdown sort', async ({ page }) => {
            const select = page.locator('select[aria-label="Urutkan"]');
            await expect(select).toBeVisible();
            await expect(select).toHaveValue('nama');
        });

        test('dropdown sort punya 4 opsi', async ({ page }) => {
            const options = page.locator(
                'select[aria-label="Urutkan"] option',
            );
            await expect(options).toHaveCount(4);
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Data Initialization
    |--------------------------------------------------------------------------
    */

    test.describe('Data Initialization', () => {
        test.beforeEach(async ({ page, asClient }) => {
            await asClient();
            await page.goto('/client/catalog', { waitUntil: 'domcontentloaded' });
        });

        test('menampilkan paket aktif "Pasar Terapung"', async ({ page }) => {
            await expect(
                page.getByRole('heading', {
                    name: SEED_CATALOG.pasarTerapung.nama,
                }),
            ).toBeVisible();
        });

        test('menampilkan paket aktif "Hutan Kalimantan"', async ({ page }) => {
            await expect(
                page.getByRole('heading', {
                    name: SEED_CATALOG.hutanKalimantan.nama,
                }),
            ).toBeVisible();
        });

        test('TIDAK menampilkan paket draft "Kuliner Banjarmasin"', async ({
            page,
        }) => {
            await expect(
                page.getByRole('heading', {
                    name: SEED_CATALOG.kulinerBanjarmasin.nama,
                }),
            ).not.toBeVisible();
        });

        test('card paket menampilkan harga per orang', async ({ page }) => {
            const card = page
                .locator(
                    'a[href*="/client/catalog/wisata-pasar-terapung-2d1n"]',
                )
                .first();
            await expect(card).toContainText(/Rp 850\.000/);
        });

        test('card paket menampilkan durasi', async ({ page }) => {
            const card = page
                .locator(
                    'a[href*="/client/catalog/wisata-pasar-terapung-2d1n"]',
                )
                .first();
            await expect(card).toContainText(/2D1N/);
        });

        test('card paket menampilkan badge kategori', async ({ page }) => {
            const card = page
                .locator(
                    'a[href*="/client/catalog/wisata-pasar-terapung-2d1n"]',
                )
                .first();
            await expect(card).toContainText(/Budaya/i);
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Navigasi ke Show
    |--------------------------------------------------------------------------
    */

    test.describe('Navigasi ke Show', () => {
        test.beforeEach(async ({ page, asClient }) => {
            await asClient();
            await page.goto('/client/catalog', { waitUntil: 'domcontentloaded' });
        });

        test('klik card paket menuju halaman detail', async ({ page }) => {
            await page
                .locator(
                    'a[href*="/client/catalog/wisata-pasar-terapung-2d1n"]',
                )
                .first()
                .click();

            await expectPagePath(
                page,
                '/client/catalog/wisata-pasar-terapung-2d1n',
            );
        });

        test('halaman detail menampilkan itinerary hari', async ({ page }) => {
            await page.goto(
                '/client/catalog/wisata-pasar-terapung-2d1n',
                { waitUntil: 'domcontentloaded' },
            );

            await expect(
                page.getByRole('heading', { name: /Itinerary/i }),
            ).toBeVisible();

            await expect(
                page
                    .getByText(/Hari 1|Penjemputan & Pasar Terapung/i)
                    .first(),
            ).toBeVisible();
            await expect(
                page
                    .getByText(/Hari 2|Wisata Kuliner & Kepulangan/i)
                    .first(),
            ).toBeVisible();
        });

        test('halaman detail menampilkan fasilitas include & exclude', async ({
            page,
        }) => {
            await page.goto(
                '/client/catalog/wisata-pasar-terapung-2d1n',
                { waitUntil: 'domcontentloaded' },
            );

            await expect(
                page.getByText(/^Termasuk$/i).first(),
            ).toBeVisible();
            await expect(
                page.getByText(/^Tidak Termasuk$/i).first(),
            ).toBeVisible();
        });

        test('halaman detail menampilkan CTA "Pesan Sekarang"', async ({
            page,
        }) => {
            await page.goto(
                '/client/catalog/wisata-pasar-terapung-2d1n',
                { waitUntil: 'domcontentloaded' },
            );

            await expect(
                page.getByRole('link', { name: /Pesan Sekarang/i }),
            ).toBeVisible();
        });

        test('CTA "Pesan Sekarang" mengarah ke /client/bookings/create/{id}', async ({
            page,
        }) => {
            await page.goto(
                '/client/catalog/wisata-pasar-terapung-2d1n',
                { waitUntil: 'domcontentloaded' },
            );

            const cta = page.getByRole('link', {
                name: /Pesan Sekarang/i,
            });
            await expectPath(cta, /^\/client\/bookings\/create\/\d+$/);
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Guard — Paket Non-Aktif 404
    |--------------------------------------------------------------------------
    */

    test.describe('Guard Paket Non-Aktif', () => {
        test('akses paket draft langsung → 404', async ({ page, asClient }) => {
            await asClient();
            const response = await page.goto(
                `/client/catalog/${SEED_CATALOG.kulinerBanjarmasin.slug}`,
                { waitUntil: 'domcontentloaded' },
            );

            expect(response?.status()).toBe(404);
        });

        test('akses paket yang tidak ada (slug random) → 404', async ({
            page,
            asClient,
        }) => {
            await asClient();
            const response = await page.goto(
                '/client/catalog/paket-tidak-ada-xyz-123',
                { waitUntil: 'domcontentloaded' },
            );

            expect(response?.status()).toBe(404);
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Filter — Search
    |--------------------------------------------------------------------------
    */

    test.describe('Filter — Search', () => {
        test.beforeEach(async ({ page, asClient }) => {
            await asClient();
            await page.goto('/client/catalog', { waitUntil: 'domcontentloaded' });
        });

        test('search nama paket menampilkan hasil yang sesuai', async ({
            page,
        }) => {
            await performSearch(page, 'Pasar Terapung');

            await expect(
                page.getByRole('heading', {
                    name: SEED_CATALOG.pasarTerapung.nama,
                }),
            ).toBeVisible();
            await expect(
                page.getByRole('heading', {
                    name: SEED_CATALOG.hutanKalimantan.nama,
                }),
            ).not.toBeVisible();
        });

        test('search case-insensitive', async ({ page }) => {
            await performSearch(page, 'PASAR');

            await expect(
                page.getByRole('heading', {
                    name: SEED_CATALOG.pasarTerapung.nama,
                }),
            ).toBeVisible();
        });

        test('search tanpa hasil menampilkan empty state', async ({ page }) => {
            await performSearch(page, 'paket-tidak-ada-xyz-123');

            await expect(
                page.getByText(/Tidak ada paket ditemukan/i),
            ).toBeVisible();
            await expect(
                page.getByText(/Coba ubah filter atau kata kunci/i),
            ).toBeVisible();
        });

        test('empty state punya tombol "Hapus Pencarian"', async ({ page }) => {
            await performSearch(page, 'paket-tidak-ada-xyz-123');

            await expect(
                page.getByRole('button', {
                    name: 'Hapus Pencarian',
                    exact: true,
                }),
            ).toBeVisible();
        });

        test('klik "Hapus Pencarian" reset hasil', async ({ page }) => {
            await performSearch(page, 'paket-tidak-ada-xyz-123');
            await expect(
                page.getByText(/Tidak ada paket ditemukan/i),
            ).toBeVisible();

            await page
                .getByRole('button', {
                    name: 'Hapus Pencarian',
                    exact: true,
                })
                .click();

            await expect(
                page.getByRole('heading', {
                    name: SEED_CATALOG.pasarTerapung.nama,
                }),
            ).toBeVisible();
        });

        test('search tersimpan di URL', async ({ page }) => {
            await performSearch(page, 'Pasar');

            await page.reload({ waitUntil: 'domcontentloaded' });
            await expect(
                page.locator('input[placeholder*="Cari"]'),
            ).toHaveValue('Pasar');
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Filter — Kategori
    |--------------------------------------------------------------------------
    */

    test.describe('Filter — Kategori', () => {
        test.beforeEach(async ({ page, asClient }) => {
            await asClient();
            await page.goto('/client/catalog', { waitUntil: 'domcontentloaded' });
        });

        test('filter kategori "budaya" hanya menampilkan paket budaya', async ({
            page,
        }) => {
            await selectKategori(page, 'budaya');

            await expect(
                page.getByRole('heading', {
                    name: SEED_CATALOG.pasarTerapung.nama,
                }),
            ).toBeVisible();
            await expect(
                page.getByRole('heading', {
                    name: SEED_CATALOG.hutanKalimantan.nama,
                }),
            ).not.toBeVisible();
        });

        test('filter kategori "petualangan" hanya menampilkan paket petualangan', async ({
            page,
        }) => {
            await selectKategori(page, 'petualangan');

            await expect(
                page.getByRole('heading', {
                    name: SEED_CATALOG.hutanKalimantan.nama,
                }),
            ).toBeVisible();
            await expect(
                page.getByRole('heading', {
                    name: SEED_CATALOG.pasarTerapung.nama,
                }),
            ).not.toBeVisible();
        });

        test('filter kategori yang tidak ada paketnya → empty state', async ({
            page,
        }) => {
            await selectKategori(page, 'kuliner');

            await expect(
                page.getByText(/Tidak ada paket ditemukan/i),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Filter — Sort
    |--------------------------------------------------------------------------
    */

    test.describe('Filter — Sort', () => {
        test.beforeEach(async ({ page, asClient }) => {
            await asClient();
            await page.goto('/client/catalog', { waitUntil: 'domcontentloaded' });
        });

        test('sort harga termurah mengubah urutan', async ({ page }) => {
            await selectSort(page, 'harga_per_orang');

            const cards = page.locator('a[href*="/client/catalog/"]');
            await expectPath(
                cards.first(),
                /^\/client\/catalog\/wisata-pasar-terapung-2d1n$/,
            );
        });

        test('sort nama mengubah urutan ke A-Z', async ({ page }) => {
            await selectSort(page, 'nama');

            const cards = page.locator('a[href*="/client/catalog/"]');
            await expectPath(
                cards.first(),
                /^\/client\/catalog\/petualangan-hutan-kalimantan-3d2n$/,
            );
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Error Handling — Empty State (UI Level)
    |--------------------------------------------------------------------------
    */

    test.describe('Error Handling — Empty State', () => {
        test.beforeEach(async ({ page, asClient }) => {
            await asClient();
            await page.goto('/client/catalog', { waitUntil: 'domcontentloaded' });
        });

        test('empty state menampilkan pesan yang human-readable', async ({
            page,
        }) => {
            await performSearch(page, 'tidak-ada-xyz-999');

            await expect(
                page.getByText(/Tidak ada paket ditemukan/i),
            ).toBeVisible();
            await expect(
                page.getByText(/Coba ubah filter atau kata kunci/i),
            ).toBeVisible();
        });

        test('empty state menampilkan ikon', async ({ page }) => {
            await performSearch(page, 'tidak-ada-xyz-999');

            const emptyState = page
                .locator('.text-center')
                .filter({ hasText: /Tidak ada paket ditemukan/i });
            await expect(emptyState.locator('svg').first()).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Accessibility (a11y)
    |--------------------------------------------------------------------------
    */

    test.describe('Accessibility', () => {
        test('halaman index tidak punya pelanggaran WCAG kritis', async ({
            page,
            asClient,
        }) => {
            await asClient();
            await page.goto('/client/catalog', { waitUntil: 'domcontentloaded' });
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

        test('input search punya placeholder deskriptif', async ({
            page,
            asClient,
        }) => {
            await asClient();
            await page.goto('/client/catalog', { waitUntil: 'domcontentloaded' });

            await expect(
                page.locator('input[placeholder*="Cari"]'),
            ).toHaveAttribute('placeholder', /Cari paket wisata/i);
        });

        test('dropdown punya aria-label', async ({ page, asClient }) => {
            await asClient();
            await page.goto('/client/catalog', { waitUntil: 'domcontentloaded' });

            await expect(
                page.locator('select[aria-label="Filter kategori"]'),
            ).toBeVisible();
            await expect(
                page.locator('select[aria-label="Urutkan"]'),
            ).toBeVisible();
        });

        test('card paket adalah link yang bisa diakses keyboard', async ({
            page,
            asClient,
        }) => {
            await asClient();
            await page.goto('/client/catalog', { waitUntil: 'domcontentloaded' });

            const firstCard = page
                .locator('a[href*="/client/catalog/"]')
                .first();
            await expect(firstCard).toBeVisible();

            await firstCard.focus();
            const tagName = await firstCard.evaluate((el) =>
                el.tagName.toLowerCase(),
            );
            expect(tagName).toBe('a');

            const href = await firstCard.getAttribute('href');
            expect(href).toMatch(/\/client\/catalog\//);
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Responsive — Mobile Viewport
    |--------------------------------------------------------------------------
    */

    test.describe('Responsive — Mobile Viewport', () => {
        test('filter bar & grid tetap bisa dipakai di viewport mobile', async ({
            page,
            asClient,
        }) => {
            await asClient();
            await page.setViewportSize({ width: 375, height: 812 });
            await page.goto('/client/catalog', { waitUntil: 'domcontentloaded' });

            await expect(
                page.locator('input[placeholder*="Cari"]'),
            ).toBeVisible();
            await expect(
                page.locator('select[aria-label="Filter kategori"]'),
            ).toBeVisible();
            await expect(
                page.locator('select[aria-label="Urutkan"]'),
            ).toBeVisible();

            const cards = page.locator('a[href*="/client/catalog/"]');
            expect(await cards.count()).toBeGreaterThanOrEqual(1);
        });
    });
});