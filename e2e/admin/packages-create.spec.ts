import { test, expect } from '../fixtures/auth';
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

/**
 * Admin — Buat Paket Wisata Baru (Create)
 *
 * Route:
 * - GET  /admin/packages/create  → Admin\PackageController@create
 * - POST /admin/packages         → Admin\PackageController@store
 *
 * Behavior:
 * - 2-step wizard: "Info Dasar" (step 1) → "Harga" (step 2)
 * - Step 1: nama, deskripsi, kategori, timezone, durasi_hari,
 *           durasi_malam, min_peserta, max_peserta
 * - Step 2: harga_per_orang, harga_per_rombongan (opsional)
 * - Validasi client-side di `goToStep2()`:
 *     - nama >= 3 karakter
 *     - durasi_hari >= 1
 *     - durasi_malam < durasi_hari
 *     - min_peserta <= max_peserta
 * - Submit → redirect ke /admin/packages/{id} (Show) + flash sukses
 * - Status awal = `draft` (bukan aktif)
 *
 * CATATAN PENTING:
 * - Test "Happy Path" MENAMBAH package baru ke DB → state leak.
 * - Pakai `describe.serial()` untuk happy path + taruh di paling akhir.
 * - Setiap test pakai nama unik (prefix `E2E <timestamp>`) supaya tidak collision.
 * - `kode` & `slug` auto-generate di service, tidak perlu input.
 *
 * Data seed (dari PackageSeeder) — tidak boleh bentrok:
 * - PKG-{year}-001 "Wisata Pasar Terapung 2D1N"
 * - PKG-{year}-002 "Petualangan Hutan Kalimantan 3D2N"
 * - PKG-{year}-003 "Wisata Kuliner Banjarmasin 1D"
 */

// ==========================================
// KONSTANTA
// ==========================================

const UNIQUE_SUFFIX = `E2E ${Date.now()}`;

const VALID_PACKAGE = {
    nama: `Paket Test ${UNIQUE_SUFFIX}`,
    deskripsi: 'Deskripsi paket hasil test E2E otomatis.',
    kategori: 'budaya' as const,
    timezone: 'Asia/Makassar' as const,
    durasiHari: 2,
    durasiMalam: 1,
    minPeserta: 2,
    maxPeserta: 10,
    hargaPerOrang: '850000',
    hargaPerRombongan: '',
};

// ==========================================
// HELPER
// ==========================================

/**
 * Isi semua field Step 1 (Info Dasar).
 */
async function fillStep1(
    page: Page,
    data: {
        nama?: string;
        deskripsi?: string;
        kategori?: string;
        timezone?: string;
        durasiHari?: number;
        durasiMalam?: number;
        minPeserta?: number;
        maxPeserta?: number;
    },
): Promise<void> {
    if (data.nama !== undefined) await page.fill('input#nama', data.nama);
    if (data.deskripsi !== undefined)
        await page.fill('textarea#deskripsi', data.deskripsi);
    if (data.kategori !== undefined)
        await page.selectOption('select#kategori', data.kategori);
    if (data.timezone !== undefined)
        await page.selectOption('select#timezone', data.timezone);
    if (data.durasiHari !== undefined)
        await page.fill('input#durasi_hari', String(data.durasiHari));
    if (data.durasiMalam !== undefined)
        await page.fill('input#durasi_malam', String(data.durasiMalam));
    if (data.minPeserta !== undefined)
        await page.fill('input#min_peserta', String(data.minPeserta));
    if (data.maxPeserta !== undefined)
        await page.fill('input#max_peserta', String(data.maxPeserta));
}

/**
 * Klik tombol "Lanjut ke Harga" — trigger client-side validation.
 */
async function goToStep2(page: Page): Promise<void> {
    await page.getByRole('button', { name: /Lanjut ke Harga/i }).click();
}

/**
 * Isi field Step 2 (Harga).
 */
