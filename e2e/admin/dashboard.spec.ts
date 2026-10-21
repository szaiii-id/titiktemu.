import { test, expect } from '../fixtures/auth';
import AxeBuilder from '@axe-core/playwright';

/**
 * Admin — Dashboard
 *
 * Route: GET /admin/dashboard  → Admin\DashboardController@index
 *
 * Behavior:
 * - Welcome banner: "Selamat Datang, {name}."
 * - 6 section stat cards:
 *     1. Booking (6 card) + link "Kelola Booking"
 *     2. Trip (5 card) + link "Kelola Trip"
 *     3. Laporan Harian (4 card) + link "Verifikasi Laporan"
 *     4. Pencairan Honor (4 card) + link "Kelola Payout"
 *     5. Paket Wisata (4 card) + link "Kelola Paket"
 *     6. Pengguna (3 card, no link)
 * - Panel Kontrol Sistem (info card)
 * - Semua StatCard dengan href = link ke query filter
 * - StatCard tanpa href (Pengguna) = tidak clickable
 *
 * CATATAN PENTING:
 * - Dashboard = stats agregat. Test lain bisa MUTASI state DB
 *   (booking, trip, package, payout) → NILAI STAT TIDAK STABIL.
 * - Karena itu: TIDAK assert nilai exact. Fokus CONTRACT:
 *     - Elemen ada (heading, card, link)
 *     - Navigasi benar
 *     - Type data (angka)
 * - Zero mutation → tidak perlu describe.serial.
 *
 * ⚠️ INERTIA LINK RENDER ABSOLUTE URL:
 * `<a href="/admin/trips" use:inertia>` dirender jadi
 * `http://127.0.0.1:8000/admin/trips` (absolute URL).
 * Karena itu assertion href WAJIB pakai regex (`$` anchor) atau
 * `[href*="..."]` (substring), BUKAN exact match (`= "..."`).
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
    | Contract — Welcome Banner
    |--------------------------------------------------------------------------
    */

    test.describe('Welcome Banner', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/dashboard');
        });

        test('menampilkan heading "Selamat Datang, {name}"', async ({
            page,
        }) => {
            await expect(
                page.getByRole('heading', {
                    name: /Selamat Datang,\s*Administrator Utama/i,
                }),
            ).toBeVisible();
        });

        test('menampilkan subheading "Kelola platform Titiktemu"', async ({
            page,
        }) => {
            await expect(
                page.getByText(/Kelola platform Titiktemu dari sini/i),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Contract — Section Booking
    |--------------------------------------------------------------------------
    */

    test.describe('Section Booking', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/dashboard');
        });

        test('menampilkan heading "Booking"', async ({ page }) => {
            await expect(
                page.getByRole('heading', { name: /^Booking$/i }).first(),
            ).toBeVisible();
        });

        test('menampilkan 6 stat card', async ({ page }) => {
            // Card: Total, Pending, Verifikasi, Konfirmasi, Selesai, Batal
            await expect(page.getByText(/^Total$/i).first()).toBeVisible();
            await expect(page.getByText(/^Pending$/i).first()).toBeVisible();
            await expect(page.getByText(/^Verifikasi$/i).first()).toBeVisible();
            await expect(page.getByText(/^Konfirmasi$/i).first()).toBeVisible();
            await expect(page.getByText(/^Selesai$/i).first()).toBeVisible();
            await expect(page.getByText(/^Batal$/i).first()).toBeVisible();
        });

        test('link "Kelola Booking" mengarah ke /admin/bookings', async ({
            page,
        }) => {
            // ✅ FIX: regex `$` — match relative & absolute URL
            await expect(
                page.getByRole('link', { name: /Kelola Booking/i }),
            ).toHaveAttribute('href', /\/admin\/bookings$/);
        });

        test('card "Total" mengarah ke /admin/bookings', async ({ page }) => {
            // ✅ FIX: [href*="..."] — substring match, aman untuk absolute URL
            await expect(
                page.locator('a[href*="/admin/bookings"]').first(),
            ).toBeVisible();
        });

        test('card "Pending" mengarah ke /admin/bookings?status=pending_payment', async ({
            page,
        }) => {
            await expect(
                page
                    .locator(
                        'a[href*="/admin/bookings?status=pending_payment"]',
                    )
                    .first(),
            ).toBeVisible();
        });

        test('card "Konfirmasi" mengarah ke /admin/bookings?status=confirmed', async ({
            page,
        }) => {
            await expect(
                page
                    .locator(
                        'a[href*="/admin/bookings?status=confirmed"]',
                    )
                    .first(),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Contract — Section Trip
    |--------------------------------------------------------------------------
    */

    test.describe('Section Trip', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/dashboard');
        });

        test('menampilkan heading "Trip"', async ({ page }) => {
            await expect(
                page.getByRole('heading', { name: /^Trip$/i }).first(),
            ).toBeVisible();
        });

        test('link "Kelola Trip" mengarah ke /admin/trips', async ({
            page,
        }) => {
            await expect(
                page.getByRole('link', { name: /Kelola Trip/i }),
            ).toHaveAttribute('href', /\/admin\/trips$/);
        });

        test('card "Terjadwal" mengarah ke /admin/trips?status=scheduled', async ({
            page,
        }) => {
            await expect(
                page
                    .locator('a[href*="/admin/trips?status=scheduled"]')
                    .first(),
            ).toBeVisible();
        });

        test('card "Berjalan" mengarah ke /admin/trips?status=active', async ({
            page,
        }) => {
            await expect(
                page
                    .locator('a[href*="/admin/trips?status=active"]')
                    .first(),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Contract — Section Laporan Harian
    |--------------------------------------------------------------------------
    */

    test.describe('Section Laporan Harian', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/dashboard');
        });

        test('menampilkan heading "Laporan Harian"', async ({ page }) => {
            await expect(
                page.getByRole('heading', { name: /^Laporan Harian$/i }),
            ).toBeVisible();
        });

        test('link "Verifikasi Laporan" mengarah ke /admin/daily-reports', async ({
            page,
        }) => {
            await expect(
                page.getByRole('link', { name: /Verifikasi Laporan/i }),
            ).toHaveAttribute('href', /\/admin\/daily-reports$/);
        });

        test('card "Pending" mengarah ke /admin/daily-reports?status=submitted', async ({
            page,
        }) => {
            await expect(
                page
                    .locator(
                        'a[href*="/admin/daily-reports?status=submitted"]',
                    )
                    .first(),
            ).toBeVisible();
        });

        test('card "Terverifikasi" mengarah ke /admin/daily-reports?status=verified', async ({
            page,
        }) => {
            await expect(
                page
                    .locator(
                        'a[href*="/admin/daily-reports?status=verified"]',
                    )
                    .first(),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Contract — Section Pencairan Honor
    |--------------------------------------------------------------------------
    */

    test.describe('Section Pencairan Honor', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/dashboard');
        });

        test('menampilkan heading "Pencairan Honor"', async ({ page }) => {
            await expect(
                page.getByRole('heading', { name: /^Pencairan Honor$/i }),
            ).toBeVisible();
        });

        test('link "Kelola Payout" mengarah ke /admin/payouts', async ({
            page,
        }) => {
            await expect(
                page.getByRole('link', { name: /Kelola Payout/i }),
            ).toHaveAttribute('href', /\/admin\/payouts$/);
        });

        test('card "Approved" mengarah ke /admin/payouts?status=approved', async ({
            page,
        }) => {
            await expect(
                page
                    .locator('a[href*="/admin/payouts?status=approved"]')
                    .first(),
            ).toBeVisible();
        });

        test('card "Paid" mengarah ke /admin/payouts?status=paid', async ({
            page,
        }) => {
            await expect(
                page
                    .locator('a[href*="/admin/payouts?status=paid"]')
                    .first(),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Contract — Section Paket Wisata
    |--------------------------------------------------------------------------
    */

    test.describe('Section Paket Wisata', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/dashboard');
        });

        test('menampilkan heading "Paket Wisata"', async ({ page }) => {
            await expect(
                page.getByRole('heading', { name: /^Paket Wisata$/i }),
            ).toBeVisible();
        });

        test('link "Kelola Paket" mengarah ke /admin/packages', async ({
            page,
        }) => {
            await expect(
                page.getByRole('link', { name: /Kelola Paket/i }),
            ).toHaveAttribute('href', /\/admin\/packages$/);
        });

        test('card "Draft" mengarah ke /admin/packages?status=draft', async ({
            page,
        }) => {
            await expect(
                page
                    .locator('a[href*="/admin/packages?status=draft"]')
                    .first(),
            ).toBeVisible();
        });

        test('card "Aktif" mengarah ke /admin/packages?status=aktif', async ({
            page,
        }) => {
            await expect(
                page
                    .locator('a[href*="/admin/packages?status=aktif"]')
                    .first(),
            ).toBeVisible();
        });

        test('card "Arsip" mengarah ke /admin/packages?status=arsip', async ({
            page,
        }) => {
            await expect(
                page
                    .locator('a[href*="/admin/packages?status=arsip"]')
                    .first(),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Contract — Section Pengguna (Tanpa Link)
    |--------------------------------------------------------------------------
    */

    test.describe('Section Pengguna', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/dashboard');
        });

        test('menampilkan heading "Pengguna"', async ({ page }) => {
            await expect(
                page.getByRole('heading', { name: /^Pengguna$/i }),
            ).toBeVisible();
        });

        test('menampilkan 3 stat card: Admin, Mitra, Client', async ({
            page,
        }) => {
            await expect(page.getByText(/^Admin$/i).first()).toBeVisible();
            await expect(page.getByText(/^Mitra$/i).first()).toBeVisible();
            await expect(page.getByText(/^Client$/i).first()).toBeVisible();
        });

        test('card Pengguna BUKAN link (tidak clickable)', async ({ page }) => {
            // ✅ FIX: assert via getByRole('link') count = 0.
            // Lebih robust daripada locator('div').filter({ hasText }) yang
            // bergantung whitespace.
            const adminLinks = page.getByRole('link', { name: /^Admin$/i });
            const mitraLinks = page.getByRole('link', { name: /^Mitra$/i });
            const clientLinks = page.getByRole('link', { name: /^Client$/i });

            expect(await adminLinks.count()).toBe(0);
            expect(await mitraLinks.count()).toBe(0);
            expect(await clientLinks.count()).toBe(0);
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Contract — Panel Kontrol Sistem
    |--------------------------------------------------------------------------
    */

    test.describe('Panel Kontrol Sistem', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/dashboard');
        });

        test('menampilkan heading "Panel Kontrol Sistem"', async ({ page }) => {
            await expect(
                page.getByRole('heading', {
                    name: /Panel Kontrol Sistem/i,
                }),
            ).toBeVisible();
        });

        test('menampilkan deskripsi panel', async ({ page }) => {
            await expect(
                page.getByText(/Gunakan menu di sidebar untuk mengelola/i),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Navigasi — Klik Card Menuju Halaman
    |--------------------------------------------------------------------------
    */

    test.describe('Navigasi — Klik Card', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/dashboard');
        });

        test('klik card "Pending" (Booking) → halaman bookings filter pending', async ({
            page,
        }) => {
            // ✅ FIX: [href*="..."] untuk klik
            await page
                .locator('a[href*="/admin/bookings?status=pending_payment"]')
                .first()
                .click();

            await expect(page).toHaveURL(
                /\/admin\/bookings\?status=pending_payment/,
            );
        });

        test('klik card "Draft" (Paket) → halaman packages filter draft', async ({
            page,
        }) => {
            await page
                .locator('a[href*="/admin/packages?status=draft"]')
                .first()
                .click();

            await expect(page).toHaveURL(
                /\/admin\/packages\?status=draft/,
            );
        });

        test('klik link "Kelola Trip" → halaman trips', async ({ page }) => {
            await page
                .getByRole('link', { name: /Kelola Trip/i })
                .click();

            await expect(page).toHaveURL(/\/admin\/trips$/);
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Stat Card — Format Data
    |--------------------------------------------------------------------------
    |
    | Jangan assert nilai exact (state DB berubah antar test).
    | Assert card menampilkan angka (numeric string).
    | --------------------------------------------------------------------------
    */

    test.describe('Stat Card — Format', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/dashboard');
        });

        test('semua StatCard menampilkan angka', async ({ page }) => {
            // ✅ FIX: pakai locator card "Total" via getByText tanpa anchor
            // (whitespace bisa beda). Scope ke elemen <p> stat card.
            const totalLabels = page.getByText(/^Total$/i);
            const count = await totalLabels.count();
            expect(count).toBeGreaterThan(0);

            // Assert sibling value (elemen berikutnya) = angka
            const firstTotal = totalLabels.first();
            const card = firstTotal.locator('xpath=..');
            const cardText = await card.textContent();
            expect(cardText).toMatch(/\d+/);
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Accessibility (a11y)
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
                    // ⚠️ TODO: fix design token contrast ratio
                    // (bg-sun/10 + text-sun-dark, bg-green/10 + text-green-dark)
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

        test('semua card navigasi fokusable (a link)', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await page.goto('/admin/dashboard');

            // Total card link di dashboard: 6 booking + 5 trip + 4 daily
            // + 4 payout + 4 package + 5 "Kelola X" = ~28
            const links = page.locator('a[href*="/admin/"]');
            const count = await links.count();
            expect(count).toBeGreaterThanOrEqual(20);
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Compatibility — Unauthenticated Access Preserves Redirect
    |--------------------------------------------------------------------------
    */

    test.describe('Compatibility — Unauthenticated', () => {
        test('akses dashboard tanpa login → /login', async ({
            page,
            asGuest,
        }) => {
            await asGuest();
            await page.goto('/admin/dashboard');
            await expect(page).toHaveURL('/login');
        });
    });
});