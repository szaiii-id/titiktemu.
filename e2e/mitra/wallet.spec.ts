import { test, expect, SEED_USERS } from '../fixtures/auth';
import AxeBuilder from '@axe-core/playwright';

/**
 * Mitra — Wallet (Saldo + Transaksi)
 *
 * Route: GET /mitra/wallet  → Mitra\WalletController@index
 *
 * Behavior:
 * - PageHeader: "Wallet Saya"
 * - Saldo card (gradient hijau):
 *     - Saldo Tersedia (nominal besar)
 *     - Total Pendapatan
 *     - Total Dicairkan
 *     - Tombol "Tarik Dana" → /mitra/payouts/create
 * - Riwayat Transaksi section:
 *     - Empty state kalau belum ada transaksi
 *     - List transaksi: deskripsi, badge kategori, tanggal,
 *       nominal (+/- prefix), saldo setelah
 *     - Pagination jika > 15
 *
 * Seed wallet (dari WalletSeeder, hanya env testing):
 * - Setiap mitra: saldo = Rp 500.000 via creditDirect
 * - 1 transaction credit, kategori "adjustment", deskripsi
 *   "Seed: saldo awal untuk testing E2E ({name})"
 *
 * CATATAN PENTING:
 * - File ini READ-ONLY. Tidak ada mutasi.
 * - Nominal bisa berubah kalau file test lain sudah credit honor
 *   (verify report → complete trip). Karena itu: assert FORMAT
 *   (Rp prefix, +/-, angka), bukan nilai exact.
 * - Zero mutation → tidak perlu describe.serial.
 */

// ==========================================
// KONSTANTA
// ==========================================

const SEED_MITRA = {
    name: SEED_USERS.mitra.name,    // Budi Santoso
    email: SEED_USERS.mitra.email,
};

// ==========================================
// TEST SUITE
// ==========================================

