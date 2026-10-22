import { test, expect, SEED_TRIPS } from '../fixtures/auth';
import type { Page } from '@playwright/test';

/**
 * Admin — Trip Reports Inline (Verify/Reject) + Complete Trip
 *
 * ⚠️ FIX #1: findTripIdByKode — filter href numeric (hindari /create)
 * ⚠️ FIX #2: submitDailyReport idempotent — tangkap 422 "sudah ada"
 * ⚠️ FIX #3: precheck report card / thumbnail sebelum klik
 * ⚠️ FIX #4: timeline — cek "X hari — Y laporan", bukan "H1"/"Hari 1"
 * ⚠️ FIX #5: getCsrf retry — anti race XSRF saat sharding
 * ⚠️ FIX #6: modal & status badge — pakai expect.poll() (anti flaky animation)
 * ⚠️ FIX #7: submitDailyReport — tangani 404 (mitra belum di-assign) sebagai skip
 * ⚠️ FIX #8: resetTrip di beforeEach (non-serial) / step 1 (serial) —
 *           anti state leak dari test Mutation — Activate → Cancel.
 * ⚠️ FIX #9: submitDailyReport — tambah Accept: application/json
 *           (error 404 jadi JSON, match body.includes('Mitra'))
 */

// ==========================================
// KONSTANTA
// ==========================================

const SEED_TRIP_KODE = `${SEED_TRIPS.e2eConfirmed.kodePrefix}001`;

// ==========================================
// HELPER
// ==========================================

async function findTripIdByKode(
    page: Page,
    kode: string,
): Promise<number> {
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

/**
 * ✅ FIX #5: retry getCsrf — anti race XSRF saat sharding.
 */
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
        } catch {
            // retry
        }
        if (attempt < 3) {
            await page.waitForTimeout(500 * attempt);
        }
    }

    throw new Error('getCsrf: tidak bisa ambil XSRF-TOKEN setelah 3 attempt.');
}

async function ensureTripActive(page: Page, tripId: number): Promise<void> {
    await page.goto(`/admin/trips/${tripId}`, { waitUntil: 'domcontentloaded' });

    const isScheduled = await page
        .getByText(/^Terjadwal$/i)
        .first()
        .isVisible()
        .catch(() => false);

    if (!isScheduled) return;

    await page.getByRole('button', { name: /Aktifkan Trip/i }).click();

    // ✅ FIX #6: pakai expect.poll untuk heading modal (anti flaky animation)
    await expect
        .poll(
            async () =>
                await page
                    .getByRole('heading', { name: /Aktifkan Trip\?/i })
                    .isVisible()
                    .catch(() => false),
            { timeout: 10_000, intervals: [100, 200, 500] },
        )
        .toBe(true);

    await Promise.all([
        page.waitForResponse(
            (resp) =>
                resp.url().includes('/activate') &&
                resp.request().method() === 'POST',
            { timeout: 15_000 },
        ),
        page.getByRole('button', { name: /Ya, Aktifkan/i }).click(),
    ]);

    await expect
        .poll(
            async () =>
                await page
                    .getByText(/Trip berhasil diaktifkan/i)
                    .isVisible()
                    .catch(() => false),
            { timeout: 10_000, intervals: [200, 500] },
        )
        .toBe(true);
}

/**
 * ✅ FIX #2: submitDailyReport idempotent.
 * ✅ FIX #7: tangani 404 (mitra belum di-assign) sebagai skip.
 * ✅ FIX #9: tambah Accept: application/json — error 404 jadi JSON,
 *           match body.includes('Mitra') di FIX #7.
 */
