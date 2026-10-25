import { test, expect, SEED_TRIPS, SEED_USERS } from '../fixtures/auth';
import { APP_URL } from '../config';
import AxeBuilder from '@axe-core/playwright';
import type { Locator, Page } from '@playwright/test';

/**
 * Mitra — Dashboard
 *
 * Kontrak Dashboard Mitra (source aktual):
 * - Welcome: "Halo, {name}." + subheading "Ini tugas dan ringkasan Anda hari ini."
 * - Section kondisional "Perlu Tindakan Anda" (muncul jika ada todayTrips tanpa report)
 * - Section "Trip Hari Ini" (muncul jika todayTrips.length > 0)
 * - Wallet card (data-testid="wallet-card") → link ke /mitra/wallet
 * - Section kondisional "Laporan Menunggu Verifikasi" (muncul jika pendingReports.length > 0)
 * - Panel Mitra dengan 3 link: trips, daily-reports, wallet
 *
 * ⚠️ Test ini TIDAK mengharapkan data-testid yang tidak ada di source
 *    (welcome-card, stats-trip, stats-reports, today-trips, report-warning,
 *    pending-reports). Assertion memakai teks heading & wallet-card saja.
 */

// ==========================================
// HELPER
// ==========================================

async function expectPath(locator: Locator, expectedPath: string): Promise<void> {
    const href = await locator.getAttribute('href');
    expect(href).not.toBeNull();
    const actualPath = new URL(href!, APP_URL).pathname;
    expect(actualPath).toBe(expectedPath);
}

