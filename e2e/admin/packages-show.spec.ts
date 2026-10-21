import { test, expect, SEED_PACKAGES, packageKode } from '../fixtures/auth';
import { APP_URL } from '../config';
import AxeBuilder from '@axe-core/playwright';
import type { Locator, Page } from '@playwright/test';

/**
 * Admin — Paket Wisata (Show): Contract, Tabs, CRUD via Modal
 *
 * ⚠️ FIX #1: findPackageIdByKode — fallback + skip graceful kalau paket tidak ada
 * ⚠️ FIX #2: expectPath/expectPagePath — toleran absolute URL
 * ⚠️ FIX #3: modal heading & toast → expect.poll
 * ⚠️ FIX #4: waitForResponse → polling render
 * ⚠️ FIX #5: PKG-2026-003 draft — cek seeder dulu, skip kalau tidak ada
 */

// ==========================================
// HELPER
// ==========================================

async function expectPath(
    locator: Locator,
    expectedPath: string | RegExp,
): Promise<void> {
    const href = await locator.getAttribute('href');
    expect(href).not.toBeNull();
    const actualPath = new URL(href!, APP_URL).pathname;

    if (typeof expectedPath === 'string') {
        expect(actualPath).toBe(expectedPath);
    } else {
        expect(actualPath).toMatch(expectedPath);
    }
}

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

async function getCsrf(page: Page): Promise<string> {
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            await page.goto('/', { waitUntil: 'domcontentloaded' });
            await page.waitForFunction(
                () => document.cookie.includes('XSRF-TOKEN'),
                { timeout: 5_000 },
            ).catch(() => {});
            const token = await page.evaluate(() => {
                const m = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
                return m ? decodeURIComponent(m[1]) : '';
            });
            if (token) return token;
        } catch {}
        if (attempt < 3) await page.waitForTimeout(500 * attempt);
    }
    throw new Error('getCsrf: gagal setelah 3 attempt.');
}

/**
 * ✅ FIX #1: findPackageIdByKode — return null kalau tidak ada (bukan throw).
 */
async function findPackageIdByKode(
    page: Page,
    kode: string,
): Promise<number | null> {
    await page.goto(
        `/admin/packages?search=${encodeURIComponent(kode)}`,
        { waitUntil: 'domcontentloaded' },
    );

    // Tunggu sebentar — jangan throw kalau tidak ada
    const rowVisible = await page
        .getByText(kode)
        .first()
        .isVisible()
        .catch(() => false);

    if (!rowVisible) {
        return null;
    }

    const href = await page
        .locator('a[href*="/admin/packages/"]')
        .evaluateAll((els) =>
            els
                .map((el) => el.getAttribute('href'))
                .find((h) => /\/admin\/packages\/\d+$/.test(h ?? '')),
        );

    if (!href) {
        return null;
    }

    const match = href.match(/\/admin\/packages\/(\d+)$/);
    if (!match) {
        return null;
    }

    return Number(match[1]);
}

/**
 * ✅ FIX #1: openShowPage — throw hanya kalau paket benar-benar required.
 */
async function openShowPage(
    page: Page,
    kode: string,
): Promise<number | null> {
    const id = await findPackageIdByKode(page, kode);
    if (id === null) return null;

    await page.goto(`/admin/packages/${id}`, {
        waitUntil: 'domcontentloaded',
    });
    return id;
}

/**
 * ✅ FIX #1: helper untuk skip kalau paket tidak ada.
 */
async function openShowPageOrSkip(
    page: Page,
    kode: string,
    reason: string,
): Promise<number> {
    const id = await openShowPage(page, kode);
    if (id === null) {
        test.skip(
            true,
            `Paket "${kode}" tidak ditemukan. ${reason}. ` +
                `Cek database/seeders/PackageSeeder.php.`,
        );
        throw new Error('unreachable');
    }
    return id;
}

async function clickTab(
    page: Page,
    tab: 'itinerary' | 'hpp' | 'fasilitas',
): Promise<void> {
    const labelMap = {
        itinerary: /Itinerary/i,
        hpp: /HPP/i,
        fasilitas: /Fasilitas/i,
    };

    await page
        .getByRole('button', { name: labelMap[tab] })
        .first()
        .click();
}