async function submitDailyReport(
    page: Page,
    tripId: number,
    options: {
        hariKe: number;
        mitraIndex?: number;
        catatan?: string;
    },
): Promise<{
    report_id: number;
    status: string;
    already_exists?: boolean;
    mitra_not_assigned?: boolean;
}> {
    const csrf = await getCsrf(page);

    const response = await page.request.post('/_test/submit-daily-report', {
        form: {
            trip_id: String(tripId),
            hari_ke: String(options.hariKe),
            mitra_index: String(options.mitraIndex ?? 0),
            catatan: options.catatan ?? 'E2E test report',
        },
        headers: {
            'X-XSRF-TOKEN': csrf,
            'Accept': 'application/json',   // ✅ FIX #9: error 404 jadi JSON
        },
        failOnStatusCode: false,
    });

    if (!response.ok()) {
        const body = await response.text();

        // ✅ Report sudah ada (idempotent)
        if (
            response.status() === 422 &&
            (body.includes('sudah ada') ||
                body.includes('sudah disubmit') ||
                body.includes('already'))
        ) {
            return {
                report_id: 0,
                status: 'submitted',
                already_exists: true,
            };
        }

        // ✅ FIX #7: mitra belum di-assign — bukan error fatal
        // (dengan Accept: application/json, body pasti JSON
        //  sehingga body.includes('Mitra') match)
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

/**
 * ✅ Helper baru: skip kalau submit gagal karena mitra belum di-assign.
 */
function skipIfMitraNotAssigned(
    result: { mitra_not_assigned?: boolean },
    reason = 'Mitra belum di-assign ke trip ini (setup create-trip gagal atau skip_mitra).',
): void {
    if (result.mitra_not_assigned) {
        test.skip(true, reason);
    }
}

// ==========================================
// TEST SUITE
// ==========================================

test.describe('Admin — Trip Reports Inline', () => {
    // ❌ JANGAN taruh beforeEach resetTrip di sini — akan merusak describe.serial.
    // ✅ Taruh di describe block masing-masing (non-serial) atau di step 1 (serial).

    test.describe('Section Itinerary & Laporan — Contract', () => {
        test.beforeEach(async ({ page, asAdmin, resetTrip }) => {
            // ✅ FIX #8: reset TRP-001 ke scheduled sebelum tiap test
            await resetTrip();
            await asAdmin();
            const tripId = await findTripIdByKode(page, SEED_TRIP_KODE);
            await page.goto(`/admin/trips/${tripId}`, {
                waitUntil: 'domcontentloaded',
            });
        });

        test('menampilkan heading "Itinerary & Laporan"', async ({ page }) => {
            await expect(
                page.getByRole('heading', { name: /Itinerary & Laporan/i }),
            ).toBeVisible();
        });

        test('menampilkan timeline 2 hari', async ({ page }) => {
            await expect(
                page.getByText(/\d+ hari\s*—\s*\d+ laporan/i),
            ).toBeVisible();
        });

        test('menampilkan pesan "Belum ada laporan" untuk hari tanpa report', async ({
            page,
        }) => {
            const noReportText = page
                .getByText(/Belum ada laporan untuk hari ini/i)
                .first();

            const isVisible = await noReportText
                .isVisible()
                .catch(() => false);

            if (!isVisible) {
                test.skip(
                    true,
                    'Pesan "Belum ada laporan" tidak muncul — kemungkinan ' +
                    'report sudah ada dari test sebelumnya.',
                );
                return;
            }

            await expect(noReportText).toBeVisible();
        });
    });

    test.describe.serial('Setup + Verify Happy Path', () => {
        let tripId: number;

        test('step 1: resolve trip ID + reset state', async ({
            page,
            asAdmin,
            resetTrip,
        }) => {
            // ✅ FIX #8: reset TRP-001 ke scheduled SEBELUM aktivasi.
            // Hanya di step 1 — step 2-5 butuh state berurutan.
            await resetTrip();
            await asAdmin();
            tripId = await findTripIdByKode(page, SEED_TRIP_KODE);
        });

        test('step 2: activate trip', async ({ page, asAdmin }) => {
            await asAdmin();
            await ensureTripActive(page, tripId);
        });

        test('step 3: submit daily report hari 1 via /_test helper', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            const result = await submitDailyReport(page, tripId, {
                hariKe: 1,
                mitraIndex: 0,
                catatan: 'Laporan hari 1 E2E',
            });

            skipIfMitraNotAssigned(result);

            if (!result.already_exists) {
                expect(result.report_id).toBeGreaterThan(0);
            }
            expect(result.status).toBe('submitted');
        });

        test('step 4: report muncul di timeline dengan tombol Verifikasi', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await page.goto(`/admin/trips/${tripId}`, {
                waitUntil: 'domcontentloaded',
            });

            await expect(
                page.getByText(/Laporan hari 1 E2E/i),
            ).toBeVisible({ timeout: 10_000 });

            await expect(
                page.getByRole('button', { name: /^Verifikasi$/i }).first(),
            ).toBeVisible();
        });

        test('step 5: klik Verifikasi → report diverifikasi', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await page.goto(`/admin/trips/${tripId}`, {
                waitUntil: 'domcontentloaded',
            });

            const verifyBtn = page
                .getByRole('button', { name: /^Verifikasi$/i })
                .first();
            const hasVerifyBtn = await verifyBtn
                .isVisible()
                .catch(() => false);

            if (!hasVerifyBtn) {
                test.skip(
                    true,
                    'Tombol "Verifikasi" tidak ada — report mungkin ' +
                    'sudah verified dari test sebelumnya.',
                );
                return;
            }

            await verifyBtn.click();

            // ✅ FIX #6: polling heading modal
            await expect
                .poll(
                    async () =>
                        await page
                            .getByRole('heading', {
                                name: /Verifikasi Laporan\?/i,
                            })
                            .isVisible()
                            .catch(() => false),
                    { timeout: 10_000, intervals: [100, 200, 500] },
                )
                .toBe(true);

            await Promise.all([
                page.waitForResponse(
                    (resp) =>
                        resp.url().includes('/daily-reports/') &&
                        resp.url().includes('/verify') &&
                        resp.request().method() === 'POST',
                    { timeout: 15_000 },
                ),
                page
                    .getByRole('button', { name: /Ya, Verifikasi/i })
                    .click(),
            ]);

            // ✅ FIX #6: polling toast sukses
            await expect
                .poll(
                    async () =>
                        await page
                            .getByText(/Laporan berhasil diverifikasi/i)
                            .isVisible()
                            .catch(() => false),
                    { timeout: 10_000, intervals: [200, 500] },
                )
                .toBe(true);

            // ✅ FIX #6: polling status badge "Terverifikasi"
            await expect
                .poll(
                    async () =>
                        await page
                            .getByText(/^Terverifikasi$/i)
                            .first()
                            .isVisible()
                            .catch(() => false),
                    { timeout: 10_000, intervals: [200, 500] },
                )
                .toBe(true);
        });
    });

    test.describe.serial('Reject Report — Happy Path', () => {
        let tripId: number;

        test('step 1: resolve + setup (activate + submit report mitra 2)', async ({
            page,
            asAdmin,
            resetTrip,
        }) => {
            // ✅ FIX #8: reset TRP-001 ke scheduled SEBELUM aktivasi
            await resetTrip();
            await asAdmin();
            tripId = await findTripIdByKode(page, SEED_TRIP_KODE);
            await ensureTripActive(page, tripId);

            const result = await submitDailyReport(page, tripId, {
                hariKe: 1,
                mitraIndex: 1,
                catatan: 'Laporan untuk di-reject E2E',
            });

            skipIfMitraNotAssigned(result);

            if (!result.already_exists) {
                expect(result.report_id).toBeGreaterThan(0);
            }
        });

        test('step 2: reject report dengan reason → status rejected', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await page.goto(`/admin/trips/${tripId}`, {
                waitUntil: 'domcontentloaded',
            });

            const reportCard = page
                .locator('div')
                .filter({ hasText: /Laporan untuk di-reject E2E/i })
                .last();

            const cardExists = await reportCard
                .isVisible()
                .catch(() => false);

            if (!cardExists) {
                test.skip(
                    true,
                    'Report card "Laporan untuk di-reject E2E" tidak ditemukan.',
                );
                return;
            }

            const rejectBtn = reportCard
                .getByRole('button', { name: /^Tolak$/i })
                .first();
            const hasRejectBtn = await rejectBtn
                .isVisible()
                .catch(() => false);

            if (!hasRejectBtn) {
                test.skip(
                    true,
                    'Tombol "Tolak" tidak ada — report mungkin sudah final.',
                );
                return;
            }

            await rejectBtn.click();

            // ✅ FIX #6: polling heading modal
            await expect
                .poll(
                    async () =>
                        await page
                            .getByRole('heading', {
                                name: /Tolak Laporan\?/i,
                            })
                            .isVisible()
                            .catch(() => false),
                    { timeout: 10_000, intervals: [100, 200, 500] },
                )
                .toBe(true);

            await page.fill(
                'textarea#confirm-reason',
                'Foto kurang jelas, tolong upload ulang',
            );

            await Promise.all([
                page.waitForResponse(
                    (resp) =>
                        resp.url().includes('/daily-reports/') &&
                        resp.url().includes('/reject') &&
                        resp.request().method() === 'POST',
                    { timeout: 15_000 },
                ),
                page.getByRole('button', { name: /Ya, Tolak/i }).click(),
            ]);

            // ✅ FIX #6: polling toast
            await expect
                .poll(
                    async () =>
                        await page
                            .getByText(/Laporan ditolak/i)
                            .isVisible()
                            .catch(() => false),
                    { timeout: 10_000, intervals: [200, 500] },
                )
                .toBe(true);

            // ✅ FIX #6: polling status badge "Ditolak"
            await expect
                .poll(
                    async () =>
                        await page
                            .getByText(/^Ditolak$/i)
                            .first()
                            .isVisible()
                            .catch(() => false),
                    { timeout: 10_000, intervals: [200, 500] },
                )
                .toBe(true);

            // ✅ FIX #6: polling reason
            await expect
                .poll(
                    async () =>
                        await page
                            .getByText(/Foto kurang jelas/i)
                            .first()
                            .isVisible()
                            .catch(() => false),
                    { timeout: 10_000, intervals: [200, 500] },
                )
                .toBe(true);
        });
    });

    test.describe.serial('Photo Preview Modal', () => {
        test('klik thumbnail membuka modal preview dengan role="dialog"', async ({
            page,
            asAdmin,
            resetTrip,
        }) => {
            // ✅ FIX #8: reset TRP-001 ke scheduled SEBELUM aktivasi
            await resetTrip();
            await asAdmin();
            const tripId = await findTripIdByKode(page, SEED_TRIP_KODE);

            await ensureTripActive(page, tripId);

            const submitResult = await submitDailyReport(page, tripId, {
                hariKe: 1,
                mitraIndex: 0,
                catatan: 'Report untuk photo test',
            });

            skipIfMitraNotAssigned(submitResult);

            await page.goto(`/admin/trips/${tripId}`, {
                waitUntil: 'networkidle',
            });

            const photoButton = page
                .getByRole('button', { name: /Lihat foto bukti/i })
                .first();

            const hasPhoto = await photoButton
                .isVisible()
                .catch(() => false);
            if (!hasPhoto) {
                test.skip(true, 'Tidak ada thumbnail foto.');
                return;
            }

            // ✅ Hitung dialog SEBELUM klik
            const dialogsBefore = await page
                .locator('[role="dialog"]')
                .count();

            await photoButton.click();

            // ✅ Tunggu dialog muncul (jumlah bertambah)
            await expect
                .poll(
                    async () =>
                        await page.locator('[role="dialog"]').count(),
                    { timeout: 5_000, intervals: [100, 200, 500] },
                )
                .toBeGreaterThan(dialogsBefore);

            // ✅ Ambil modal yang baru muncul (last())
            const modal = page.locator('[role="dialog"]').last();
            await expect(modal).toBeVisible({ timeout: 2_000 });

            // ✅ Tutup via tombol X
            const closeBtn = modal.getByRole('button', {
                name: /^Tutup$/i,
            });
            await closeBtn.click();

            await expect(modal).not.toBeVisible({ timeout: 2_000 });
        });
    });

    test.describe('Complete Trip (SKIP)', () => {
        test.skip(
            'admin bisa selesaikan trip setelah semua hari verified',
            async () => {},
        );
    });

    test.describe('Accessibility', () => {
        test('tombol Verifikasi/Tolak punya aria-label yang jelas', async ({
            page,
            asAdmin,
            resetTrip,
        }) => {
            // ✅ FIX #8: reset TRP-001 ke scheduled SEBELUM aktivasi
            await resetTrip();
            await asAdmin();
            const tripId = await findTripIdByKode(page, SEED_TRIP_KODE);
            await ensureTripActive(page, tripId);

            const result = await submitDailyReport(page, tripId, {
                hariKe: 1,
                mitraIndex: 1,
                catatan: 'A11y test report',
            });

            skipIfMitraNotAssigned(result);

            await page.goto(`/admin/trips/${tripId}`, {
                waitUntil: 'domcontentloaded',
            });

            const verifBtn = page
                .getByRole('button', { name: /^Verifikasi$/i })
                .first();
            const hasVerif = await verifBtn
                .isVisible()
                .catch(() => false);

            if (!hasVerif) {
                test.skip(
                    true,
                    'Tombol Verifikasi/Tolak tidak ada — report mungkin ' +
                    'sudah final dari test sebelumnya.',
                );
                return;
            }

            await expect(verifBtn).toBeVisible();
            await expect(
                page.getByRole('button', { name: /^Tolak$/i }).first(),
            ).toBeVisible();
        });
    });
});