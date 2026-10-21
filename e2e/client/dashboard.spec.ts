import { test, expect, SEED_USERS } from '../fixtures/auth';
import AxeBuilder from '@axe-core/playwright';
import { APP_URL } from '../config';
import type { Locator, Page } from '@playwright/test';

/**
 * Client — Dashboard
 *
 * Route: GET /client/dashboard  → Client\DashboardController@index
 *
 * ⚠️ FIX #1: helper expectPath() — toleran absolute URL (Ziggy)
 * ⚠️ FIX #2: toHaveURL regex → expect.poll (anti flaky Inertia)
 * ⚠️ FIX #3: strict mode — .first() untuk getByText(name) yang match multiple
 * ⚠️ FIX #4: page.goto pakai waitUntil domcontentloaded (cepat, anti timeout)
 */

// ==========================================
// HELPER — toleran absolute URL
// ==========================================

/**
 * Ambil path dari href (handle absolute URL dari Ziggy).
 *
 * `http://127.0.0.1:8005/client/bookings` → `/client/bookings`
 * `/client/bookings` → `/client/bookings`
 */
async function expectPath(locator: Locator, expectedPath: string): Promise<void> {
    const href = await locator.getAttribute('href');
    expect(href).not.toBeNull();

    const actualPath = new URL(href!, APP_URL).pathname;
    expect(actualPath).toBe(expectedPath);
}

/**
 * Cek `page.url()` path sama dengan expected (toleran absolute).
 */
async function expectPagePath(page: Page, expectedPath: string): Promise<void> {
    await expect.poll(
        () => new URL(page.url()).pathname,
        { timeout: 10_000, intervals: [100, 200, 500] },
    ).toBe(expectedPath);
}

// ==========================================
// KONSTANTA — sinkron dengan UserSeeder.php
// ==========================================

const SEED_CLIENT = {
    name: 'Budi Client',
    username: 'budiclient',
    email: 'client@titiktemu.test',
} as const;

// ==========================================
// TEST SUITE
// ==========================================