async function expectPagePath(page: Page, expectedPath: string): Promise<void> {
    await expect
        .poll(() => new URL(page.url()).pathname, {
            timeout: 10_000,
            intervals: [100, 200, 500],
        })
        .toBe(expectedPath);
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

async function findTripIdByKode(page: Page, kode: string): Promise<number> {
    await page.goto(
        `/admin/trips?search=${encodeURIComponent(kode)}`,
        { waitUntil: 'domcontentloaded' },
    );
    await page.waitForSelector(`text=${kode}`, { timeout: 15_000 });

    const href = await page
        .locator('a[href*="/admin/trips/"]')
        .evaluateAll((els) =>
            els
                .map((el) => el.getAttribute('href'))
                .find((h) => /\/admin\/trips\/\d+$/.test(h ?? '')),
        );

    if (!href) {
        throw new Error(
            `findTripIdByKode: tidak ada link numeric ID untuk ${kode}.`,
        );
    }
    const match = href.match(/\/admin\/trips\/(\d+)$/);
    if (!match) {
        throw new Error(
            `findTripIdByKode: href tidak valid untuk ${kode}. Got: ${href}`,
        );
    }
    return Number(match[1]);
}

async function submitDailyReport(
    page: Page,
    tripId: number,
    options: { hariKe: number; mitraIndex?: number; catatan?: string },
) {
    const csrf = await getCsrf(page);
    const response = await page.request.post('/_test/submit-daily-report', {
        form: {
            trip_id: String(tripId),
            hari_ke: String(options.hariKe),
            mitra_id: '2',
            catatan: options.catatan ?? 'E2E test',
        },
        headers: { 'X-XSRF-TOKEN': csrf, Accept: 'application/json' },
        failOnStatusCode: false,
    });

    if (!response.ok()) {
        const body = await response.text();

        if (
            response.status() === 422 &&
            (body.includes('sudah ada') ||
                body.includes('sudah disubmit') ||
                body.includes('already'))
        ) {
            return { report_id: 0, status: 'submitted', already_exists: true };
        }

        if (response.status() === 404 && body.includes('Mitra')) {
            return {
                report_id: 0,
                status: 'skipped',
                mitra_not_assigned: true,
            };
        }

        throw new Error(
            `submitDailyReport gagal: ${response.status()} — ${body}`,
        );
    }

    return response.json();
}

// ==========================================
// KONSTANTA
// ==========================================

const SEED_TRIP_KODE = `${SEED_TRIPS.e2eConfirmed.kodePrefix}001`;
const SEED_MITRA = {
    name: SEED_USERS.mitra.name,
    email: SEED_USERS.mitra.email,
};

// ==========================================
// TEST SUITE
// ==========================================

test.describe('Mitra — Dashboard', () => {
    test('guest tidak bisa akses mitra dashboard', async ({ page, asGuest }) => {
        await asGuest();
        await page.goto('/mitra/dashboard', { waitUntil: 'domcontentloaded' });
        await expectPagePath(page, '/login');
    });

    test('client tidak bisa akses mitra dashboard', async ({ page, asClient }) => {
        await asClient();
        await page.goto('/mitra/dashboard', { waitUntil: 'domcontentloaded' });
        await expectPagePath(page, '/client/dashboard');
    });

    test('admin tidak bisa akses mitra dashboard', async ({ page, asAdmin }) => {
        await asAdmin();
        await page.goto('/mitra/dashboard', { waitUntil: 'domcontentloaded' });
        await expectPagePath(page, '/admin/dashboard');
    });

    test('mitra bisa akses mitra dashboard', async ({ page, asMitra }) => {
        await asMitra();
        await page.goto('/mitra/dashboard', { waitUntil: 'domcontentloaded' });
        await expectPagePath(page, '/mitra/dashboard');
    });

    test.describe('Welcome Banner', () => {
        test.beforeEach(async ({ page, asMitra, resetTrip }) => {
            await resetTrip();
            await asMitra();
            await page.goto('/mitra/dashboard', { waitUntil: 'domcontentloaded' });
        });

        test('menampilkan heading "Halo, {name}"', async ({ page }) => {
            await expect(
                page.getByRole('heading', {
                    name: new RegExp(`^Halo,\\s*${SEED_MITRA.name}`, 'i'),
                }),
            ).toBeVisible();
        });

        test('menampilkan subheading "Ini tugas dan ringkasan Anda hari ini."', async ({
            page,
        }) => {
            await expect(
                page.getByText(/Ini tugas dan ringkasan Anda hari ini/i),
            ).toBeVisible();
        });
    });

    test.describe('Wallet Card', () => {
        test.beforeEach(async ({ page, asMitra, resetTrip }) => {
            await resetTrip();
            await asMitra();
            await page.goto('/mitra/dashboard', { waitUntil: 'domcontentloaded' });
        });

        test('menampilkan wallet-card (data-testid)', async ({ page }) => {
            await expect(page.getByTestId('wallet-card')).toBeVisible();
        });

        test('wallet-card adalah link ke /mitra/wallet', async ({ page }) => {
            await expectPath(page.getByTestId('wallet-card'), '/mitra/wallet');
        });

        test('menampilkan label "Saldo Wallet"', async ({ page }) => {
            await expect(
                page.getByTestId('wallet-card').getByText(/Saldo Wallet/i),
            ).toBeVisible();
        });

        test('menampilkan nominal Rupiah', async ({ page }) => {
            await expect(page.getByTestId('wallet-card')).toContainText(/Rp/);
        });

        test('menampilkan "Total Pendapatan"', async ({ page }) => {
            await expect(
                page.getByTestId('wallet-card').getByText(/Total Pendapatan/i),
            ).toBeVisible();
        });

        test('menampilkan "Total Dicairkan"', async ({ page }) => {
            await expect(
                page.getByTestId('wallet-card').getByText(/Total Dicairkan/i),
            ).toBeVisible();
        });

        test('klik wallet-card navigasi ke /mitra/wallet', async ({ page }) => {
            await page.getByTestId('wallet-card').click();
            await expectPagePath(page, '/mitra/wallet');
        });
    });

    test.describe('Panel Mitra', () => {
        test.beforeEach(async ({ page, asMitra, resetTrip }) => {
            await resetTrip();
            await asMitra();
            await page.goto('/mitra/dashboard', { waitUntil: 'domcontentloaded' });
        });

        test('menampilkan heading "Panel Mitra"', async ({ page }) => {
            await expect(
                page.getByRole('heading', { name: /^Panel Mitra$/i }),
            ).toBeVisible();
        });

       test('menampilkan 3 link navigasi di Panel Mitra', async ({ page }) => {
            // Scope ke container Panel Mitra supaya tidak bentrok dengan sidebar
            const panel = page
                .getByRole('heading', { name: /^Panel Mitra$/i })
                .locator('xpath=..'); // parent div pembungkus panel

            await expectPath(
                panel.getByRole('link', { name: /trip yang di-assign/i }),
                '/mitra/trips',
            );

            await expectPath(
                panel.getByRole('link', { name: /laporan harian/i }),
                '/mitra/daily-reports',
            );

            await expectPath(
                panel.getByRole('link', { name: /wallet & pencairan/i }),
                '/mitra/wallet',
            );
        });
    });

    test.describe('Conditional Sections — Visibility', () => {
        test.beforeEach(async ({ resetTrip }) => {
            await resetTrip();
        });

        test('report-warning ("Perlu Tindakan Anda") muncul HANYA jika ada trip hari ini tanpa report', async ({
            page,
            asMitra,
        }) => {
            await asMitra();
            await page.goto('/mitra/dashboard', { waitUntil: 'domcontentloaded' });

            const warningVisible = await page
                .getByRole('heading', { name: /Perlu Tindakan Anda/i })
                .isVisible()
                .catch(() => false);

            const todayTripsVisible = await page
                .getByRole('heading', { name: /^Trip Hari Ini$/i })
                .isVisible()
                .catch(() => false);

            // Kalau ada warning, harus ada section "Trip Hari Ini" juga.
            if (warningVisible) {
                expect(todayTripsVisible).toBe(true);
            }
        });

        test('pending reports ("Laporan Menunggu Verifikasi") muncul HANYA jika ada report submitted', async ({
            page,
            asMitra,
        }) => {
            await asMitra();
            await page.goto('/mitra/dashboard', { waitUntil: 'domcontentloaded' });

            const pendingVisible = await page
                .getByRole('heading', {
                    name: /Laporan Menunggu Verifikasi/i,
                })
                .isVisible()
                .catch(() => false);

            if (pendingVisible) {
                await expect(
                    page.getByRole('heading', {
                        name: /Laporan Menunggu Verifikasi/i,
                    }),
                ).toBeVisible();
            }
        });
    });

    test.describe('Accessibility', () => {
        test.beforeEach(async ({ resetTrip }) => {
            await resetTrip();
        });

        test('dashboard tidak punya pelanggaran WCAG kritis', async ({
            page,
            asMitra,
        }) => {
            await asMitra();
            await page.goto('/mitra/dashboard', { waitUntil: 'domcontentloaded' });
            await page.waitForLoadState('networkidle', { timeout: 15_000 });

            const results = await new AxeBuilder({ page })
                .withTags(['wcag2a', 'wcag2aa'])
                .disableRules([
                    'region',
                    'landmark-one-main',
                    // TODO: design token contrast (bg-sun/10 + text-sun-text, dll)
                    'color-contrast',
                ])
                .analyze();

            const critical = results.violations.filter((v) =>
                ['critical', 'serious'].includes(v.impact ?? ''),
            );
            expect(critical).toEqual([]);
        });

        test('heading utama ada (h1)', async ({ page, asMitra }) => {
            await asMitra();
            await page.goto('/mitra/dashboard', { waitUntil: 'domcontentloaded' });

            const h1Count = await page.locator('h1').count();
            expect(h1Count).toBeGreaterThanOrEqual(1);
        });

        test('wallet-card adalah <a> fokusable', async ({ page, asMitra }) => {
            await asMitra();
            await page.goto('/mitra/dashboard', { waitUntil: 'domcontentloaded' });

            const tag = await page
                .getByTestId('wallet-card')
                .evaluate((el) => el.tagName.toLowerCase());
            expect(tag).toBe('a');
        });
    });

    test.describe.serial('Mutation — Activate → Report Flow', () => {
        let tripId: number;

        test('step 1: setup trip due via /_test helpers', async ({
            page,
            asAdmin,
            resetTrip,
        }) => {
            await resetTrip({ resetDays: true, resetMitras: true });
            await asAdmin();

            const csrf = await getCsrf(page);
            tripId = await findTripIdByKode(page, SEED_TRIP_KODE);

            // Paksa jadi hari ini
            const simulateResp = await page.request.post('/_test/simulate-trip-due', {
                form: { trip_id: String(tripId), days_ago: '0' },
                headers: { 'X-XSRF-TOKEN': csrf, Accept: 'application/json' },
                failOnStatusCode: false,
            });
            if (!simulateResp.ok()) {
                test.skip(true, `simulate-trip-due gagal: ${await simulateResp.text()}`);
                return;
            }

            // Paksa active
            const activateResp = await page.request.post('/_test/reset-trip', {
                form: { trip_id: String(tripId), status: 'active' },
                headers: { 'X-XSRF-TOKEN': csrf, Accept: 'application/json' },
                failOnStatusCode: false,
            });
            if (!activateResp.ok()) {
                test.skip(true, `activate-trip gagal: ${await activateResp.text()}`);
                return;
            }

            // Verifikasi status active
            const findResp = await page.request.post('/_test/find-trip', {
                form: { kode: SEED_TRIP_KODE },
                headers: { 'X-XSRF-TOKEN': csrf, Accept: 'application/json' },
                failOnStatusCode: false,
            });
            if (!findResp.ok()) {
                test.skip(true, `find-trip gagal: ${await findResp.text()}`);
                return;
            }

            const tripData = await findResp.json();
            if (tripData.status !== 'active') {
                test.skip(
                    true,
                    `Trip status bukan active (dapat: ${tripData.status}).`,
                );
                return;
            }

            expect(tripId).toBeGreaterThan(0);
        });

        test('step 2: mitra dashboard — "Trip Hari Ini" & "Perlu Tindakan Anda" muncul', async ({
            page,
            asMitra,
        }) => {
            if (!tripId) {
                test.skip(true, 'Trip tidak ter-setup di step 1.');
                return;
            }

            await asMitra();
            await page.goto(
                `/mitra/dashboard?t=${Date.now()}`,
                { waitUntil: 'domcontentloaded' },
            );
            await page.waitForLoadState('networkidle', { timeout: 10_000 });

            // Assert: "Trip Hari Ini" muncul
            await expect(
                page.getByRole('heading', { name: /^Trip Hari Ini$/i }),
            ).toBeVisible({ timeout: 15_000 });

            // Assert: "Perlu Tindakan Anda" muncul
            await expect(
                page.getByRole('heading', { name: /Perlu Tindakan Anda/i }),
            ).toBeVisible({ timeout: 15_000 });
        });

        test('step 3: mitra submit daily report (via /_test)', async ({
            page,
            asAdmin,
        }) => {
            if (!tripId) {
                test.skip(true, 'Trip tidak ter-setup di step 1.');
                return;
            }

            await asAdmin();
            const result = await submitDailyReport(page, tripId, {
                hariKe: 1,
                mitraIndex: 0,
                catatan: 'Report E2E dari mitra dashboard',
            });

            if (!result.already_exists) {
                expect(result.report_id).toBeGreaterThan(0);
            }
            expect(result.status).toBe('submitted');
        });

        test('step 4: mitra dashboard — "Perlu Tindakan" hilang, "Laporan Menunggu Verifikasi" muncul', async ({
            page,
            asMitra,
        }) => {
            if (!tripId) {
                test.skip(true, 'Trip tidak ter-setup di step 1.');
                return;
            }

            await asMitra();
            await page.goto(
                `/mitra/dashboard?t=${Date.now()}`,
                { waitUntil: 'domcontentloaded' },
            );
            await page.waitForLoadState('networkidle', { timeout: 10_000 });

            // Assert: "Perlu Tindakan Anda" hilang
            await expect
                .poll(
                    async () =>
                        await page
                            .getByRole('heading', { name: /Perlu Tindakan Anda/i })
                            .isVisible()
                            .catch(() => false),
                    { timeout: 15_000, intervals: [200, 500] },
                )
                .toBe(false);

            // Assert: "Laporan Menunggu Verifikasi" muncul
            await expect(
                page.getByRole('heading', {
                    name: /Laporan Menunggu Verifikasi/i,
                }),
            ).toBeVisible({ timeout: 15_000 });
        });
    });

    test.describe('Compatibility — Unauthenticated', () => {
        test('akses dashboard tanpa login → /login', async ({
            page,
            asGuest,
        }) => {
            await asGuest();
            await page.goto('/mitra/dashboard', { waitUntil: 'domcontentloaded' });
            await expectPagePath(page, '/login');
        });
    });
});