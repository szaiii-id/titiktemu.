import { test, expect, SEED_USERS } from '../fixtures/auth';
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

/**
 * Mitra — Payouts (Index + Create)
 *
 * Routes:
 * - GET  /mitra/payouts          → Mitra\PayoutController@index
 * - GET  /mitra/payouts/create   → Mitra\PayoutController@create
 * - POST /mitra/payouts          → Mitra\PayoutController@store
 *
 * Business rules:
 * - Min payout: Rp 100.000 (PayoutService::MINIMUM_PAYOUT)
 * - Saldo cukup (dari wallet mitra)
 * - Max 1 pending/day per mitra
 * - Create payout TIDAK debit saldo — debit hanya di admin approve
 *
 * Seed wallet (dari WalletSeeder, env testing):
 * - Saldo awal Rp 500.000 per mitra
 * - 1 transaction credit "adjustment"
 * - Tidak ada payout seed
 *
 * CATATAN PENTING:
 * - File ini MENGUBAH state DB (create payout).
 * - Setup: login sebagai mitra (budi@ptabc.com), wallet saldo 500rb.
 * - Test max 1 pending/day pakai request context untuk cegah duplikat.
 * - Zero mutation untuk contract tests.
 */

// ==========================================
// KONSTANTA
// ==========================================

const PAYOUT_JUMLAH = 150_000;
const PAYOUT_MIN = 100_000;
const SALDO_SEED = 500_000;

// ==========================================
// HELPER
// ==========================================

async function getCsrf(page: Page): Promise<string> {
    await page.goto('/');
    return await page.evaluate(() => {
        const m = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
        return m ? decodeURIComponent(m[1]) : '';
    });
}

/**
 * Submit form create payout via UI.
 */
async function submitCreatePayout(
    page: Page,
    data: {
        jumlah: number;
        bank: string;
        noRekening: string;
        namaPemilik: string;
        catatan?: string;
    },
): Promise<void> {
    // RupiahInput: text input[inputmode="numeric"], isi dengan string
    // angka murni (komponen akan format on blur)
    await page.locator('input[inputmode="numeric"]').first().fill(
        String(data.jumlah),
    );

    await page.fill('input#bank', data.bank);
    await page.fill('input#norek', data.noRekening);
    await page.fill('input#nama', data.namaPemilik);

    if (data.catatan) {
        await page.fill('textarea#catatan', data.catatan);
    }

    await Promise.all([
        page.waitForResponse(
            (resp) =>
                resp.url().endsWith('/mitra/payouts') &&
                resp.request().method() === 'POST',
            { timeout: 15_000 },
        ),
        page
            .getByRole('button', { name: /Ajukan Pencairan/i })
            .last()
            .click(),
    ]);
}

// ==========================================
// TEST SUITE
// ==========================================