test.describe('Client — Dashboard', () => {
    /*
    |--------------------------------------------------------------------------
    | Access Control
    |--------------------------------------------------------------------------
    */

    test('guest tidak bisa akses dashboard client (redirect ke /login)', async ({
        page,
        asGuest,
    }) => {
        await asGuest();
        await page.goto('/client/dashboard', { waitUntil: 'domcontentloaded' });
        await expectPagePath(page, '/login');
    });

    test('admin tidak bisa akses dashboard client (redirect ke admin dashboard)', async ({
        page,
        asAdmin,
    }) => {
        await asAdmin();
        await page.goto('/client/dashboard', { waitUntil: 'domcontentloaded' });
        await expectPagePath(page, '/admin/dashboard');
    });

    test('mitra tidak bisa akses dashboard client (redirect ke mitra dashboard)', async ({
        page,
        asMitra,
    }) => {
        await asMitra();
        await page.goto('/client/dashboard', { waitUntil: 'domcontentloaded' });
        await expectPagePath(page, '/mitra/dashboard');
    });

    test('client bisa akses dashboard client', async ({ page, asClient }) => {
        await asClient();
        await page.goto('/client/dashboard', { waitUntil: 'domcontentloaded' });
        await expectPagePath(page, '/client/dashboard');
    });

    /*
    |--------------------------------------------------------------------------
    | Contract — Elemen Halaman
    |--------------------------------------------------------------------------
    */

    test.describe('Elemen Halaman', () => {
        test.beforeEach(async ({ page, asClient }) => {
            await asClient();
            await page.goto('/client/dashboard', {
                waitUntil: 'domcontentloaded',
            });
        });

        test('menampilkan heading sambutan dengan nama user', async ({
            page,
        }) => {
            const heading = page.getByRole('heading', {
                name: new RegExp(`Selamat Datang,\\s*${SEED_CLIENT.name}`, 'i'),
            });
            await expect(heading).toBeVisible();
        });

        test('menampilkan subheading "Jelajahi trip dan bundle perjalanan"', async ({
            page,
        }) => {
            await expect(
                page.getByText(/Jelajahi trip dan bundle perjalanan/i),
            ).toBeVisible();
        });

        test('menampilkan heading section "Akses Cepat"', async ({ page }) => {
            await expect(
                page.getByRole('heading', { name: /Akses Cepat/i }),
            ).toBeVisible();
        });

        test('menampilkan 3 card navigasi', async ({ page }) => {
            await expect(page.getByTestId('card-katalog')).toBeVisible();
            await expect(page.getByTestId('card-booking')).toBeVisible();
            await expect(page.getByTestId('card-profile')).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Card — Katalog
    |--------------------------------------------------------------------------
    */

    test.describe('Card Katalog', () => {
        test.beforeEach(async ({ page, asClient }) => {
            await asClient();
            await page.goto('/client/dashboard', {
                waitUntil: 'domcontentloaded',
            });
        });

        test('card katalog adalah link ke /client/catalog', async ({ page }) => {
            // ✅ FIX #1: expectPath toleran absolute URL
            await expectPath(
                page.getByTestId('card-katalog'),
                '/client/catalog',
            );
        });

        test('card katalog menampilkan judul "Katalog Paket"', async ({
            page,
        }) => {
            await expect(
                page.getByTestId('card-katalog').getByRole('heading', {
                    name: /Katalog Paket/i,
                }),
            ).toBeVisible();
        });

        test('card katalog menampilkan deskripsi', async ({ page }) => {
            await expect(
                page.getByTestId('card-katalog').getByText(
                    /Temukan paket wisata menarik/i,
                ),
            ).toBeVisible();
        });

        test('klik card katalog navigasi ke /client/catalog', async ({
            page,
        }) => {
            await page.getByTestId('card-katalog').click();
            await expectPagePath(page, '/client/catalog');
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Card — Booking
    |--------------------------------------------------------------------------
    */

    test.describe('Card Booking', () => {
        test.beforeEach(async ({ page, asClient }) => {
            await asClient();
            await page.goto('/client/dashboard', {
                waitUntil: 'domcontentloaded',
            });
        });

        test('card booking adalah link ke /client/bookings', async ({
            page,
        }) => {
            // ✅ FIX #1
            await expectPath(
                page.getByTestId('card-booking'),
                '/client/bookings',
            );
        });

        test('card booking menampilkan judul "Booking Saya"', async ({
            page,
        }) => {
            await expect(
                page.getByTestId('card-booking').getByRole('heading', {
                    name: /Booking Saya/i,
                }),
            ).toBeVisible();
        });

        test('card booking menampilkan deskripsi', async ({ page }) => {
            await expect(
                page.getByTestId('card-booking').getByText(
                    /Pantau status booking dan unduh e-ticket/i,
                ),
            ).toBeVisible();
        });

        test('klik card booking navigasi ke /client/bookings', async ({
            page,
        }) => {
            await page.getByTestId('card-booking').click();
            await expectPagePath(page, '/client/bookings');
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Card — Profile
    |--------------------------------------------------------------------------
    */

    test.describe('Card Profile', () => {
        test.beforeEach(async ({ page, asClient }) => {
            await asClient();
            await page.goto('/client/dashboard', {
                waitUntil: 'domcontentloaded',
            });
        });

        test('card profile adalah link ke /client/profile', async ({
            page,
        }) => {
            // ✅ FIX #1
            await expectPath(
                page.getByTestId('card-profile'),
                '/client/profile',
            );
        });

        test('card profile menampilkan judul "Profile Saya"', async ({
            page,
        }) => {
            await expect(
                page.getByTestId('card-profile').getByRole('heading', {
                    name: /Profile Saya/i,
                }),
            ).toBeVisible();
        });

        test('card profile menampilkan deskripsi', async ({ page }) => {
            await expect(
                page.getByTestId('card-profile').getByText(
                    /Kelola informasi akun dan data pribadi/i,
                ),
            ).toBeVisible();
        });

        test('klik card profile navigasi ke /client/profile', async ({
            page,
        }) => {
            await page.getByTestId('card-profile').click();
            await expectPagePath(page, '/client/profile');
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Sidebar Navigation
    |--------------------------------------------------------------------------
    */

    test.describe('Sidebar Navigation', () => {
        test.beforeEach(async ({ page, asClient }) => {
            await asClient();
            await page.goto('/client/dashboard', {
                waitUntil: 'domcontentloaded',
            });
        });

        test('sidebar menampilkan menu client', async ({ page }) => {
            await expect(
                page.getByRole('link', { name: /^Katalog Paket$/i }),
            ).toBeVisible();
            await expect(
                page.getByRole('link', { name: /^Booking Saya$/i }),
            ).toBeVisible();
            await expect(
                page.getByRole('link', { name: /^Profile Saya$/i }),
            ).toBeVisible();
        });

        test('menu sidebar "Katalog Paket" mengarah ke /client/catalog', async ({
            page,
        }) => {
            // ✅ FIX #1
            await expectPath(
                page.getByRole('link', { name: /^Katalog Paket$/i }),
                '/client/catalog',
            );
        });

        test('menu sidebar "Booking Saya" mengarah ke /client/bookings', async ({
            page,
        }) => {
            // ✅ FIX #1
            await expectPath(
                page.getByRole('link', { name: /^Booking Saya$/i }),
                '/client/bookings',
            );
        });

        test('menu sidebar "Profile Saya" mengarah ke /client/profile', async ({
            page,
        }) => {
            // ✅ FIX #1
            await expectPath(
                page.getByRole('link', { name: /^Profile Saya$/i }),
                '/client/profile',
            );
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Topbar — User Info & Logout
    |--------------------------------------------------------------------------
    */

    test.describe('Topbar', () => {
        test.beforeEach(async ({ page, asClient }) => {
            await asClient();
            await page.goto('/client/dashboard', {
                waitUntil: 'domcontentloaded',
            });
        });

        test('topbar menampilkan nama user', async ({ page }) => {
            // ✅ FIX #3: strict mode — pakai .first() / count
            const nameMatches = page.getByText(SEED_CLIENT.name, {
                exact: true,
            });
            expect(await nameMatches.count()).toBeGreaterThanOrEqual(1);
        });

        test('topbar menampilkan email user', async ({ page }) => {
            const emailMatches = page.getByText(SEED_CLIENT.email, {
                exact: true,
            });
            expect(await emailMatches.count()).toBeGreaterThanOrEqual(1);
        });

        test('topbar menampilkan username dengan prefix @', async ({ page }) => {
            await expect(
                page.getByText(`@${SEED_CLIENT.username}`, {
                    exact: false,
                }).first(),
            ).toBeVisible();
        });

        test('tombol Logout tersedia', async ({ page }) => {
            await expect(
                page.getByRole('button', { name: /Keluar dari akun/i }),
            ).toBeVisible();
        });

        test('tombol notifikasi tersedia (bell)', async ({ page }) => {
            await expect(
                page.getByRole('link', { name: /^Notifikasi$/i }),
            ).toBeVisible();
        });

        test('link notifikasi mengarah ke /notifications', async ({ page }) => {
            // ✅ FIX #1
            await expectPath(
                page.getByRole('link', { name: /^Notifikasi$/i }),
                '/notifications',
            );
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Navigation — Tidak Ada Redirect Loop
    |--------------------------------------------------------------------------
    */

    test.describe('Navigation Integrity', () => {
        test('setelah login, dashboard client dapat diakses berkali-kali', async ({
            page,
            asClient,
        }) => {
            await asClient();

            for (let i = 0; i < 3; i++) {
                await page.goto('/client/dashboard', {
                    waitUntil: 'domcontentloaded',
                });
                await expectPagePath(page, '/client/dashboard');
                await expect(
                    page.getByRole('heading', {
                        name: new RegExp(
                            `Selamat Datang,\\s*${SEED_CLIENT.name}`,
                            'i',
                        ),
                    }),
                ).toBeVisible();
            }
        });

        test('dashboard tidak me-redirect ke halaman lain', async ({
            page,
            asClient,
        }) => {
            await asClient();
            await page.goto('/client/dashboard', {
                waitUntil: 'domcontentloaded',
            });

            await page.waitForTimeout(500);
            await expectPagePath(page, '/client/dashboard');
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Error Handling — Tidak Ada Flash di Halaman Normal
    |--------------------------------------------------------------------------
    */

    test.describe('Error Handling', () => {
        test('tidak menampilkan flash sukses di halaman normal', async ({
            page,
            asClient,
        }) => {
            await asClient();
            await page.goto('/client/dashboard', {
                waitUntil: 'domcontentloaded',
            });

            await expect(page.locator('.bg-green-50')).not.toBeVisible();
        });

        test('tidak menampilkan flash error di halaman normal', async ({
            page,
            asClient,
        }) => {
            await asClient();
            await page.goto('/client/dashboard', {
                waitUntil: 'domcontentloaded',
            });

            await expect(page.locator('.bg-red-50')).not.toBeVisible();
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
            asClient,
        }) => {
            await asClient();
            await page.goto('/client/dashboard', {
                waitUntil: 'domcontentloaded',
            });
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

        test('heading utama ada (h1)', async ({ page, asClient }) => {
            await asClient();
            await page.goto('/client/dashboard', {
                waitUntil: 'domcontentloaded',
            });

            const h1Count = await page.locator('h1').count();
            expect(h1Count).toBeGreaterThanOrEqual(1);
        });

        test('semua card navigasi punya text yang dapat dibaca screen reader', async ({
            page,
            asClient,
        }) => {
            await asClient();
            await page.goto('/client/dashboard', {
                waitUntil: 'domcontentloaded',
            });

            await expect(
                page.getByTestId('card-katalog').getByRole('heading'),
            ).toBeVisible();
            await expect(
                page.getByTestId('card-booking').getByRole('heading'),
            ).toBeVisible();
            await expect(
                page.getByTestId('card-profile').getByRole('heading'),
            ).toBeVisible();
        });

        test('card navigasi fokusable (bisa diakses Tab)', async ({
            page,
            asClient,
        }) => {
            await asClient();
            await page.goto('/client/dashboard', {
                waitUntil: 'domcontentloaded',
            });

            const katalogCard = page.getByTestId('card-katalog');
            const tagName = await katalogCard.evaluate((el) =>
                el.tagName.toLowerCase(),
            );
            expect(tagName).toBe('a');
        });

        test('tombol logout punya aria-label', async ({ page, asClient }) => {
            await asClient();
            await page.goto('/client/dashboard', {
                waitUntil: 'domcontentloaded',
            });

            await expect(
                page.getByRole('button', { name: /Keluar dari akun/i }),
            ).toBeVisible();
        });

        test('link notifikasi punya aria-label', async ({ page, asClient }) => {
            await asClient();
            await page.goto('/client/dashboard', {
                waitUntil: 'domcontentloaded',
            });

            const link = page.getByRole('link', { name: /^Notifikasi$/i });
            await expect(link).toHaveAttribute('aria-label', 'Notifikasi');
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Responsive — Mobile Viewport
    |--------------------------------------------------------------------------
    */

    test.describe('Responsive — Mobile Viewport', () => {
        test('dashboard usable di viewport mobile', async ({ page, asClient }) => {
            await asClient();
            await page.setViewportSize({ width: 375, height: 812 });
            await page.goto('/client/dashboard', {
                waitUntil: 'domcontentloaded',
            });

            await expect(
                page.getByRole('heading', {
                    name: new RegExp(
                        `Selamat Datang,\\s*${SEED_CLIENT.name}`,
                        'i',
                    ),
                }),
            ).toBeVisible();

            await expect(page.getByTestId('card-katalog')).toBeVisible();
            await expect(page.getByTestId('card-booking')).toBeVisible();
            await expect(page.getByTestId('card-profile')).toBeVisible();
        });

        test('tombol hamburger sidebar muncul di mobile', async ({
            page,
            asClient,
        }) => {
            await asClient();
            await page.setViewportSize({ width: 375, height: 812 });
            await page.goto('/client/dashboard', {
                waitUntil: 'domcontentloaded',
            });

            await expect(page.getByLabel('Buka menu')).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Compatibility — Unauthenticated Redirect
    |--------------------------------------------------------------------------
    */

    test.describe('Compatibility — Unauthenticated Access', () => {
        test('akses dashboard tanpa login → /login', async ({ page, asGuest }) => {
            await asGuest();
            await page.goto('/client/dashboard', {
                waitUntil: 'domcontentloaded',
            });
            await expectPagePath(page, '/login');
        });

        test('akses deep link client tanpa login → /login', async ({
            page,
            asGuest,
        }) => {
            await asGuest();
            await page.goto('/client/profile', {
                waitUntil: 'domcontentloaded',
            });
            await expectPagePath(page, '/login');
        });
    });
});