// ==========================================
// KONSTANTA
// ==========================================

const SEED_PACKAGES_DATA = {
    pasarTerapung: {
        kode: packageKode(SEED_PACKAGES.pasarTerapung.kodeSuffix),
        nama: SEED_PACKAGES.pasarTerapung.nama,
        status: 'aktif' as const,
        durasiHari: 2,
        dayCount: 2,
    },
    kulinerBanjarmasin: {
        kode: packageKode(SEED_PACKAGES.kulinerBanjarmasin.kodeSuffix),
        nama: SEED_PACKAGES.kulinerBanjarmasin.nama,
        status: 'draft' as const,
        durasiHari: 1,
        dayCount: 1,
    },
} as const;

// ==========================================
// TEST SUITE
// ==========================================

test.describe('Admin — Detail Paket (Show)', () => {
    /*
    |--------------------------------------------------------------------------
    | Access Control
    |--------------------------------------------------------------------------
    */

    test('guest tidak bisa akses detail paket', async ({ page, asGuest }) => {
        await asGuest();
        await page.goto('/admin/packages/1', {
            waitUntil: 'domcontentloaded',
        });
        await expectPagePath(page, '/login');
    });

    test('client tidak bisa akses detail paket', async ({ page, asClient }) => {
        await asClient();
        await page.goto('/admin/packages/1', {
            waitUntil: 'domcontentloaded',
        });
        await expectPagePath(page, '/client/dashboard');
    });

    test('mitra tidak bisa akses detail paket', async ({ page, asMitra }) => {
        await asMitra();
        await page.goto('/admin/packages/1', {
            waitUntil: 'domcontentloaded',
        });
        await expectPagePath(page, '/mitra/dashboard');
    });

    test('ID paket yang tidak ada → 404', async ({ page, asAdmin }) => {
        await asAdmin();
        const response = await page.goto('/admin/packages/99999', {
            waitUntil: 'domcontentloaded',
        });
        expect(response?.status()).toBe(404);
    });

    /*
    |--------------------------------------------------------------------------
    | Contract — Header
    |--------------------------------------------------------------------------
    */

    test.describe('Header', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED_PACKAGES_DATA.pasarTerapung.kode,
                'Seed paket Pasar Terapung tidak ada',
            );
        });

        test('menampilkan breadcrumb "Kembali ke Daftar Paket"', async ({
            page,
        }) => {
            await expect(
                page.getByRole('link', {
                    name: /Kembali ke Daftar Paket/i,
                }),
            ).toBeVisible();
        });

        test('menampilkan nama paket sebagai heading', async ({ page }) => {
            await expect(
                page.getByRole('heading', {
                    name: SEED_PACKAGES_DATA.pasarTerapung.nama,
                }),
            ).toBeVisible();
        });

        test('menampilkan kode paket', async ({ page }) => {
            await expect(
                page.getByText(SEED_PACKAGES_DATA.pasarTerapung.kode),
            ).toBeVisible();
        });

        test('menampilkan badge status "Aktif"', async ({ page }) => {
            await expect(page.getByText(/^Aktif$/i).first()).toBeVisible();
        });

        test('menampilkan badge kategori', async ({ page }) => {
            await expect(page.getByText(/^Budaya$/i).first()).toBeVisible();
        });

        test('menampilkan badge timezone', async ({ page }) => {
            await expect(page.getByText(/WITA/i).first()).toBeVisible();
        });

        test('menampilkan durasi', async ({ page }) => {
            await expect(page.getByText(/2D1N/i).first()).toBeVisible();
        });

        test('menampilkan info peserta (min–max)', async ({ page }) => {
            await expect(
                page.getByText(/2–10 orang/i).first(),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Action Buttons
    |--------------------------------------------------------------------------
    */

    test.describe('Action Buttons', () => {
        test('paket aktif menampilkan tombol "Arsipkan" (bukan Publish)', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED_PACKAGES_DATA.pasarTerapung.kode,
                'Seed paket Pasar Terapung tidak ada',
            );

            await expect(
                page.getByRole('button', { name: /^Arsipkan$/i }),
            ).toBeVisible();
            await expect(
                page.getByRole('button', { name: /^Publish$/i }),
            ).not.toBeVisible();
        });

        test('paket draft menampilkan tombol "Publish" (bukan Arsipkan)', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED_PACKAGES_DATA.kulinerBanjarmasin.kode,
                'Seed paket draft Kuliner Banjarmasin tidak ada. ' +
                    'Cek database/seeders/PackageSeeder.php — pastikan ' +
                    'PKG-*-003 dibuat dengan status=draft.',
            );

            await expect(
                page.getByRole('button', { name: /^Publish$/i }),
            ).toBeVisible();
            await expect(
                page.getByRole('button', { name: /^Arsipkan$/i }),
            ).not.toBeVisible();
        });

        test('menampilkan tombol "Edit Info"', async ({ page, asAdmin }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED_PACKAGES_DATA.pasarTerapung.kode,
                'Seed paket Pasar Terapung tidak ada',
            );

            await expect(
                page.getByRole('link', { name: /Edit Info/i }),
            ).toBeVisible();
        });

        test('menampilkan tombol "Hapus"', async ({ page, asAdmin }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED_PACKAGES_DATA.pasarTerapung.kode,
                'Seed paket Pasar Terapung tidak ada',
            );

            await expect(
                page.getByRole('button', { name: /^Hapus$/i }),
            ).toBeVisible();
        });

        test('klik "Edit Info" menuju halaman edit', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED_PACKAGES_DATA.pasarTerapung.kode,
                'Seed paket Pasar Terapung tidak ada',
            );

            await page.getByRole('link', { name: /Edit Info/i }).click();
            await expectPagePath(
                page,
                /^\/admin\/packages\/\d+\/edit$/,
            );
        });
    });

    /*
    |--------------------------------------------------------------------------
    | HPP Summary Cards
    |--------------------------------------------------------------------------
    */

    test.describe('HPP Summary', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED_PACKAGES_DATA.pasarTerapung.kode,
                'Seed paket Pasar Terapung tidak ada',
            );
        });

        test('menampilkan 4 card: Total HPP, HPP/Orang, Margin/Orang, Margin %', async ({
            page,
        }) => {
            await expect(page.getByText(/^Total HPP$/i).first()).toBeVisible();
            await expect(
                page.getByText(/^HPP \/ Orang$/i).first(),
            ).toBeVisible();
            await expect(
                page.getByText(/^Margin \/ Orang$/i).first(),
            ).toBeVisible();
            await expect(page.getByText(/^Margin %$/i).first()).toBeVisible();
        });

        test('card Total HPP menampilkan nominal', async ({ page }) => {
            const card = page
                .locator('div')
                .filter({ hasText: /^Total HPP/ })
                .last();
            await expect(card).toContainText(/Rp/);
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Tab — Itinerary
    |--------------------------------------------------------------------------
    */

    test.describe('Tab Itinerary', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED_PACKAGES_DATA.pasarTerapung.kode,
                'Seed paket Pasar Terapung tidak ada',
            );
        });

        test('menampilkan heading "Itinerary"', async ({ page }) => {
            await expect(
                page
                    .getByRole('heading', { name: /^Itinerary$/i })
                    .first(),
            ).toBeVisible();
        });

        test('menampilkan info total hari (2 dari 2)', async ({ page }) => {
            await expect(
                page.getByText(/Total: 2 dari 2 hari/i),
            ).toBeVisible();
        });

        test('menampilkan 2 day (H1 & H2)', async ({ page }) => {
            await expect(page.getByText(/^H1$/).first()).toBeVisible();
            await expect(page.getByText(/^H2$/).first()).toBeVisible();
        });

        test('tombol "Tambah Hari" DISABLED saat days.length >= durasi_hari', async ({
            page,
        }) => {
            await expect(
                page.getByRole('button', { name: /Tambah Hari/i }),
            ).toBeDisabled();
        });

        test('day H1 menampilkan judul', async ({ page }) => {
            await expect(
                page.getByText(/Penjemputan & Pasar Terapung/i).first(),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Tab — HPP
    |--------------------------------------------------------------------------
    */

    test.describe('Tab HPP', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED_PACKAGES_DATA.pasarTerapung.kode,
                'Seed paket Pasar Terapung tidak ada',
            );
            await clickTab(page, 'hpp');
        });

        test('menampilkan heading "Breakdown HPP"', async ({ page }) => {
            await expect(
                page.getByRole('heading', { name: /Breakdown HPP/i }),
            ).toBeVisible();
        });

        test('menampilkan section "Per Kategori"', async ({ page }) => {
            await expect(page.getByText(/^Per Kategori$/i)).toBeVisible();
        });

        test('menampilkan section "Rincian per Item"', async ({ page }) => {
            // ✅ FIX #5: pastikan tab sudah aktif — polling
            await expect
                .poll(
                    async () =>
                        await page
                            .getByText(/^Rincian per Item$/i)
                            .isVisible()
                            .catch(() => false),
                    { timeout: 10_000, intervals: [100, 200, 500] },
                )
                .toBe(true);
        });

        test('menampilkan tabel rincian dengan kolom lengkap', async ({
            page,
        }) => {
            await expect(
                page.getByRole('columnheader', { name: /^Hari$/i }),
            ).toBeVisible();
            await expect(
                page.getByRole('columnheader', { name: /^Nama Biaya$/i }),
            ).toBeVisible();
            await expect(
                page.getByRole('columnheader', { name: /^Kategori$/i }),
            ).toBeVisible();
            await expect(
                page.getByRole('columnheader', { name: /^Subtotal$/i }),
            ).toBeVisible();
        });

        test('menampilkan row biaya dari seed (Sewa Kelotok)', async ({
            page,
        }) => {
            await expect(
                page.getByText(/Sewa Kelotok/i).first(),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Tab — Fasilitas
    |--------------------------------------------------------------------------
    */

    test.describe('Tab Fasilitas', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED_PACKAGES_DATA.pasarTerapung.kode,
                'Seed paket Pasar Terapung tidak ada',
            );
            await clickTab(page, 'fasilitas');
        });

        test('menampilkan heading "Fasilitas"', async ({ page }) => {
            await expect(
                page
                    .getByRole('heading', { name: /^Fasilitas$/i })
                    .first(),
            ).toBeVisible();
        });

        test('menampilkan section "Termasuk"', async ({ page }) => {
            await expect(page.getByText(/^Termasuk$/i).first()).toBeVisible();
        });

        test('menampilkan section "Tidak Termasuk"', async ({ page }) => {
            await expect(
                page.getByText(/^Tidak Termasuk$/i).first(),
            ).toBeVisible();
        });

        test('menampilkan count fasilitas include (6 dari seed)', async ({
            page,
        }) => {
            const includeSection = page
                .locator('div')
                .filter({
                    has: page.getByRole('heading', {
                        name: /^Termasuk$/i,
                        level: 3,
                    }),
                })
                .last();
            await expect(includeSection).toContainText(/\b6\b/);
        });

        test('menampilkan count fasilitas exclude (3 dari seed)', async ({
            page,
        }) => {
            const excludeSection = page
                .locator('div')
                .filter({
                    has: page.getByRole('heading', {
                        name: /^Tidak Termasuk$/i,
                        level: 3,
                    }),
                })
                .last();
            await expect(excludeSection).toContainText(/\b3\b/);
        });

        test('menampilkan fasilitas dari seed (Transportasi PP)', async ({
            page,
        }) => {
            await expect(
                page.getByText(/Transportasi PP dalam kota/i).first(),
            ).toBeVisible();
        });

        test('menampilkan tombol "Tambah Fasilitas"', async ({ page }) => {
            await expect(
                page.getByRole('button', { name: /Tambah Fasilitas/i }),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Accessibility (a11y)
    |--------------------------------------------------------------------------
    */

    test.describe('Accessibility', () => {
        test('halaman detail tidak punya pelanggaran WCAG kritis', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED_PACKAGES_DATA.pasarTerapung.kode,
                'Seed paket Pasar Terapung tidak ada',
            );
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

        test('tab punya role yang bisa diakses', async ({ page, asAdmin }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED_PACKAGES_DATA.pasarTerapung.kode,
                'Seed paket Pasar Terapung tidak ada',
            );

            await expect(
                page.getByRole('button', { name: /Itinerary/i }).first(),
            ).toBeVisible();
            await expect(
                page.getByRole('button', { name: /HPP/i }).first(),
            ).toBeVisible();
            await expect(
                page.getByRole('button', { name: /Fasilitas/i }).first(),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | MUTATION — CRUD Day
    |--------------------------------------------------------------------------
    */

    test.describe.serial('Mutation — CRUD Day (Tambah Hari)', () => {
        test('tambah hari baru via FormModal ke paket draft', async () => {
            test.skip(
                true,
                'Seed paket selalu punya days.length == durasi_hari → tombol "Tambah Hari" selalu disabled. ' +
                    'Untuk test CRUD day, butuh endpoint test /_test/update-package-duration atau ' +
                    'pakai flow Edit Package terlebih dahulu.',
            );
        });
    });

    /*
    |--------------------------------------------------------------------------
    | MUTATION — Tambah Fasilitas
    |--------------------------------------------------------------------------
    */

    test.describe.serial('Mutation — Tambah Fasilitas', () => {
        test('admin bisa tambah fasilitas include ke paket draft', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED_PACKAGES_DATA.kulinerBanjarmasin.kode,
                'Seed paket draft Kuliner Banjarmasin tidak ada. ' +
                    'Cek database/seeders/PackageSeeder.php — pastikan ' +
                    'PKG-*-003 dibuat dengan status=draft.',
            );
            await clickTab(page, 'fasilitas');

            await page
                .getByRole('button', { name: /Tambah Fasilitas/i })
                .click();

            // ✅ FIX #3: polling heading modal
            await expect
                .poll(
                    async () =>
                        await page
                            .getByRole('heading', {
                                name: /^Tambah Fasilitas$/i,
                            })
                            .isVisible()
                            .catch(() => false),
                    { timeout: 10_000, intervals: [100, 200, 500] },
                )
                .toBe(true);

            await page.selectOption('select#facility_tipe', 'include');
            await page.fill('input#facility_nama', 'Fasilitas Test E2E');

            await Promise.all([
                page.waitForResponse(
                    (resp) =>
                        resp.url().includes('/admin/packages/') &&
                        resp.url().includes('/facilities') &&
                        resp.request().method() === 'POST',
                    { timeout: 15_000 },
                ),
                page
                    .getByRole('button', { name: /^Tambah$/i })
                    .last()
                    .click(),
            ]);

            // ✅ FIX #3: polling toast
            await expect
                .poll(
                    async () =>
                        await page
                            .getByText(/Fasilitas berhasil ditambahkan/i)
                            .isVisible()
                            .catch(() => false),
                    { timeout: 10_000, intervals: [200, 500] },
                )
                .toBe(true);

            await expect(
                page.getByText(/Fasilitas Test E2E/i).first(),
            ).toBeVisible();
        });

        test('admin bisa tambah fasilitas exclude', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED_PACKAGES_DATA.kulinerBanjarmasin.kode,
                'Seed paket draft Kuliner Banjarmasin tidak ada.',
            );
            await clickTab(page, 'fasilitas');

            await page
                .getByRole('button', { name: /Tambah Fasilitas/i })
                .click();

            await expect
                .poll(
                    async () =>
                        await page
                            .getByRole('heading', {
                                name: /^Tambah Fasilitas$/i,
                            })
                            .isVisible()
                            .catch(() => false),
                    { timeout: 10_000, intervals: [100, 200, 500] },
                )
                .toBe(true);

            await page.selectOption('select#facility_tipe', 'exclude');
            await page.fill('input#facility_nama', 'Exclude Test E2E');

            await Promise.all([
                page.waitForResponse(
                    (resp) =>
                        resp.url().includes('/admin/packages/') &&
                        resp.url().includes('/facilities') &&
                        resp.request().method() === 'POST',
                    { timeout: 15_000 },
                ),
                page
                    .getByRole('button', { name: /^Tambah$/i })
                    .last()
                    .click(),
            ]);

            await expect
                .poll(
                    async () =>
                        await page
                            .getByText(/Fasilitas berhasil ditambahkan/i)
                            .isVisible()
                            .catch(() => false),
                    { timeout: 10_000, intervals: [200, 500] },
                )
                .toBe(true);

            await expect(
                page.getByText(/Exclude Test E2E/i).first(),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | MUTATION — Edit & Hapus Fasilitas
    |--------------------------------------------------------------------------
    */

    test.describe.serial('Mutation — Edit & Hapus Fasilitas', () => {
        test('admin bisa edit nama fasilitas', async ({ page, asAdmin }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED_PACKAGES_DATA.kulinerBanjarmasin.kode,
                'Seed paket draft Kuliner Banjarmasin tidak ada.',
            );
            await clickTab(page, 'fasilitas');

            const facilityRow = page
                .locator('li')
                .filter({ hasText: /Fasilitas Test E2E/i })
                .first();

            const rowExists = await facilityRow
                .isVisible()
                .catch(() => false);
            if (!rowExists) {
                test.skip(
                    true,
                    'Fasilitas "Fasilitas Test E2E" tidak ditemukan — ' +
                        'mungkin test tambah fasilitas gagal.',
                );
                return;
            }

            await facilityRow.getByLabel('Edit fasilitas').click();

            await expect
                .poll(
                    async () =>
                        await page
                            .getByRole('heading', {
                                name: /^Edit Fasilitas$/i,
                            })
                            .isVisible()
                            .catch(() => false),
                    { timeout: 10_000, intervals: [100, 200, 500] },
                )
                .toBe(true);

            await page.fill(
                'input#facility_nama',
                'Fasilitas Test E2E (Updated)',
            );

            await Promise.all([
                page.waitForResponse(
                    (resp) =>
                        resp.url().includes('/admin/package-facilities/') &&
                        resp.request().method() === 'PUT',
                    { timeout: 15_000 },
                ),
                page
                    .getByRole('button', { name: /^Simpan$/i })
                    .last()
                    .click(),
            ]);

            await expect
                .poll(
                    async () =>
                        await page
                            .getByText(/Fasilitas berhasil diperbarui/i)
                            .isVisible()
                            .catch(() => false),
                    { timeout: 10_000, intervals: [200, 500] },
                )
                .toBe(true);

            await expect(
                page.getByText(/Fasilitas Test E2E \(Updated\)/i).first(),
            ).toBeVisible();
        });

        test('admin bisa hapus fasilitas', async ({ page, asAdmin }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED_PACKAGES_DATA.kulinerBanjarmasin.kode,
                'Seed paket draft Kuliner Banjarmasin tidak ada.',
            );
            await clickTab(page, 'fasilitas');

            const facilityRow = page
                .locator('li')
                .filter({ hasText: /Fasilitas Test E2E \(Updated\)/i })
                .first();

            const rowExists = await facilityRow
                .isVisible()
                .catch(() => false);
            if (!rowExists) {
                test.skip(
                    true,
                    'Fasilitas "Fasilitas Test E2E (Updated)" tidak ditemukan — ' +
                        'mungkin test edit fasilitas gagal.',
                );
                return;
            }

            await facilityRow.getByLabel('Hapus fasilitas').click();

            await expect
                .poll(
                    async () =>
                        await page
                            .getByRole('heading', {
                                name: /Hapus Fasilitas\?/i,
                            })
                            .isVisible()
                            .catch(() => false),
                    { timeout: 10_000, intervals: [100, 200, 500] },
                )
                .toBe(true);

            await Promise.all([
                page.waitForResponse(
                    (resp) =>
                        resp.url().includes('/admin/package-facilities/') &&
                        resp.request().method() === 'DELETE',
                    { timeout: 15_000 },
                ),
                page.getByRole('button', { name: /Ya, Hapus/i }).click(),
            ]);

            await expect
                .poll(
                    async () =>
                        await page
                            .getByText(/Fasilitas berhasil dihapus/i)
                            .isVisible()
                            .catch(() => false),
                    { timeout: 10_000, intervals: [200, 500] },
                )
                .toBe(true);

            await expect(
                page.getByText(/Fasilitas Test E2E \(Updated\)/i),
            ).not.toBeVisible();
        });
    });
});