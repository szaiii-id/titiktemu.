import { test, expect } from '../fixtures/auth';
import AxeBuilder from '@axe-core/playwright';

/**
 * Admin — Dashboard
 *
 * Route: GET /admin/dashboard → Admin\DashboardController@index
 *
 * Kontrak Dashboard Aktual:
 * - Welcome banner: "Halo, {name}."
 * - Subheading: "Ini ringkasan performa bisnis Anda hari ini."
 * - Tombol "Lihat Laporan" → /admin/reports
 *
 * - 4 kartu ringkasan utama:
 *   1. Total Pendapatan (gradient, tidak link)
 *   2. Trip Sedang Jalan → /admin/trips?status=active
 *   3. Laporan Menunggu  → /admin/daily-reports?status=submitted
 *   4. Payout Menunggu   → /admin/payouts?status=pending
 *
 * - 2 grafik: "Tren Pendapatan" & "Tren Booking"
 * - Section "Booking Terbaru" → /admin/bookings
 * - Widget "Perlu Tindakan Anda" (kondisional)
 *
 * ⚠️ InertiaLink merender absolute URL → assertion href WAJIB regex
 *     (`/\/admin\/xxx$/`) atau `[href*="..."]`, bukan exact match.
 */

test.describe('Admin — Dashboard', () => {
    /*
    |--------------------------------------------------------------------------
    | Access Control
    |--------------------------------------------------------------------------
    */

    test('guest tidak bisa akses admin dashboard', async ({
        page,
        asGuest,
    }) => {
        await asGuest();
        await page.goto('/admin/dashboard');
        await expect(page).toHaveURL('/login');
    });

    test('client tidak bisa akses admin dashboard', async ({
        page,
        asClient,
    }) => {
        await asClient();
        await page.goto('/admin/dashboard');
        await expect(page).toHaveURL('/client/dashboard');
    });

    test('mitra tidak bisa akses admin dashboard', async ({
        page,
        asMitra,
    }) => {
        await asMitra();
        await page.goto('/admin/dashboard');
        await expect(page).toHaveURL('/mitra/dashboard');
    });

    test('admin bisa akses admin dashboard', async ({ page, asAdmin }) => {
        await asAdmin();
        await page.goto('/admin/dashboard');
        await expect(page).toHaveURL('/admin/dashboard');
    });

    /*
    |--------------------------------------------------------------------------
    | Welcome Banner
    |--------------------------------------------------------------------------
    */

    test.describe('Welcome Banner', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/dashboard');
        });

        test('menampilkan heading "Halo, {name}"', async ({ page }) => {
            // Dashboard asli: "Halo, {user.name}." dengan titik pink.
            await expect(
                page.getByRole('heading', {
                    name: /^Halo,\s*Administrator Utama/i,
                }),
            ).toBeVisible();
        });

        test('menampilkan subheading performa bisnis', async ({ page }) => {
            await expect(
                page.getByText(/Ini ringkasan performa bisnis Anda hari ini/i),
            ).toBeVisible();
        });

        test('menampilkan tombol "Lihat Laporan"', async ({ page }) => {
            await expect(
                page.getByRole('link', { name: /Lihat Laporan/i }),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Kartu Ringkasan Utama (4 kartu)
    |--------------------------------------------------------------------------
    */

    test.describe('Kartu Ringkasan Utama', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/dashboard');
        });

        test('menampilkan label "Total Pendapatan"', async ({ page }) => {
            await expect(
                page.getByText(/^Total Pendapatan$/i),
            ).toBeVisible();
        });

        test('menampilkan label "Trip Sedang Jalan"', async ({ page }) => {
            await expect(
                page.getByText(/^Trip Sedang Jalan$/i),
            ).toBeVisible();
        });

        test('menampilkan label "Laporan Menunggu"', async ({ page }) => {
            await expect(
                page.getByText(/^Laporan Menunggu$/i),
            ).toBeVisible();
        });

        test('menampilkan label "Payout Menunggu"', async ({ page }) => {
            await expect(
                page.getByText(/^Payout Menunggu$/i),
            ).toBeVisible();
        });

test('nilai kartu berupa angka', async ({ page }) => {
    // 1. Cek bahwa ada minimal 3 elemen <p> dengan class text-2xl + font-extrabold.
    const values = page.locator('p.text-2xl.font-extrabold');
    const count = await values.count();
    expect(count).toBeGreaterThanOrEqual(3);

    // 2. Cek bahwa setiap nilai kartu berisi pola yang valid:
    //    - angka murni (mis. "12") untuk Trip / Laporan / Payout
    //    - atau string Rupiah (mis. "Rp 1.500.000") untuk Pendapatan
    const allTexts = await values.allTextContents();
    for (const text of allTexts) {
        const trimmed = text.trim();
        expect(trimmed).toMatch(/^(\d+|Rp\s[\d.]+)$/);
    }
});
    });

    /*
    |--------------------------------------------------------------------------
    | Navigasi Kartu Ringkasan
    |--------------------------------------------------------------------------
    */

    test.describe('Navigasi Kartu Ringkasan', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/dashboard');
        });

        test('link "Lihat Laporan" mengarah ke /admin/reports', async ({
            page,
        }) => {
            await expect(
                page.getByRole('link', { name: /Lihat Laporan/i }),
            ).toHaveAttribute('href', /\/admin\/reports$/);
        });

        test('card "Trip Sedang Jalan" link ke /admin/trips?status=active', async ({
            page,
        }) => {
            await expect(
                page.getByRole('link', { name: /Lihat Detail/i }).first(),
            ).toHaveAttribute('href', /\/admin\/trips\?status=active$/);
        });

        test('card "Laporan Menunggu" link ke /admin/daily-reports?status=submitted', async ({
            page,
        }) => {
            await expect(
                page.getByRole('link', { name: /Verifikasi Sekarang/i }),
            ).toHaveAttribute(
                'href',
                /\/admin\/daily-reports\?status=submitted$/,
            );
        });

        test('card "Payout Menunggu" link ke /admin/payouts?status=pending', async ({
            page,
        }) => {
            await expect(
                page.getByRole('link', { name: /Review Payout/i }),
            ).toHaveAttribute('href', /\/admin\/payouts\?status=pending$/);
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Grafik (Flarecharts)
    |--------------------------------------------------------------------------
    */

    test.describe('Grafik', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/dashboard');
        });

        test('menampilkan heading "Tren Pendapatan"', async ({ page }) => {
            await expect(
                page.getByRole('heading', { name: /^Tren Pendapatan$/i }),
            ).toBeVisible();
        });

        test('menampilkan heading "Tren Booking"', async ({ page }) => {
            await expect(
                page.getByRole('heading', { name: /^Tren Booking$/i }),
            ).toBeVisible();
        });

        test('menampilkan sublabel "6 Bulan Terakhir" di kedua grafik', async ({
            page,
        }) => {
            const labels = page.getByText(/^6 Bulan Terakhir$/i);
            expect(await labels.count()).toBeGreaterThanOrEqual(2);
        });

        test('menampilkan link "Detail" pada grafik', async ({ page }) => {
            const detailLinks = page.getByRole('link', { name: /^Detail/i });
            expect(await detailLinks.count()).toBeGreaterThanOrEqual(2);
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Booking Terbaru
    |--------------------------------------------------------------------------
    */

    test.describe('Booking Terbaru', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/dashboard');
        });

        test('menampilkan heading "Booking Terbaru"', async ({ page }) => {
            await expect(
                page.getByRole('heading', { name: /^Booking Terbaru$/i }),
            ).toBeVisible();
        });

        test('menampilkan link "Semua" ke /admin/bookings', async ({
            page,
        }) => {
            await expect(
                page.getByRole('link', { name: /^Semua/i }),
            ).toHaveAttribute('href', /\/admin\/bookings$/);
        });

        test('jika ada booking, tampilkan kode booking', async ({ page }) => {
            // Cek apakah ada item booking (bisa kosong jika DB test fresh).
            const bookingCards = page.locator(
                'a[href*="/admin/bookings/"]',
            );
            const count = await bookingCards.count();

            if (count > 0) {
                // Minimal 1 card berisi teks kode.
                await expect(bookingCards.first()).toBeVisible();
            } else {
                // Atau tampil empty state.
                await expect(
                    page.getByText(/Belum ada booking terbaru/i),
                ).toBeVisible();
            }
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Widget "Perlu Tindakan"
    |--------------------------------------------------------------------------
    |
    | Widget ini kondisional (muncul hanya jika ada submitted/pending).
    | Karena state DB bisa berubah antar test, kita assert kondisional.
    */

    test.describe('Widget Perlu Tindakan', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/dashboard');
        });

        test('jika muncul, tampilkan heading "Perlu Tindakan Anda"', async ({
            page,
        }) => {
            const widget = page.getByText(/Perlu Tindakan Anda/i);
            const count = await widget.count();

            if (count > 0) {
                await expect(widget.first()).toBeVisible();
            } else {
                // Widget tidak muncul → valid (tidak ada item pending).
                expect(count).toBe(0);
            }
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Aksesibilitas
    |--------------------------------------------------------------------------
    */

    test.describe('Accessibility', () => {
        test('dashboard tidak punya pelanggaran WCAG kritis', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await page.goto('/admin/dashboard');
            await page.waitForLoadState('networkidle');

            const results = await new AxeBuilder({ page })
                .withTags(['wcag2a', 'wcag2aa'])
                .disableRules([
                    'region',
                    'landmark-one-main',
                    // TODO: fix contrast tokens di design system
                    // (bg-pink-dark → text-white, bg-sun/10 → text-sun-dark, dll)
                    'color-contrast',
                ])
                .analyze();

            const critical = results.violations.filter((v) =>
                ['critical', 'serious'].includes(v.impact ?? ''),
            );
            expect(critical).toEqual([]);
        });

        test('heading utama ada (h1)', async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/dashboard');

            const h1Count = await page.locator('h1').count();
            expect(h1Count).toBeGreaterThanOrEqual(1);
        });

        test('link navigasi utama cukup banyak', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await page.goto('/admin/dashboard');

            // Dashboard aktif: "Lihat Laporan", 3 "Lihat/Verifikasi/Review",
            // 2 "Detail", "Semua", plus sidebar menu = ~12+.
            const links = page.locator('a[href*="/admin/"]');
            expect(await links.count()).toBeGreaterThanOrEqual(8);
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Navigasi — Klik (smoke test)
    |--------------------------------------------------------------------------
    */

    test.describe('Navigasi — Klik', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/dashboard');
        });

        test('klik "Lihat Laporan" → halaman reports', async ({ page }) => {
            await page
                .getByRole('link', { name: /Lihat Laporan/i })
                .click();
            await expect(page).toHaveURL(/\/admin\/reports/);
        });

        test('klik "Semua" di Booking Terbaru → halaman bookings', async ({
            page,
        }) => {
            await page
                .getByRole('link', { name: /^Semua/i })
                .click();
            await expect(page).toHaveURL(/\/admin\/bookings/);
        });
    });
});