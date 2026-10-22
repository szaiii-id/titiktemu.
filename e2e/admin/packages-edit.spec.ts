import { test, expect, SEED_PACKAGES, packageKode } from '../fixtures/auth';
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

/**
 * Admin — Edit Paket Wisata
 *
 * ⚠️ FIX #1: findPackageIdByKode — filter href numeric (hindari /create)
 * ⚠️ FIX #2: openEditPageOrSkip — skip graceful jika package tidak ada
 *           (packages-index.spec.ts bisa menghapus PKG-003)
 */

// ==========================================
// KONSTANTA — sinkron dengan PackageSeeder.php
// ==========================================

const SEED = {
    pasarTerapung: {
        kode: packageKode(SEED_PACKAGES.pasarTerapung.kodeSuffix),
        nama: SEED_PACKAGES.pasarTerapung.nama,
        kategori: 'budaya' as const,
        timezone: 'Asia/Makassar' as const,
        durasiHari: 2,
        durasiMalam: 1,
        minPeserta: 2,
        maxPeserta: 10,
        hargaPerOrang: '850000',
        deskripsi:
            'Nikmati pengalaman unik menyusuri Sungai Martapura menuju Pasar Terapung Lok Baintan.',
    },
    kulinerBanjarmasin: {
        kode: packageKode(SEED_PACKAGES.kulinerBanjarmasin.kodeSuffix),
        nama: SEED_PACKAGES.kulinerBanjarmasin.nama,
        kategori: 'kuliner' as const,
        timezone: 'Asia/Makassar' as const,
        durasiHari: 1,
        durasiMalam: 0,
        minPeserta: 2,
        maxPeserta: 12,
        hargaPerOrang: '350000',
    },
} as const;

// ==========================================
// HELPER
// ==========================================

/**
 * ✅ FIX #1: findPackageIdByKode — return null jika tidak ada
 * (bukan throw).
 *
 * Kenapa: `packages-index.spec.ts` test "Hapus Paket" menghapus
 * `PKG-{year}-003` (Kuliner Banjarmasin) — soft delete. Test lain
 * di file ini yang assert `PKG-003` akan gagal jika file itu jalan
 * duluan. Return null memungkinkan skip graceful.
 *
 * Sebelumnya locator `a[href*="/admin/packages/"]` match juga tombol
 * "+ Tambah Paket" (`/admin/packages/create`) karena berada di atas
 * tabel. Filter numeric ID memastikan kita pilih href
 * `/admin/packages/{id}` (link "Detail" di row).
 */