async function fillStep2(
    page: Page,
    data: {
        hargaPerOrang?: string;
        hargaPerRombongan?: string;
    },
): Promise<void> {
    if (data.hargaPerOrang !== undefined) {
        await page.fill('input#harga_per_orang', data.hargaPerOrang);
    }
    if (data.hargaPerRombongan !== undefined) {
        await page.fill(
            'input#harga_per_rombongan',
            data.hargaPerRombongan,
        );
    }
}

/**
 * Submit form create dan tunggu POST /admin/packages.
 */
async function submitCreate(page: Page): Promise<void> {
    await Promise.all([
        page.waitForResponse(
            (resp) =>
                resp.url().endsWith('/admin/packages') &&
                resp.request().method() === 'POST',
            { timeout: 20_000 },
        ),
        page.getByRole('button', { name: /^Buat Paket$/i }).click(),
    ]);
}

// ==========================================
// TEST SUITE
// ==========================================

test.describe('Admin — Buat Paket Wisata Baru', () => {
    /*
    |--------------------------------------------------------------------------
    | Access Control
    |--------------------------------------------------------------------------
    */

    test('guest tidak bisa akses halaman create', async ({ page, asGuest }) => {
        await asGuest();
        await page.goto('/admin/packages/create');
        await expect(page).toHaveURL('/login');
    });

    test('client tidak bisa akses halaman create', async ({ page, asClient }) => {
        await asClient();
        await page.goto('/admin/packages/create');
        await expect(page).toHaveURL('/client/dashboard');
    });

    test('mitra tidak bisa akses halaman create', async ({ page, asMitra }) => {
        await asMitra();
        await page.goto('/admin/packages/create');
        await expect(page).toHaveURL('/mitra/dashboard');
    });

    test('admin bisa akses halaman create', async ({ page, asAdmin }) => {
        await asAdmin();
        await page.goto('/admin/packages/create');
        await expect(page).toHaveURL('/admin/packages/create');
    });

    /*
    |--------------------------------------------------------------------------
    | Contract — Step 1 (Info Dasar)
    |--------------------------------------------------------------------------
    */

    test.describe('Step 1 — Contract', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/packages/create');
        });

        test('menampilkan breadcrumb "Kembali ke Daftar Paket"', async ({
            page,
        }) => {
            await expect(
                page.getByRole('link', { name: /Kembali ke Daftar Paket/i }),
            ).toBeVisible();
        });

        test('breadcrumb mengarah ke /admin/packages', async ({ page }) => {
            await expect(
                page.getByRole('link', { name: /Kembali ke Daftar Paket/i }),
            ).toHaveAttribute('href', /\/admin\/packages$/);
        });

        test('menampilkan stepper step 1 & 2', async ({ page }) => {
            await expect(page.getByText(/Info Dasar/i).first()).toBeVisible();
            await expect(page.getByText(/Harga/i).first()).toBeVisible();
        });

        test('menampilkan heading "Informasi Dasar Paket"', async ({ page }) => {
            await expect(
                page.getByRole('heading', { name: /Informasi Dasar Paket/i }),
            ).toBeVisible();
        });

        test('menampilkan field nama paket', async ({ page }) => {
            await expect(page.locator('input#nama')).toBeVisible();
            await expect(page.locator('input#nama')).toHaveAttribute(
                'required',
                '',
            );
        });

        test('menampilkan field deskripsi (textarea)', async ({ page }) => {
            await expect(page.locator('textarea#deskripsi')).toBeVisible();
        });

        test('menampilkan dropdown kategori', async ({ page }) => {
            await expect(page.locator('select#kategori')).toBeVisible();
        });

        test('dropdown kategori punya 5 opsi', async ({ page }) => {
            const options = page.locator('select#kategori option');
            await expect(options).toHaveCount(5);
        });

        test('menampilkan dropdown timezone', async ({ page }) => {
            await expect(page.locator('select#timezone')).toBeVisible();
        });

        test('dropdown timezone punya 3 opsi (WIB/WITA/WIT)', async ({ page }) => {
            const options = page.locator('select#timezone option');
            await expect(options).toHaveCount(3);
        });

        test('menampilkan field durasi_hari', async ({ page }) => {
            const input = page.locator('input#durasi_hari');
            await expect(input).toBeVisible();
            await expect(input).toHaveAttribute('min', '1');
            await expect(input).toHaveAttribute('max', '30');
        });

        test('menampilkan field durasi_malam', async ({ page }) => {
            const input = page.locator('input#durasi_malam');
            await expect(input).toBeVisible();
            await expect(input).toHaveAttribute('min', '0');
        });

        test('menampilkan field min_peserta & max_peserta', async ({ page }) => {
            await expect(page.locator('input#min_peserta')).toBeVisible();
            await expect(page.locator('input#max_peserta')).toBeVisible();
        });

        test('menampilkan tombol "Lanjut ke Harga"', async ({ page }) => {
            await expect(
                page.getByRole('button', { name: /Lanjut ke Harga/i }),
            ).toBeVisible();
        });

        test('menampilkan tombol "Batal"', async ({ page }) => {
            await expect(
                page.getByRole('link', { name: /^Batal$/i }),
            ).toBeVisible();
        });

        test('tombol "Batal" mengarah ke /admin/packages', async ({ page }) => {
            await expect(
                page.getByRole('link', { name: /^Batal$/i }),
            ).toHaveAttribute('href', /\/admin\/packages$/);
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Validasi Frontend — Step 1
    |--------------------------------------------------------------------------
    |
    | `goToStep2()` di Create.svelte melakukan validasi client-side.
    | Kalau gagal, tetap di step 1 + error muncul.
    | --------------------------------------------------------------------------
    */

    test.describe('Step 1 — Validasi Frontend', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/packages/create');
        });

        test('nama kosong → browser required block submit', async ({ page }) => {
            // Tanpa nama, klik Lanjut
            await page.getByRole('button', { name: /Lanjut ke Harga/i }).click();

            // Tetap di step 1 (input nama masih visible)
            await expect(page.locator('input#nama')).toBeVisible();
        });

        test('nama < 3 karakter → error muncul (client-side)', async ({
            page,
        }) => {
            await fillStep1(page, {
                nama: 'AB',
                kategori: 'budaya',
                timezone: 'Asia/Makassar',
                durasiHari: 2,
                durasiMalam: 1,
                minPeserta: 2,
                maxPeserta: 10,
            });

            await goToStep2(page);

            // Tetap di step 1, error nama muncul
            await expect(
                page.getByText(/Nama paket minimal 3 karakter/i),
            ).toBeVisible();
        });

        test('durasi_malam >= durasi_hari → error muncul', async ({ page }) => {
            await fillStep1(page, {
                nama: 'Paket Test',
                kategori: 'budaya',
                timezone: 'Asia/Makassar',
                durasiHari: 2,
                durasiMalam: 2, // harus < durasi_hari
                minPeserta: 2,
                maxPeserta: 10,
            });

            await goToStep2(page);

            await expect(
                page.getByText(/Durasi malam harus kurang dari durasi hari/i),
            ).toBeVisible();
        });

        test('min_peserta > max_peserta → error muncul', async ({ page }) => {
            await fillStep1(page, {
                nama: 'Paket Test',
                kategori: 'budaya',
                timezone: 'Asia/Makassar',
                durasiHari: 2,
                durasiMalam: 1,
                minPeserta: 20,
                maxPeserta: 5,
            });

            await goToStep2(page);

            await expect(
                page.getByText(
                    /Minimal peserta tidak boleh lebih besar dari maksimal/i,
                ),
            ).toBeVisible();
        });

        test('semua field valid → lanjut ke step 2', async ({ page }) => {
            await fillStep1(page, {
                nama: 'Paket Test Valid',
                kategori: 'budaya',
                timezone: 'Asia/Makassar',
                durasiHari: 2,
                durasiMalam: 1,
                minPeserta: 2,
                maxPeserta: 10,
            });

            await goToStep2(page);

            // Heading step 2 muncul
            await expect(
                page.getByRole('heading', { name: /Harga Jual Paket/i }),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Contract — Step 2 (Harga)
    |--------------------------------------------------------------------------
    */

    test.describe('Step 2 — Contract', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/packages/create');

            await fillStep1(page, {
                nama: 'Paket Test Step 2',
                kategori: 'budaya',
                timezone: 'Asia/Makassar',
                durasiHari: 2,
                durasiMalam: 1,
                minPeserta: 2,
                maxPeserta: 10,
            });
            await goToStep2(page);
        });

        test('menampilkan heading "Harga Jual Paket"', async ({ page }) => {
            await expect(
                page.getByRole('heading', { name: /Harga Jual Paket/i }),
            ).toBeVisible();
        });

        test('menampilkan tombol "Ubah Info Dasar"', async ({ page }) => {
            await expect(
                page.getByRole('button', { name: /Ubah Info Dasar/i }),
            ).toBeVisible();
        });

        test('klik "Ubah Info Dasar" kembali ke step 1', async ({ page }) => {
            await page.getByRole('button', { name: /Ubah Info Dasar/i }).click();

            await expect(page.locator('input#nama')).toBeVisible();
        });

        test('menampilkan field harga_per_orang', async ({ page }) => {
            const input = page.locator('input#harga_per_orang');
            await expect(input).toBeVisible();
            await expect(input).toHaveAttribute('required', '');
        });

        test('menampilkan field harga_per_rombongan (opsional)', async ({
            page,
        }) => {
            const input = page.locator('input#harga_per_rombongan');
            await expect(input).toBeVisible();
            // Tidak required
            const required = await input.getAttribute('required');
            expect(required).toBeNull();
        });

        test('menampilkan prefix "Rp" di input harga', async ({ page }) => {
            // Prefix Rp muncul sebagai span di dalam .relative wrapper
            const rpCount = await page.getByText('Rp', { exact: true }).count();
            expect(rpCount).toBeGreaterThanOrEqual(2);
        });

        test('menampilkan tombol "Kembali"', async ({ page }) => {
            await expect(
                page.getByRole('button', { name: /^Kembali$/i }),
            ).toBeVisible();
        });

        test('menampilkan tombol "Buat Paket"', async ({ page }) => {
            await expect(
                page.getByRole('button', { name: /^Buat Paket$/i }),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Validasi — Step 2 (Browser required)
    |--------------------------------------------------------------------------
    */

    test.describe('Step 2 — Validasi Browser', () => {
        test('harga_per_orang kosong → tidak submit (browser block)', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await page.goto('/admin/packages/create');

            await fillStep1(page, {
                nama: 'Paket Test Required',
                kategori: 'budaya',
                timezone: 'Asia/Makassar',
                durasiHari: 1,
                durasiMalam: 0,
                minPeserta: 1,
                maxPeserta: 5,
            });
            await goToStep2(page);

            // Klik Buat Paket tanpa isi harga
            await page.getByRole('button', { name: /^Buat Paket$/i }).click();

            // Tetap di halaman create (browser block)
            await expect(page).toHaveURL('/admin/packages/create');
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Accessibility (a11y)
    |--------------------------------------------------------------------------
    */

    test.describe('Accessibility', () => {
        test('Step 1 tidak punya pelanggaran WCAG kritis', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await page.goto('/admin/packages/create');
            await page.waitForLoadState('networkidle');

            const results = await new AxeBuilder({ page })
                .withTags(['wcag2a', 'wcag2aa'])
                .disableRules(['region', 'landmark-one-main'])
                .analyze();

            const critical = results.violations.filter((v) =>
                ['critical', 'serious'].includes(v.impact ?? ''),
            );
            expect(critical).toEqual([]);
        });

        test('label input Step 1 terasosiasi', async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/packages/create');

            await expect(page.locator('label[for="nama"]')).toBeVisible();
            await expect(page.locator('label[for="deskripsi"]')).toBeVisible();
            await expect(page.locator('label[for="kategori"]')).toBeVisible();
            await expect(page.locator('label[for="timezone"]')).toBeVisible();
            await expect(page.locator('label[for="durasi_hari"]')).toBeVisible();
            await expect(page.locator('label[for="durasi_malam"]')).toBeVisible();
            await expect(page.locator('label[for="min_peserta"]')).toBeVisible();
            await expect(page.locator('label[for="max_peserta"]')).toBeVisible();
        });

        test('label input Step 2 terasosiasi', async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/packages/create');

            await fillStep1(page, {
                nama: 'Paket Test A11y',
                kategori: 'budaya',
                timezone: 'Asia/Makassar',
                durasiHari: 1,
                durasiMalam: 0,
                minPeserta: 1,
                maxPeserta: 5,
            });
            await goToStep2(page);

            await expect(
                page.locator('label[for="harga_per_orang"]'),
            ).toBeVisible();
            await expect(
                page.locator('label[for="harga_per_rombongan"]'),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | HAPPY PATH — Create Package (serial, di paling akhir)
    |--------------------------------------------------------------------------
    |
    | ⚠️ Test ini MENAMBAH package baru ke DB.
    | Setelah run, DB tidak kembali ke seed — test lain yang assert exact
    | count bisa gagal.
    |
    | Pakai describe.serial() + taruh di akhir file.
    | Unique name via timestamp untuk hindari collision antar run.
    | --------------------------------------------------------------------------
    */

    test.describe.serial('Happy Path — Buat Paket Baru', () => {
        test('admin bisa buat paket baru dengan data valid', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await page.goto('/admin/packages/create');

            // === STEP 1 ===
            await fillStep1(page, {
                nama: VALID_PACKAGE.nama,
                deskripsi: VALID_PACKAGE.deskripsi,
                kategori: VALID_PACKAGE.kategori,
                timezone: VALID_PACKAGE.timezone,
                durasiHari: VALID_PACKAGE.durasiHari,
                durasiMalam: VALID_PACKAGE.durasiMalam,
                minPeserta: VALID_PACKAGE.minPeserta,
                maxPeserta: VALID_PACKAGE.maxPeserta,
            });
            await goToStep2(page);

            // === STEP 2 ===
            await expect(
                page.getByRole('heading', { name: /Harga Jual Paket/i }),
            ).toBeVisible();

            await fillStep2(page, {
                hargaPerOrang: VALID_PACKAGE.hargaPerOrang,
                hargaPerRombongan: VALID_PACKAGE.hargaPerRombongan,
            });

            // Submit
            await submitCreate(page);

            // Redirect ke Show page
            await expect(page).toHaveURL(
                /\/admin\/packages\/\d+$/,
                { timeout: 15_000 },
            );

            // Flash sukses (rendered di DashboardLayout)
            await expect(
                page.getByText(/Paket berhasil dibuat/i),
            ).toBeVisible({ timeout: 10_000 });

            // Status awal = draft (belum aktif)
            await expect(
                page.getByText(/^Draft$/i).first(),
            ).toBeVisible();

            // Nama paket muncul di halaman Show
            await expect(
                page.getByRole('heading', { name: VALID_PACKAGE.nama }),
            ).toBeVisible();
        });

        test('setelah create, paket baru muncul di index (status draft)', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await page.goto('/admin/packages');

            // Cari paket yang baru dibuat
            const row = page
                .locator('tbody tr')
                .filter({ hasText: VALID_PACKAGE.nama });

            await expect(row).toBeVisible();
            await expect(row.getByText(/^Draft$/i)).toBeVisible();
        });
    });
});