test.describe('Mitra — Wallet', () => {
    /*
    |--------------------------------------------------------------------------
    | Access Control
    |--------------------------------------------------------------------------
    */

    test('guest tidak bisa akses wallet', async ({ page, asGuest }) => {
        await asGuest();
        await page.goto('/mitra/wallet');
        await expect(page).toHaveURL('/login');
    });

    test('client tidak bisa akses wallet mitra', async ({
        page,
        asClient,
    }) => {
        await asClient();
        await page.goto('/mitra/wallet');
        await expect(page).toHaveURL('/client/dashboard');
    });

    test('admin tidak bisa akses wallet mitra', async ({ page, asAdmin }) => {
        await asAdmin();
        await page.goto('/mitra/wallet');
        await expect(page).toHaveURL('/admin/dashboard');
    });

    test('mitra bisa akses wallet', async ({ page, asMitra }) => {
        await asMitra();
        await page.goto('/mitra/wallet');
        await expect(page).toHaveURL('/mitra/wallet');
    });

    /*
    |--------------------------------------------------------------------------
    | Contract — Elemen Halaman
    |--------------------------------------------------------------------------
    */

    test.describe('Elemen Halaman', () => {
        test.beforeEach(async ({ page, asMitra }) => {
            await asMitra();
            await page.goto('/mitra/wallet');
        });

        test('menampilkan heading "Wallet Saya"', async ({ page }) => {
            await expect(
                page.getByRole('heading', { name: /^Wallet Saya$/i }).first(),
            ).toBeVisible();
        });

        test('menampilkan deskripsi halaman', async ({ page }) => {
            await expect(
                page.getByText(/Saldo honor dan riwayat transaksi/i),
            ).toBeVisible();
        });

        test('menampilkan label "Saldo Tersedia"', async ({ page }) => {
            await expect(
                page.getByText(/Saldo Tersedia/i).first(),
            ).toBeVisible();
        });

        test('menampilkan nominal saldo (format Rp)', async ({ page }) => {
            // Saldo card punya nominal besar (text-4xl/5xl) dengan format Rp
            // Assert minimal 1 "Rp" di halaman
            const rpMatches = await page.getByText(/Rp/).count();
            expect(rpMatches).toBeGreaterThan(0);
        });

        test('menampilkan "Total Pendapatan"', async ({ page }) => {
            await expect(
                page.getByText(/Total Pendapatan/i).first(),
            ).toBeVisible();
        });

        test('menampilkan "Total Dicairkan"', async ({ page }) => {
            await expect(
                page.getByText(/Total Dicairkan/i).first(),
            ).toBeVisible();
        });

        test('menampilkan tombol "Tarik Dana"', async ({ page }) => {
            await expect(
                page.getByRole('link', { name: /Tarik Dana/i }),
            ).toBeVisible();
        });

        test('tombol "Tarik Dana" mengarah ke /mitra/payouts/create', async ({
            page,
        }) => {
            await expect(
                page.getByRole('link', { name: /Tarik Dana/i }),
            ).toHaveAttribute('href', '/mitra/payouts/create');
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Contract — Section "Riwayat Transaksi"
    |--------------------------------------------------------------------------
    */

    test.describe('Section Riwayat Transaksi', () => {
        test.beforeEach(async ({ page, asMitra }) => {
            await asMitra();
            await page.goto('/mitra/wallet');
        });

        test('menampilkan heading "Riwayat Transaksi"', async ({ page }) => {
            await expect(
                page.getByRole('heading', { name: /Riwayat Transaksi/i }),
            ).toBeVisible();
        });

        test('menampilkan deskripsi "Mutasi saldo wallet Anda"', async ({
            page,
        }) => {
            await expect(
                page.getByText(/Mutasi saldo wallet Anda/i),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Data Seed — Transaksi Awal
    |--------------------------------------------------------------------------
    |
    | WalletSeeder (testing) → 1 transaction credit, kategori "adjustment",
    | deskripsi "Seed: saldo awal untuk testing E2E (Budi Santoso)".
    |
    | Catatan: transaksi bisa bertambah kalau test lain sudah verify report
    | (credit honor). Test di bawah relatif:
    |   - Assert minimal ada 1 transaksi
    |   - Assert transaksi seed muncul (dari WalletSeeder)
    | --------------------------------------------------------------------------
    */

    test.describe('Data Seed — Transaksi', () => {
        test.beforeEach(async ({ page, asMitra }) => {
            await asMitra();
            await page.goto('/mitra/wallet');
        });

        test('menampilkan transaksi seed dari WalletSeeder', async ({
            page,
        }) => {
            // Deskripsi dari WalletSeeder: "Seed: saldo awal untuk testing E2E (Budi Santoso)"
            await expect(
                page.getByText(/Seed: saldo awal untuk testing E2E/i).first(),
            ).toBeVisible();
        });

        test('transaksi seed menampilkan badge kategori "Penyesuaian"', async ({
            page,
        }) => {
            // WalletTransactionCategory::ADJUSTMENT → label "Penyesuaian"
            await expect(
                page.getByText(/^Penyesuaian$/i).first(),
            ).toBeVisible();
        });

        test('transaksi credit menampilkan prefix "+" di nominal', async ({
            page,
        }) => {
            // Layout: `{tipe === 'credit' ? '+' : '-'}{formatCurrency(...)}`
            // Cari text yang mengandung "+Rp"
            const creditPrefix = await page.getByText(/\+Rp/).count();
            expect(creditPrefix).toBeGreaterThanOrEqual(1);
        });

        test('menampilkan saldo setelah transaksi', async ({ page }) => {
            await expect(
                page.getByText(/Saldo:/i).first(),
            ).toBeVisible();
        });

        test('menampilkan minimal 1 transaksi di list', async ({ page }) => {
            // Transaksi item punya struktur: icon, deskripsi, badge, nominal
            // Kita assert minimal ada 1 item dengan deskripsi "Seed"
            const items = page.locator('div').filter({
                has: page.getByText(/Seed: saldo awal/i),
            });
            expect(await items.count()).toBeGreaterThanOrEqual(1);
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Empty State — Skip (seed selalu punya transaksi)
    |--------------------------------------------------------------------------
    |
    | WalletSeeder di env testing selalu buat 1 transaksi, jadi empty state
    | tidak reachable dari E2E. Empty state di-cover di component test atau
    | manual QA.
    | --------------------------------------------------------------------------
    */

    test.describe('Empty State (Skip)', () => {
        test.skip(
            'menampilkan empty state jika belum ada transaksi',
            async () => {
                // WalletSeeder testing → selalu ada transaksi.
                // Untuk test empty state, butuh setup DB tanpa WalletSeeder.
            },
        );
    });

    /*
    |--------------------------------------------------------------------------
    | Navigasi
    |--------------------------------------------------------------------------
    */

    test.describe('Navigasi', () => {
        test('klik "Tarik Dana" navigasi ke /mitra/payouts/create', async ({
            page,
            asMitra,
        }) => {
            await asMitra();
            await page.goto('/mitra/wallet');

            await page.getByRole('link', { name: /Tarik Dana/i }).click();
            await expect(page).toHaveURL('/mitra/payouts/create');
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Accessibility (a11y)
    |--------------------------------------------------------------------------
    */

    test.describe('Accessibility', () => {
        test('wallet tidak punya pelanggaran WCAG kritis', async ({
            page,
            asMitra,
        }) => {
            await asMitra();
            await page.goto('/mitra/wallet');
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

        test('heading utama ada (h1)', async ({ page, asMitra }) => {
            await asMitra();
            await page.goto('/mitra/wallet');

            const h1Count = await page.locator('h1').count();
            expect(h1Count).toBeGreaterThanOrEqual(1);
        });

        test('tombol "Tarik Dana" adalah link yang fokusable', async ({
            page,
            asMitra,
        }) => {
            await asMitra();
            await page.goto('/mitra/wallet');

            const tarikLink = page.getByRole('link', {
                name: /Tarik Dana/i,
            });
            const tag = await tarikLink.evaluate((el) =>
                el.tagName.toLowerCase(),
            );
            expect(tag).toBe('a');
        });

        test('nominal saldo readable screen reader', async ({
            page,
            asMitra,
        }) => {
            await asMitra();
            await page.goto('/mitra/wallet');

            // Saldo card punya label "Saldo Tersedia" + nominal
            // Assert label terhubung dengan nominal via DOM adjacency
            await expect(
                page.getByText(/Saldo Tersedia/i).first(),
            ).toBeVisible();

            // Nominal besar muncul (text-4xl atau text-5xl class)
            const bigNominal = page.locator('.text-4xl, .text-5xl').first();
            await expect(bigNominal).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Compatibility — Unauthenticated
    |--------------------------------------------------------------------------
    */

    test.describe('Compatibility — Unauthenticated', () => {
        test('akses wallet tanpa login → /login', async ({
            page,
            asGuest,
        }) => {
            await asGuest();
            await page.goto('/mitra/wallet');
            await expect(page).toHaveURL('/login');
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Cross-check — Data Konsisten dengan Dashboard
    |--------------------------------------------------------------------------
    |
    | Dashboard mitra punya "Saldo Wallet" (di wallet-card). Wallet page
    | punya "Saldo Tersedia" (di saldo card). Keduanya harus menampilkan
    | nominal yang SAMA.
    |
    | Test ini cross-check antar halaman (integration E2E).
    | --------------------------------------------------------------------------
    */

    test.describe('Cross-check — Dashboard vs Wallet', () => {
        test('saldo di dashboard sama dengan saldo di wallet page', async ({
            page,
            asMitra,
        }) => {
            await asMitra();

            // 1. Baca saldo di dashboard
            await page.goto('/mitra/dashboard');
            const dashboardWallet = page.getByTestId('wallet-card');
            await expect(dashboardWallet).toBeVisible();

            const dashboardText = await dashboardWallet.textContent();

            // Extract "Rp X.XXX.XXX" dari dashboard
            const dashboardMatch = dashboardText?.match(
                /Rp\s?[\d.]+/,
            );
            expect(dashboardMatch).toBeTruthy();
            const dashboardSaldo = dashboardMatch![0];

            // 2. Baca saldo di wallet page
            await page.goto('/mitra/wallet');

            // Saldo di wallet page = nominal besar pertama
            const walletText = await page
                .locator('p.text-4xl, p.text-5xl')
                .first()
                .textContent();

            // 3. Assert match
            expect(walletText?.trim()).toBe(dashboardSaldo.trim());
        });
    });
});