async function findPackageIdByKode(
    page: Page,
    kode: string,
): Promise<number | null> {
    await page.goto(
        `/admin/packages?search=${encodeURIComponent(kode)}`,
        { waitUntil: 'domcontentloaded' },
    );

    // ✅ Tunggu sebentar — jangan throw kalau tidak ada
    const rowVisible = await page
        .getByText(kode)
        .first()
        .isVisible()
        .catch(() => false);

    if (!rowVisible) {
        return null;
    }

    // ✅ Ambil semua href, filter yang match numeric ID
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
 * ✅ FIX #2: openEditPage — return null jika package tidak ada.
 */
async function openEditPage(
    page: Page,
    kode: string,
): Promise<number | null> {
    const id = await findPackageIdByKode(page, kode);
    if (id === null) return null;

    await page.goto(`/admin/packages/${id}/edit`);
    return id;
}

/**
 * ✅ FIX #2: openEditPageOrSkip — helper untuk skip kalau package
 * tidak ada.
 */
async function openEditPageOrSkip(
    page: Page,
    kode: string,
    reason: string,
): Promise<number> {
    const id = await openEditPage(page, kode);
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

// ==========================================
// TEST SUITE
// ==========================================

test.describe('Admin — Edit Paket Wisata', () => {
    /*
    |--------------------------------------------------------------------------
    | Access Control
    |--------------------------------------------------------------------------
    */

    test('guest tidak bisa akses halaman edit', async ({ page, asGuest }) => {
        await asGuest();
        await page.goto('/admin/packages/1/edit');
        await expect(page).toHaveURL('/login');
    });

    test('client tidak bisa akses halaman edit', async ({ page, asClient }) => {
        await asClient();
        await page.goto('/admin/packages/1/edit');
        await expect(page).toHaveURL('/client/dashboard');
    });

    test('mitra tidak bisa akses halaman edit', async ({ page, asMitra }) => {
        await asMitra();
        await page.goto('/admin/packages/1/edit');
        await expect(page).toHaveURL('/mitra/dashboard');
    });

    test('admin bisa akses halaman edit', async ({ page, asAdmin }) => {
        await asAdmin();
        await openEditPageOrSkip(
            page,
            SEED.pasarTerapung.kode,
            'Seed paket Pasar Terapung tidak ada',
        );
        await expect(page).toHaveURL(/\/admin\/packages\/\d+\/edit$/);
    });

    test('ID paket tidak ada → 404', async ({ page, asAdmin }) => {
        await asAdmin();
        const response = await page.goto('/admin/packages/99999/edit');
        expect(response?.status()).toBe(404);
    });

    /*
    |--------------------------------------------------------------------------
    | Contract — Elemen Halaman
    |--------------------------------------------------------------------------
    */

    test.describe('Elemen Halaman', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await openEditPageOrSkip(
                page,
                SEED.pasarTerapung.kode,
                'Seed paket Pasar Terapung tidak ada',
            );
        });

        test('menampilkan breadcrumb "Kembali ke Detail Paket"', async ({
            page,
        }) => {
            await expect(
                page.getByRole('link', { name: /Kembali ke Detail Paket/i }),
            ).toBeVisible();
        });

        test('menampilkan heading "Edit {nama}"', async ({ page }) => {
            await expect(
                page.getByRole('heading', {
                    name: new RegExp(`Edit\\s+${SEED.pasarTerapung.nama}`, 'i'),
                }),
            ).toBeVisible();
        });

        test('menampilkan kode paket di header', async ({ page }) => {
            await expect(
                page.getByText(SEED.pasarTerapung.kode),
            ).toBeVisible();
        });

        test('menampilkan info "Kode paket tidak dapat diubah"', async ({
            page,
        }) => {
            // ✅ exact:true — teks di header card juga mengandung
            // "Kode paket tidak dapat diubah" (sebagai bagian dari kalimat
            // lebih panjang). Exact match hanya match <strong> di info box.
            await expect(
                page.getByText('Kode paket tidak dapat diubah', { exact: true }),
            ).toBeVisible();
        });

        test('menampilkan section "Info Dasar"', async ({ page }) => {
            await expect(
                page.getByRole('heading', { name: /^Info Dasar$/i }),
            ).toBeVisible();
        });

        test('menampilkan section "Harga"', async ({ page }) => {
            await expect(
                page.getByRole('heading', { name: /^Harga$/i }),
            ).toBeVisible();
        });

        test('menampilkan field nama', async ({ page }) => {
            await expect(page.locator('input#nama')).toBeVisible();
            await expect(page.locator('input#nama')).toHaveAttribute(
                'required',
                '',
            );
        });

        test('menampilkan field deskripsi', async ({ page }) => {
            await expect(page.locator('textarea#deskripsi')).toBeVisible();
        });

        test('menampilkan dropdown kategori', async ({ page }) => {
            await expect(page.locator('select#kategori')).toBeVisible();
        });

        test('menampilkan dropdown timezone', async ({ page }) => {
            await expect(page.locator('select#timezone')).toBeVisible();
        });

        test('menampilkan field durasi_hari & durasi_malam', async ({
            page,
        }) => {
            await expect(page.locator('input#durasi_hari')).toBeVisible();
            await expect(page.locator('input#durasi_malam')).toBeVisible();
        });

        test('menampilkan field min_peserta & max_peserta', async ({ page }) => {
            await expect(page.locator('input#min_peserta')).toBeVisible();
            await expect(page.locator('input#max_peserta')).toBeVisible();
        });

        test('menampilkan field harga_per_orang', async ({ page }) => {
            await expect(page.locator('input#harga_per_orang')).toBeVisible();
        });

        test('menampilkan field harga_per_rombongan', async ({ page }) => {
            await expect(
                page.locator('input#harga_per_rombongan'),
            ).toBeVisible();
        });

        test('menampilkan tombol "Reset"', async ({ page }) => {
            await expect(
                page.getByRole('button', { name: /^Reset$/i }),
            ).toBeVisible();
        });

        test('menampilkan tombol "Simpan Perubahan"', async ({ page }) => {
            await expect(
                page.getByRole('button', { name: /Simpan Perubahan/i }),
            ).toBeVisible();
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
            await openEditPageOrSkip(
                page,
                SEED.pasarTerapung.kode,
                'Seed paket Pasar Terapung tidak ada',
            );
        });

        test('field nama terisi dari seed', async ({ page }) => {
            await expect(page.locator('input#nama')).toHaveValue(
                SEED.pasarTerapung.nama,
            );
        });

        test('field kategori terisi "budaya"', async ({ page }) => {
            await expect(page.locator('select#kategori')).toHaveValue(
                SEED.pasarTerapung.kategori,
            );
        });

        test('field timezone terisi "Asia/Makassar"', async ({ page }) => {
            await expect(page.locator('select#timezone')).toHaveValue(
                SEED.pasarTerapung.timezone,
            );
        });

        test('field durasi_hari terisi 2', async ({ page }) => {
            await expect(page.locator('input#durasi_hari')).toHaveValue('2');
        });

        test('field durasi_malam terisi 1', async ({ page }) => {
            await expect(page.locator('input#durasi_malam')).toHaveValue('1');
        });

        test('field min_peserta terisi 2', async ({ page }) => {
            await expect(page.locator('input#min_peserta')).toHaveValue('2');
        });

        test('field max_peserta terisi 10', async ({ page }) => {
            await expect(page.locator('input#max_peserta')).toHaveValue('10');
        });

        test('field harga_per_orang terisi 850000', async ({ page }) => {
            await expect(
                page.locator('input#harga_per_orang'),
            ).toHaveValue('850000');
        });
    });

    /*
    |--------------------------------------------------------------------------
    | hasChanges Behavior
    |--------------------------------------------------------------------------
    */

    test.describe('hasChanges Behavior', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await openEditPageOrSkip(
                page,
                SEED.pasarTerapung.kode,
                'Seed paket Pasar Terapung tidak ada',
            );
        });

        test('tombol "Simpan" disabled saat tidak ada perubahan', async ({
            page,
        }) => {
            await expect(
                page.getByRole('button', { name: /Simpan Perubahan/i }),
            ).toBeDisabled();
        });

        test('tombol "Reset" disabled saat tidak ada perubahan', async ({
            page,
        }) => {
            await expect(
                page.getByRole('button', { name: /^Reset$/i }),
            ).toBeDisabled();
        });

        test('tombol "Simpan" enabled setelah nama diubah', async ({ page }) => {
            await page.fill('input#nama', 'Nama Paket Baru');

            await expect(
                page.getByRole('button', { name: /Simpan Perubahan/i }),
            ).not.toBeDisabled();
        });

        test('tombol "Reset" enabled setelah harga diubah', async ({ page }) => {
            await page.fill('input#harga_per_orang', '999000');

            await expect(
                page.getByRole('button', { name: /^Reset$/i }),
            ).not.toBeDisabled();
        });

        test('tombol disabled kembali setelah perubahan di-revert', async ({
            page,
        }) => {
            // ✅ Snapshot nilai original dulu (bisa beda dari seed jika
            // test lain sudah mengubah data)
            const originalNama = await page
                .locator('input#nama')
                .inputValue();

            await page.fill('input#nama', 'Nama Paket Baru');
            await expect(
                page.getByRole('button', { name: /Simpan Perubahan/i }),
            ).not.toBeDisabled();

            await page.fill('input#nama', originalNama);
            await expect(
                page.getByRole('button', { name: /Simpan Perubahan/i }),
            ).toBeDisabled();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Reset Form Behavior
    |--------------------------------------------------------------------------
    */

    test.describe('Reset Form', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await openEditPageOrSkip(
                page,
                SEED.pasarTerapung.kode,
                'Seed paket Pasar Terapung tidak ada',
            );
        });

        test('klik Reset mengembalikan nama ke nilai awal', async ({ page }) => {
            const originalNama = await page
                .locator('input#nama')
                .inputValue();

            await page.fill('input#nama', 'Nama Sementara');
            await page.getByRole('button', { name: /^Reset$/i }).click();

            await expect(page.locator('input#nama')).toHaveValue(originalNama);
        });

        test('klik Reset mengembalikan harga ke nilai awal', async ({
            page,
        }) => {
            const originalHarga = await page
                .locator('input#harga_per_orang')
                .inputValue();

            await page.fill('input#harga_per_orang', '999000');
            await page.getByRole('button', { name: /^Reset$/i }).click();

            await expect(
                page.locator('input#harga_per_orang'),
            ).toHaveValue(originalHarga);
        });

        test('setelah Reset, tombol disabled kembali', async ({ page }) => {
            await page.fill('input#nama', 'Nama Sementara');
            await expect(
                page.getByRole('button', { name: /Simpan Perubahan/i }),
            ).not.toBeDisabled();

            await page.getByRole('button', { name: /^Reset$/i }).click();
            await expect(
                page.getByRole('button', { name: /Simpan Perubahan/i }),
            ).toBeDisabled();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Validasi Frontend (Browser)
    |--------------------------------------------------------------------------
    */

    test.describe('Validasi Browser', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await openEditPageOrSkip(
                page,
                SEED.pasarTerapung.kode,
                'Seed paket Pasar Terapung tidak ada',
            );
        });

        test('nama kosong → browser block submit', async ({ page }) => {
            await page.fill('input#nama', '');
            await page
                .getByRole('button', { name: /Simpan Perubahan/i })
                .click();

            await expect(page).toHaveURL(/\/admin\/packages\/\d+\/edit$/);
        });

        test('durasi_hari < 1 → tidak bisa (min=1)', async ({ page }) => {
            await page.fill('input#durasi_hari', '0');
            await page
                .getByRole('button', { name: /Simpan Perubahan/i })
                .click();

            await expect(page).toHaveURL(/\/admin\/packages\/\d+\/edit$/);
        });

        test('durasi_hari punya atribut min=1 max=30', async ({ page }) => {
            const input = page.locator('input#durasi_hari');
            await expect(input).toHaveAttribute('min', '1');
            await expect(input).toHaveAttribute('max', '30');
        });

        test('durasi_malam punya atribut min=0 max=29', async ({ page }) => {
            const input = page.locator('input#durasi_malam');
            await expect(input).toHaveAttribute('min', '0');
            await expect(input).toHaveAttribute('max', '29');
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Accessibility (a11y)
    |--------------------------------------------------------------------------
    */

    test.describe('Accessibility', () => {
        test('halaman edit tidak punya pelanggaran WCAG kritis', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await openEditPageOrSkip(
                page,
                SEED.pasarTerapung.kode,
                'Seed paket Pasar Terapung tidak ada',
            );
            await page.waitForLoadState('networkidle');

            const results = await new AxeBuilder({ page })
                .withTags(['wcag2a', 'wcag2aa'])
                .disableRules([
                    'region',
                    'landmark-one-main',
                    'color-contrast',
                ])
                .analyze();

            const critical = results.violations.filter((v) =>
                ['critical', 'serious'].includes(v.impact ?? ''),
            );
            expect(critical).toEqual([]);
        });

        test('semua input punya label terasosiasi', async ({ page, asAdmin }) => {
            await asAdmin();
            await openEditPageOrSkip(
                page,
                SEED.pasarTerapung.kode,
                'Seed paket Pasar Terapung tidak ada',
            );

            await expect(page.locator('label[for="nama"]')).toBeVisible();
            await expect(page.locator('label[for="deskripsi"]')).toBeVisible();
            await expect(page.locator('label[for="kategori"]')).toBeVisible();
            await expect(page.locator('label[for="timezone"]')).toBeVisible();
            await expect(page.locator('label[for="durasi_hari"]')).toBeVisible();
            await expect(
                page.locator('label[for="durasi_malam"]'),
            ).toBeVisible();
            await expect(
                page.locator('label[for="min_peserta"]'),
            ).toBeVisible();
            await expect(
                page.locator('label[for="max_peserta"]'),
            ).toBeVisible();
            await expect(
                page.locator('label[for="harga_per_orang"]'),
            ).toBeVisible();
        });

        test('tombol "Simpan Perubahan" bertipe submit', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await openEditPageOrSkip(
                page,
                SEED.pasarTerapung.kode,
                'Seed paket Pasar Terapung tidak ada',
            );

            await expect(
                page.getByRole('button', { name: /Simpan Perubahan/i }),
            ).toHaveAttribute('type', 'submit');
        });

        test('tombol "Reset" bertipe button', async ({ page, asAdmin }) => {
            await asAdmin();
            await openEditPageOrSkip(
                page,
                SEED.pasarTerapung.kode,
                'Seed paket Pasar Terapung tidak ada',
            );

            await expect(
                page.getByRole('button', { name: /^Reset$/i }),
            ).toHaveAttribute('type', 'button');
        });
    });

    /*
    |--------------------------------------------------------------------------
    | MUTATION — Update Package (serial)
    |--------------------------------------------------------------------------
    */

    test.describe.serial('Happy Path — Update Package', () => {
        test('admin bisa update nama & deskripsi paket', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            const id = await openEditPageOrSkip(
                page,
                SEED.kulinerBanjarmasin.kode,
                'Seed paket draft Kuliner Banjarmasin tidak ada. ' +
                    'Cek database/seeders/PackageSeeder.php — pastikan ' +
                    'PKG-*-003 dibuat dengan status=draft.',
            );

            const newNama = `Kuliner Banjarmasin Updated E2E ${Date.now()}`;
            await page.fill('input#nama', newNama);
            await page.fill(
                'textarea#deskripsi',
                'Deskripsi baru dari test E2E.',
            );

            await Promise.all([
                page.waitForResponse(
                    (resp) =>
                        resp.url().endsWith(`/admin/packages/${id}`) &&
                        resp.request().method() === 'PUT',
                    { timeout: 20_000 },
                ),
                page
                    .getByRole('button', { name: /Simpan Perubahan/i })
                    .click(),
            ]);

            // ✅ Tunggu redirect stabilize
            await page.waitForURL(`/admin/packages/${id}`, {
                timeout: 15_000,
            });

            await expect(
                page.getByText(/Paket berhasil diperbarui/i),
            ).toBeVisible({ timeout: 10_000 });

            await expect(
                page.getByRole('heading', { name: newNama }),
            ).toBeVisible();
        });

        test('admin bisa update harga paket', async ({ page, asAdmin }) => {
            await asAdmin();
            const id = await openEditPageOrSkip(
                page,
                SEED.kulinerBanjarmasin.kode,
                'Seed paket draft Kuliner Banjarmasin tidak ada.',
            );

            await page.fill('input#harga_per_orang', '425000');

            await Promise.all([
                page.waitForResponse(
                    (resp) =>
                        resp.url().endsWith(`/admin/packages/${id}`) &&
                        resp.request().method() === 'PUT',
                    { timeout: 20_000 },
                ),
                page
                    .getByRole('button', { name: /Simpan Perubahan/i })
                    .click(),
            ]);

            await page.waitForURL(`/admin/packages/${id}`, {
                timeout: 15_000,
            });

            await expect(
                page.getByText(/Paket berhasil diperbarui/i),
            ).toBeVisible({ timeout: 10_000 });

            await expect(page.getByText(/Rp 425\.000/)).toBeVisible();
        });

        test('admin bisa update kategori & timezone', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            const id = await openEditPageOrSkip(
                page,
                SEED.kulinerBanjarmasin.kode,
                'Seed paket draft Kuliner Banjarmasin tidak ada.',
            );

            await page.selectOption('select#kategori', 'budaya');
            await page.selectOption('select#timezone', 'Asia/Jakarta');

            await Promise.all([
                page.waitForResponse(
                    (resp) =>
                        resp.url().endsWith(`/admin/packages/${id}`) &&
                        resp.request().method() === 'PUT',
                    { timeout: 20_000 },
                ),
                page
                    .getByRole('button', { name: /Simpan Perubahan/i })
                    .click(),
            ]);

            await page.waitForURL(`/admin/packages/${id}`, {
                timeout: 15_000,
            });

            await expect(
                page.getByText(/Paket berhasil diperbarui/i),
            ).toBeVisible({ timeout: 10_000 });

            await expect(page.getByText(/^Budaya$/i).first()).toBeVisible();
            await expect(page.getByText(/WIB/i).first()).toBeVisible();
        });
    });
});