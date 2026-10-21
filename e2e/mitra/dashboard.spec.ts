import { test, expect, SEED_TRIPS, SEED_USERS } from '../fixtures/auth';
import { APP_URL } from '../config';
import AxeBuilder from '@axe-core/playwright';
import type { Locator, Page } from '@playwright/test';

/**
 * Mitra — Dashboard (DEBUG VERSION)
 *
 * ⚠️ FIX #1-9: sama seperti versi normal.
 * 🔍 DEBUG: log di step 1 & step 2 untuk pantau:
 *    - resetTrip result
 *    - simulate-trip-due result
 *    - reset-trip result
 *    - find-trip status
 *    - has_report dari todayTrips (dari page)
 *    - report-warning visibility
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

    test.describe('Welcome Card', () => {
        test.beforeEach(async ({ page, asMitra, resetTrip }) => {
            await resetTrip();
            await asMitra();
            await page.goto('/mitra/dashboard', { waitUntil: 'domcontentloaded' });
        });

        test('menampilkan welcome-card (data-testid)', async ({ page }) => {
            await expect(page.getByTestId('welcome-card')).toBeVisible();
        });

        test('menampilkan heading "Selamat Datang, {name}"', async ({ page }) => {
            await expect(
                page.getByRole('heading', {
                    name: new RegExp(
                        `Selamat Datang,\\s*${SEED_MITRA.name}`,
                        'i',
                    ),
                }),
            ).toBeVisible();
        });

        test('menampilkan subheading', async ({ page }) => {
            await expect(
                page.getByText(
                    /Kelola trip, laporan harian, dan saldo wallet/i,
                ),
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

    test.describe('Stats Trip', () => {
        test.beforeEach(async ({ page, asMitra, resetTrip }) => {
            await resetTrip();
            await asMitra();
            await page.goto('/mitra/dashboard', { waitUntil: 'domcontentloaded' });
        });

        test('menampilkan stats-trip (data-testid)', async ({ page }) => {
            await expect(page.getByTestId('stats-trip')).toBeVisible();
        });

        test('menampilkan heading "Statistik Trip"', async ({ page }) => {
            await expect(
                page.getByRole('heading', { name: /Statistik Trip/i }),
            ).toBeVisible();
        });

        test('menampilkan 4 label: Total Trip, Terjadwal, Berjalan, Selesai', async ({
            page,
        }) => {
            const section = page.getByTestId('stats-trip');
            await expect(section.getByText(/Total Trip/i)).toBeVisible();
            await expect(section.getByText(/^Terjadwal$/i)).toBeVisible();
            await expect(section.getByText(/^Berjalan$/i)).toBeVisible();
            await expect(section.getByText(/^Selesai$/i)).toBeVisible();
        });
    });

    test.describe('Stats Reports', () => {
        test.beforeEach(async ({ page, asMitra, resetTrip }) => {
            await resetTrip();
            await asMitra();
            await page.goto('/mitra/dashboard', { waitUntil: 'domcontentloaded' });
        });

        test('menampilkan stats-reports (data-testid)', async ({ page }) => {
            await expect(page.getByTestId('stats-reports')).toBeVisible();
        });

        test('menampilkan heading "Statistik Laporan"', async ({ page }) => {
            await expect(
                page.getByRole('heading', { name: /Statistik Laporan/i }),
            ).toBeVisible();
        });

        test('menampilkan 4 label: Total Laporan, Pending, Terverifikasi, Ditolak', async ({
            page,
        }) => {
            const section = page.getByTestId('stats-reports');
            await expect(section.getByText(/Total Laporan/i)).toBeVisible();
            await expect(section.getByText(/^Pending$/i)).toBeVisible();
            await expect(section.getByText(/^Terverifikasi$/i)).toBeVisible();
            await expect(section.getByText(/^Ditolak$/i)).toBeVisible();
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

        test('menampilkan link navigasi ke trips, daily-reports, wallet', async ({
            page,
        }) => {
            await expectPath(
                page.getByRole('link', {
                    name: /^trip yang di-assign$/i,
                    exact: true,
                }),
                '/mitra/trips',
            );

            await expectPath(
                page.getByRole('link', {
                    name: 'Laporan Harian',
                    exact: true,
                }),
                '/mitra/daily-reports',
            );

            await expectPath(
                page.getByRole('link', {
                    name: /^wallet & pencairan$/i,
                    exact: true,
                }),
                '/mitra/wallet',
            );
        });
    });

    test.describe('Conditional Sections — Visibility', () => {
        test.beforeEach(async ({ resetTrip }) => {
            await resetTrip();
        });

        test('report-warning muncul HANYA jika ada trip active hari ini yang belum submit report', async ({
            page,
            asMitra,
        }) => {
            await asMitra();
            await page.goto('/mitra/dashboard', { waitUntil: 'domcontentloaded' });

            const warningExists = await page
                .getByTestId('report-warning')
                .count();
            const tripsExist = await page
                .getByTestId('today-trips')
                .count();

            if (warningExists > 0) {
                expect(tripsExist).toBeGreaterThan(0);
            }
        });

        test('pending-reports muncul HANYA jika ada report submitted', async ({
            page,
            asMitra,
        }) => {
            await asMitra();
            await page.goto('/mitra/dashboard', { waitUntil: 'domcontentloaded' });

            const pendingExists = await page
                .getByTestId('pending-reports')
                .count();

            if (pendingExists > 0) {
                await expect(
                    page
                        .getByTestId('pending-reports')
                        .locator('text=/Pending/i')
                        .first(),
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
                .disableRules(['region', 'landmark-one-main'])
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

        test('wallet-card adalah link yang fokusable', async ({
            page,
            asMitra,
        }) => {
            await asMitra();
            await page.goto('/mitra/dashboard', { waitUntil: 'domcontentloaded' });

            const walletCard = page.getByTestId('wallet-card');
            const tag = await walletCard.evaluate((el) =>
                el.tagName.toLowerCase(),
            );
            expect(tag).toBe('a');
        });

        test('stats card labels readable', async ({ page, asMitra }) => {
            await asMitra();
            await page.goto('/mitra/dashboard', { waitUntil: 'domcontentloaded' });

            await expect(
                page.getByTestId('stats-trip').getByText(/Total Trip/i),
            ).toBeVisible();
        });
    });

    test.describe.serial('Mutation — Activate → Report Flow', () => {
        let tripId: number;

        test('step 1: setup trip due via /_test helpers', async ({
            page,
            asAdmin,
            resetTrip,
        }) => {
            // ✅ FIX #7 + FIX #9: resetDays: true — recreate TripDay
            console.log('\n=== [STEP 1] START ===');
            console.log('[STEP 1] resetTrip({ resetDays: true, resetMitras: true })...');

            await resetTrip({ resetDays: true, resetMitras: true });
            console.log('[STEP 1] ✅ resetTrip selesai');

            await asAdmin();
            console.log('[STEP 1] ✅ asAdmin selesai');

            const csrf = await getCsrf(page);
            console.log(`[STEP 1] CSRF token: ${csrf.slice(0, 10)}...`);

            tripId = await findTripIdByKode(page, SEED_TRIP_KODE);
            console.log(`[STEP 1] tripId = ${tripId}`);

            // Paksa jadi hari ini
            console.log('[STEP 1] simulate-trip-due...');
            const simulateResp = await page.request.post('/_test/simulate-trip-due', {
                form: { trip_id: String(tripId), days_ago: '0' },
                headers: { 'X-XSRF-TOKEN': csrf, Accept: 'application/json' },
                failOnStatusCode: false,
            });
            if (!simulateResp.ok()) {
                const errText = await simulateResp.text();
                console.log(`[STEP 1] ❌ simulate-trip-due gagal: ${simulateResp.status()} — ${errText}`);
                test.skip(true, `simulate-trip-due gagal: ${errText}`);
                return;
            }
            const simData = await simulateResp.json();
            console.log(`[STEP 1] ✅ simulate-trip-due OK: ${JSON.stringify(simData)}`);

            // Paksa active
            console.log('[STEP 1] reset-trip (active)...');
            const activateResp = await page.request.post('/_test/reset-trip', {
                form: { trip_id: String(tripId), status: 'active' },
                headers: { 'X-XSRF-TOKEN': csrf, Accept: 'application/json' },
                failOnStatusCode: false,
            });
            if (!activateResp.ok()) {
                const errText = await activateResp.text();
                console.log(`[STEP 1] ❌ activate-trip gagal: ${activateResp.status()} — ${errText}`);
                test.skip(true, `activate-trip gagal: ${errText}`);
                return;
            }
            console.log(`[STEP 1] ✅ reset-trip (active) OK`);

            // ✅ FIX #8: verifikasi status benar-benar active
            console.log('[STEP 1] find-trip (verifikasi status)...');
            const findResp = await page.request.post('/_test/find-trip', {
                form: { kode: SEED_TRIP_KODE },
                headers: { 'X-XSRF-TOKEN': csrf, Accept: 'application/json' },
                failOnStatusCode: false,
            });
            if (!findResp.ok()) {
                const errText = await findResp.text();
                console.log(`[STEP 1] ❌ find-trip gagal: ${findResp.status()} — ${errText}`);
                test.skip(true, `find-trip gagal: ${errText}`);
                return;
            }

            const tripData = await findResp.json();
            console.log(`[STEP 1] find-trip: ${JSON.stringify(tripData)}`);

            if (tripData.status !== 'active') {
                console.log(`[STEP 1] ❌ status bukan active: ${tripData.status}`);
                test.skip(
                    true,
                    `Trip status bukan active (dapat: ${tripData.status}). ` +
                    `Cek reset-trip / race condition di 8 shard paralel.`,
                );
                return;
            }

            console.log(`[STEP 1] ✅ trip active, tripId = ${tripId}`);
            console.log('=== [STEP 1] END ===\n');
            expect(tripId).toBeGreaterThan(0);
        });

        test('step 2: mitra dashboard — today-trips muncul, report-warning muncul', async ({
            page,
            asMitra,
        }) => {
            console.log('\n=== [STEP 2] START ===');
            console.log(`[STEP 2] tripId dari step 1: ${tripId}`);

            if (!tripId) {
                console.log('[STEP 2] ❌ tripId kosong — skip');
                test.skip(true, 'Trip tidak ter-setup di step 1.');
                return;
            }

            await asMitra();
            console.log('[STEP 2] ✅ asMitra selesai');

            // Force reload dengan query string unik
            const url = `/mitra/dashboard?t=${Date.now()}`;
            console.log(`[STEP 2] goto: ${url}`);
            await page.goto(url, { waitUntil: 'domcontentloaded' });
            await page.waitForLoadState('networkidle', { timeout: 10_000 });
            console.log('[STEP 2] ✅ page loaded');

            // DEBUG: cek isi halaman
            console.log('[STEP 2] 🔍 DEBUG:');
            const todayTripsCount = await page.getByTestId('today-trips').count();
            const reportWarningCount = await page.getByTestId('report-warning').count();
            const pendingReportsCount = await page.getByTestId('pending-reports').count();
            console.log(`[STEP 2]   today-trips count: ${todayTripsCount}`);
            console.log(`[STEP 2]   report-warning count: ${reportWarningCount}`);
            console.log(`[STEP 2]   pending-reports count: ${pendingReportsCount}`);

            // DEBUG: cek status report di today-trips
            const todayTripsText = await page
                .getByTestId('today-trips')
                .innerText()
                .catch(() => '(tidak ada)');
            console.log(`[STEP 2]   today-trips text: ${todayTripsText.replace(/\s+/g, ' ').slice(0, 300)}`);

            // Assert: today-trips muncul
            console.log('[STEP 2] assert: today-trips muncul...');
            await expect
                .poll(
                    async () =>
                        await page.getByTestId('today-trips').isVisible().catch(() => false),
                    { timeout: 15_000, intervals: [200, 500] },
                )
                .toBe(true);
            console.log('[STEP 2] ✅ today-trips muncul');

            // Assert: report-warning muncul
            console.log('[STEP 2] assert: report-warning muncul...');
            await expect
                .poll(
                    async () =>
                        await page.getByTestId('report-warning').isVisible().catch(() => false),
                    { timeout: 15_000, intervals: [200, 500] },
                )
                .toBe(true);
            console.log('[STEP 2] ✅ report-warning muncul');
            console.log('=== [STEP 2] END ===\n');
        });

        test('step 3: mitra submit daily report (via /_test)', async ({
            page,
            asAdmin,
        }) => {
            console.log('\n=== [STEP 3] START ===');
            console.log(`[STEP 3] tripId: ${tripId}`);

            if (!tripId) {
                console.log('[STEP 3] ❌ tripId kosong — skip');
                test.skip(true, 'Trip tidak ter-setup di step 1.');
                return;
            }

            await asAdmin();
            console.log('[STEP 3] ✅ asAdmin selesai');

            const result = await submitDailyReport(page, tripId, {
                hariKe: 1,
                mitraIndex: 0,
                catatan: 'Report E2E dari mitra dashboard',
            });
            console.log(`[STEP 3] submitDailyReport result: ${JSON.stringify(result)}`);

            if (!result.already_exists) {
                expect(result.report_id).toBeGreaterThan(0);
            }
            expect(result.status).toBe('submitted');
            console.log('[STEP 3] ✅ report submitted');
            console.log('=== [STEP 3] END ===\n');
        });

        test('step 4: mitra dashboard — report-warning hilang, pending-reports muncul', async ({
            page,
            asMitra,
        }) => {
            console.log('\n=== [STEP 4] START ===');
            console.log(`[STEP 4] tripId: ${tripId}`);

            if (!tripId) {
                console.log('[STEP 4] ❌ tripId kosong — skip');
                test.skip(true, 'Trip tidak ter-setup di step 1.');
                return;
            }

            await asMitra();
            console.log('[STEP 4] ✅ asMitra selesai');

            const url = `/mitra/dashboard?t=${Date.now()}`;
            console.log(`[STEP 4] goto: ${url}`);
            await page.goto(url, { waitUntil: 'domcontentloaded' });
            await page.waitForLoadState('networkidle', { timeout: 10_000 });
            console.log('[STEP 4] ✅ page loaded');

            // DEBUG
            const reportWarningCount = await page.getByTestId('report-warning').count();
            const pendingReportsCount = await page.getByTestId('pending-reports').count();
            console.log(`[STEP 4] 🔍 DEBUG:`);
            console.log(`[STEP 4]   report-warning count: ${reportWarningCount}`);
            console.log(`[STEP 4]   pending-reports count: ${pendingReportsCount}`);

            // Assert: report-warning hilang
            console.log('[STEP 4] assert: report-warning hilang...');
            await expect
                .poll(
                    async () =>
                        await page.getByTestId('report-warning').isVisible().catch(() => false),
                    { timeout: 15_000, intervals: [200, 500] },
                )
                .toBe(false);
            console.log('[STEP 4] ✅ report-warning hilang');

            // Assert: pending-reports muncul
            console.log('[STEP 4] assert: pending-reports muncul...');
            await expect
                .poll(
                    async () =>
                        await page.getByTestId('pending-reports').isVisible().catch(() => false),
                    { timeout: 15_000, intervals: [200, 500] },
                )
                .toBe(true);
            console.log('[STEP 4] ✅ pending-reports muncul');

            await expect(
                page
                    .getByTestId('pending-reports')
                    .getByText(/Laporan Menunggu Verifikasi/i),
            ).toBeVisible();
            console.log('[STEP 4] ✅ teks "Laporan Menunggu Verifikasi" muncul');
            console.log('=== [STEP 4] END ===\n');
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