test.describe('Mitra — Payouts', () => {
    /*
    |--------------------------------------------------------------------------
    | Access Control
    |--------------------------------------------------------------------------
    */

    test('guest tidak bisa akses payouts index mitra', async ({
        page,
        asGuest,
    }) => {
        await asGuest();
        await page.goto('/mitra/payouts');
        await expect(page).toHaveURL('/login');
    });

    test('client tidak bisa akses payouts index mitra', async ({
        page,
        asClient,
    }) => {
        await asClient();
        await page.goto('/mitra/payouts');
        await expect(page).toHaveURL('/client/dashboard');
    });

    test('admin tidak bisa akses payouts index mitra', async ({
        page,
        asAdmin,
    }) => {
        await asAdmin();
        await page.goto('/mitra/payouts');
        await expect(page).toHaveURL('/admin/dashboard');
    });

    test('mitra bisa akses payouts index', async ({ page, asMitra }) => {
        await asMitra();
        await page.goto('/mitra/payouts');
        await expect(page).toHaveURL('/mitra/payouts');
    });

    /*
    |--------------------------------------------------------------------------
    | Index — Contract
    |--------------------------------------------------------------------------
    */

    test.describe('Index — Contract', () => {
        test.beforeEach(async ({ page, asMitra }) => {
            await asMitra();
            await page.goto('/mitra/payouts');
        });

        test('menampilkan heading "Pencairan Honor"', async ({ page }) => {
            await expect(
                page.getByRole('heading', {
                    name: /^Pencairan Honor$/i,
                }).first(),
            ).toBeVisible();
        });

        test('menampilkan deskripsi halaman', async ({ page }) => {
            await expect(
                page.getByText(/Riwayat pengajuan pencairan saldo Anda/i),
            ).toBeVisible();
        });

        test('menampilkan tombol "Ajukan Pencairan"', async ({ page }) => {
            await expect(
                page.getByRole('link', { name: /Ajukan Pencairan/i }),
            ).toBeVisible();
        });

        test('tombol "Ajukan Pencairan" mengarah ke /mitra/payouts/create', async ({
            page,
        }) => {
            await expect(
                page.getByRole('link', { name: /Ajukan Pencairan/i }),
            ).toHaveAttribute('href', /\/mitra\/payouts\/create$/);
        });

        test('menampilkan input search', async ({ page }) => {
            await expect(
                page.locator('input[placeholder*="Cari"]'),
            ).toHaveAttribute(
                'placeholder',
                /Cari kode pencairan/i,
            );
        });

        test('menampilkan 5 status tab', async ({ page }) => {
            await expect(
                page.getByRole('tab', { name: /^Semua/i }),
            ).toBeVisible();
            await expect(
                page.getByRole('tab', { name: /^Menunggu Review/i }),
            ).toBeVisible();
            await expect(
                page.getByRole('tab', { name: /^Disetujui/i }),
            ).toBeVisible();
            await expect(
                page.getByRole('tab', { name: /^Sudah Ditransfer/i }),
            ).toBeVisible();
            await expect(
                page.getByRole('tab', { name: /^Ditolak/i }),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Index — Empty State
    |--------------------------------------------------------------------------
    */

    test.describe('Index — Empty State', () => {
        test('menampilkan empty state saat belum ada payout', async ({
            page,
            asMitra,
        }) => {
            await asMitra();
            await page.goto('/mitra/payouts');

            await expect(
                page.getByText(/Belum ada pengajuan/i),
            ).toBeVisible();
            await expect(
                page.getByText(/Anda belum pernah mengajukan pencairan/i),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Create — Contract
    |--------------------------------------------------------------------------
    */

    test.describe('Create — Contract', () => {
        test.beforeEach(async ({ page, asMitra }) => {
            await asMitra();
            await page.goto('/mitra/payouts/create');
        });

        test('menampilkan breadcrumb "Kembali ke Pencairan"', async ({
            page,
        }) => {
            await expect(
                page.getByRole('link', { name: /Kembali ke Pencairan/i }),
            ).toBeVisible();
        });

        test('menampilkan heading "Ajukan Pencairan"', async ({ page }) => {
            await expect(
                page.getByRole('heading', { name: /Ajukan Pencairan/i }).first(),
            ).toBeVisible();
        });

        test('menampilkan saldo card "Saldo Tersedia"', async ({ page }) => {
            await expect(
                page.getByText(/Saldo Tersedia/i).first(),
            ).toBeVisible();
        });

        test('menampilkan nominal saldo (format Rp)', async ({ page }) => {
            // Saldo seed 500rb → "Rp 500.000"
            const saldoMatches = await page.getByText(/Rp/).count();
            expect(saldoMatches).toBeGreaterThan(0);
        });

        test('menampilkan field jumlah (RupiahInput)', async ({ page }) => {
            await expect(
                page.locator('input[inputmode="numeric"]').first(),
            ).toBeVisible();
        });

        test('menampilkan hint minimum Rp 100.000', async ({ page }) => {
            await expect(
                page.getByText(/Minimum Rp 100\.000/i),
            ).toBeVisible();
        });

        test('menampilkan field bank tujuan', async ({ page }) => {
            await expect(page.locator('input#bank')).toBeVisible();
            await expect(page.locator('input#bank')).toHaveAttribute(
                'required',
                '',
            );
        });

        test('menampilkan field no rekening', async ({ page }) => {
            await expect(page.locator('input#norek')).toBeVisible();
            await expect(page.locator('input#norek')).toHaveAttribute(
                'required',
                '',
            );
        });

        test('menampilkan field nama pemilik rekening', async ({ page }) => {
            await expect(page.locator('input#nama')).toBeVisible();
            await expect(page.locator('input#nama')).toHaveAttribute(
                'required',
                '',
            );
        });

        test('menampilkan textarea catatan (opsional)', async ({ page }) => {
            await expect(page.locator('textarea#catatan')).toBeVisible();
            const required = await page
                .locator('textarea#catatan')
                .getAttribute('required');
            expect(required).toBeNull();
        });

        test('menampilkan tombol "Batal"', async ({ page }) => {
            await expect(
                page.getByRole('link', { name: /^Batal$/i }),
            ).toBeVisible();
        });

        test('tombol "Batal" mengarah ke /mitra/payouts', async ({ page }) => {
            await expect(
                page.getByRole('link', { name: /^Batal$/i }),
            ).toHaveAttribute('href', /\/mitra\/payouts$/);
        });

        test('menampilkan tombol "Ajukan Pencairan"', async ({ page }) => {
            await expect(
                page.getByRole('button', { name: /Ajukan Pencairan/i }).last(),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Create — Validasi Frontend (Browser)
    |--------------------------------------------------------------------------
    */

    test.describe('Create — Validasi Browser', () => {
        test.beforeEach(async ({ page, asMitra }) => {
            await asMitra();
            await page.goto('/mitra/payouts/create');
        });

        test('jumlah kosong → tidak submit', async ({ page }) => {
            // Hanya isi field bank/norek/nama, biarkan jumlah kosong
            await page.fill('input#bank', 'BCA');
            await page.fill('input#norek', '1234567890');
            await page.fill('input#nama', 'Budi Santoso');

            await page
                .getByRole('button', { name: /Ajukan Pencairan/i })
                .last()
                .click();

            // Tetap di halaman create (browser required on jumlah)
            await expect(page).toHaveURL('/mitra/payouts/create');
        });

        test('bank kosong → tidak submit', async ({ page }) => {
            await page.locator('input[inputmode="numeric"]').first().fill(
                String(PAYOUT_JUMLAH),
            );
            await page.fill('input#norek', '1234567890');
            await page.fill('input#nama', 'Budi Santoso');

            await page
                .getByRole('button', { name: /Ajukan Pencairan/i })
                .last()
                .click();

            await expect(page).toHaveURL('/mitra/payouts/create');
        });

        test('no rekening kosong → tidak submit', async ({ page }) => {
            await page.locator('input[inputmode="numeric"]').first().fill(
                String(PAYOUT_JUMLAH),
            );
            await page.fill('input#bank', 'BCA');
            await page.fill('input#nama', 'Budi Santoso');

            await page
                .getByRole('button', { name: /Ajukan Pencairan/i })
                .last()
                .click();

            await expect(page).toHaveURL('/mitra/payouts/create');
        });

        test('nama kosong → tidak submit', async ({ page }) => {
            await page.locator('input[inputmode="numeric"]').first().fill(
                String(PAYOUT_JUMLAH),
            );
            await page.fill('input#bank', 'BCA');
            await page.fill('input#norek', '1234567890');

            await page
                .getByRole('button', { name: /Ajukan Pencairan/i })
                .last()
                .click();

            await expect(page).toHaveURL('/mitra/payouts/create');
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Accessibility (a11y)
    |--------------------------------------------------------------------------
    */

    test.describe('Accessibility', () => {
        test('Index tidak punya pelanggaran WCAG kritis', async ({
            page,
            asMitra,
        }) => {
            await asMitra();
            await page.goto('/mitra/payouts');
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

        test('Create tidak punya pelanggaran WCAG kritis', async ({
            page,
            asMitra,
        }) => {
            await asMitra();
            await page.goto('/mitra/payouts/create');
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

        test('semua field punya label terasosiasi', async ({
            page,
            asMitra,
        }) => {
            await asMitra();
            await page.goto('/mitra/payouts/create');

            await expect(page.locator('label[for="bank"]')).toBeVisible();
            await expect(page.locator('label[for="norek"]')).toBeVisible();
            await expect(page.locator('label[for="nama"]')).toBeVisible();
            await expect(page.locator('label[for="catatan"]')).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | MUTATION — Create Payout (serial)
    |--------------------------------------------------------------------------
    |
    | Setup:
    |   1. WalletSeeder (testing) → saldo Rp 500.000
    |   2. Create payout 150rb via UI
    |   3. Redirect ke index + flash sukses + status pending
    |   4. Max 1 pending/day → request payout 2 → errors.payout (server guard)
    |
    | Catatan: PayoutService::request TIDAK debit saldo. Debit hanya di
    | admin approve. Jadi test tidak assert saldo berubah setelah create.
    | --------------------------------------------------------------------------
    */

    test.describe.serial('Create Payout — Happy Path + Guard', () => {
        let payoutKode: string;

        test('step 1: create payout 150rb via UI', async ({
            page,
            asMitra,
        }) => {
            await asMitra();
            await page.goto('/mitra/payouts/create');

            // Saldo seed 500rb → cukup untuk 150rb
            await submitCreatePayout(page, {
                jumlah: PAYOUT_JUMLAH,
                bank: 'BCA',
                noRekening: '1234567890',
                namaPemilik: 'Budi Santoso',
                catatan: 'E2E test payout',
            });

            // Redirect ke index + flash sukses
            await expect(page).toHaveURL('/mitra/payouts', {
                timeout: 15_000,
            });
            await expect(
                page.getByText(/Pengajuan pencairan berhasil/i),
            ).toBeVisible({ timeout: 10_000 });

            // Payout muncul di list (status pending)
            await expect(
                page.getByText(/Menunggu Review/i).first(),
            ).toBeVisible();

            // Ambil kode payout (PAY-{year}-XXX) dari list
            const kodeMatch = await page
                .locator('text=/PAY-\\d{4}-\\d+/')
                .first()
                .textContent();
            expect(kodeMatch).toBeTruthy();
            payoutKode = kodeMatch!.trim();
        });

        test('step 2: payout 150rb muncul di index mitra', async ({
            page,
            asMitra,
        }) => {
            await asMitra();
            await page.goto('/mitra/payouts');

            // Kode payout muncul
            await expect(page.getByText(payoutKode)).toBeVisible();

            // Nominal Rp 150.000
            await expect(
                page.getByText(/Rp 150\.000/i).first(),
            ).toBeVisible();

            // Bank + no rekening
            await expect(
                page.getByText(/BCA.*1234567890/i).first(),
            ).toBeVisible();

            // Status badge "Menunggu Review"
            await expect(
                page.getByText(/Menunggu Review/i).first(),
            ).toBeVisible();
        });

        test('step 3: request payout lagi (1 pending/day) → errors.payout', async ({
            page,
            asMitra,
        }) => {
            await asMitra();
            await page.goto('/mitra/payouts/create');

            // Isi form dengan nominal lain
            await page.locator('input[inputmode="numeric"]').first().fill(
                '200000',
            );
            await page.fill('input#bank', 'Mandiri');
            await page.fill('input#norek', '9876543210');
            await page.fill('input#nama', 'Budi Santoso');

            // Submit → server guard: max 1 pending/day
            await Promise.all([
                page.waitForResponse(
                    (resp) =>
                        resp.url().endsWith('/mitra/payouts') &&
                        resp.request().method() === 'POST',
                    { timeout: 15_000 },
                ),
                page
                    .getByRole('button', { name: /Ajukan Pencairan/i })
                    .last()
                    .click(),
            ]);

            // Tetap di halaman create
            await expect(page).toHaveURL('/mitra/payouts/create');

            // === ERROR HANDLING LEVEL UI ===
            // Server ValidationException → flash/payout error → teks merah
            // Pesan dari PayoutService: "Anda sudah memiliki pengajuan
            // hari ini. Tunggu review admin."
            await expect(
                page.getByText(/Anda sudah memiliki pengajuan hari ini/i),
            ).toBeVisible({ timeout: 10_000 });
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Guard — Min Payout (via direct request)
    |--------------------------------------------------------------------------
    |
    | Server guard: `PayoutService::request` tolak jumlah < 100.000.
    | Test via direct request (untuk skip UI validation, karena
    | RupiahInput mungkin prepend / clamp ke 0).
    |
    | ⚠️ RupiahInput memformat on blur. Untuk test < 100rb via UI, kita
    | isi 50000 → server guard tolak.
    | --------------------------------------------------------------------------
    */

    test.describe.serial('Guard — Min Payout', () => {
        test('jumlah < Rp 100.000 → server guard tolak', async ({
            page,
            asMitra,
        }) => {
            await asMitra();
            await page.goto('/mitra/payouts/create');

            // Isi jumlah 50rb (< min 100rb)
            await page.locator('input[inputmode="numeric"]').first().fill(
                '50000',
            );
            await page.fill('input#bank', 'BRI');
            await page.fill('input#norek', '1111222233');
            await page.fill('input#nama', 'Budi Santoso');

            // Submit
            await Promise.all([
                page.waitForResponse(
                    (resp) =>
                        resp.url().endsWith('/mitra/payouts') &&
                        resp.request().method() === 'POST',
                    { timeout: 15_000 },
                ),
                page
                    .getByRole('button', { name: /Ajukan Pencairan/i })
                    .last()
                    .click(),
            ]);

            // Tetap di halaman create
            await expect(page).toHaveURL('/mitra/payouts/create');

            // Error dari server
            await expect(
                page.getByText(/Minimum pencairan/i),
            ).toBeVisible({ timeout: 10_000 });
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Compatibility — Unauthenticated
    |--------------------------------------------------------------------------
    */

    test.describe('Compatibility — Unauthenticated', () => {
        test('akses payouts index tanpa login → /login', async ({
            page,
            asGuest,
        }) => {
            await asGuest();
            await page.goto('/mitra/payouts');
            await expect(page).toHaveURL('/login');
        });

        test('akses payouts create tanpa login → /login', async ({
            page,
            asGuest,
        }) => {
            await asGuest();
            await page.goto('/mitra/payouts/create');
            await expect(page).toHaveURL('/login');
        });
    });
});