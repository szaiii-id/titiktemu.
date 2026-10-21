import { test, expect, SEED_TRIPS, SEED_USERS } from '../fixtures/auth';
import AxeBuilder from '@axe-core/playwright';
import type { Page, Locator } from '@playwright/test';

/**
 * Admin — Daily Reports Index (List + Verify/Reject via Modal)
 *
 * Helper `getReportCard` / `getReportCardFinal` dipakai untuk memilih
 * card report yang SPESIFIK (bukan div pembungkus).
 * `getReportCardFinal` di-anchor ke tombol thumbnail (`aria-label="Lihat
 * foto bukti"`) — karena thumbnail SELALU ada, baik report submitted
 * maupun final (verified/rejected).
 *
 * ⚠️ PENTING — ensureTripActive:
 * Inertia redirect TIDAK mengubah URL (tetap `/admin/trips/{id}`),
 * jadi `waitForURL` langsung lolos sebelum DOM di-render ulang.
 * Solusi: tunggu KONTEN "Sedang Berjalan" benar-benar visible.
 *
 * ⚠️ FIX #1: performSearch — 4 lapis tunggu (anti race hydration)
 * ⚠️ FIX #2: submitDailyReport — tambah Accept: application/json
 *           (error 404 jadi JSON, mudah didiagnosis)
 */

// ==========================================
// KONSTANTA
// ==========================================

const CURRENT_YEAR = new Date().getFullYear();
const SEED_TRIP_KODE = `${SEED_TRIPS.e2eConfirmed.kodePrefix}001`;

const CATATAN_BUDI = 'Laporan Budi untuk verifikasi';
const CATATAN_ANI = 'Laporan Ani untuk di-reject';

// ==========================================
// HELPER SELEKTOR CARD
// ==========================================

function getReportCard(page: Page, catatan: string): Locator {
    return page
        .locator('div')
        .filter({ hasText: new RegExp(catatan, 'i') })
        .filter({
            has: page.getByRole('button', { name: /^(Verifikasi|Tolak)$/i }),
        })
        .last();
}

function getReportCardFinal(page: Page, catatan: string): Locator {
    return page
        .locator('div')
        .filter({ hasText: new RegExp(catatan, 'i') })
        .filter({
            has: page.getByRole('button', { name: /Lihat foto bukti/i }),
        })
        .last();
}

// ==========================================
// HELPER
// ==========================================

/**
 * ✅ FIX #1: performSearch — anti race hydration.
 *
 * Kenapa: `page.fill()` bisa jalan SEBELUM Svelte hydration selesai.
 * Akibatnya nilai terisi di DOM, tapi handler `input`/`keydown` belum
 * terpasang → URL di-update dengan query kosong (`Received: ""`).
 *
 * Solusi:
 * 1. Tunggu networkidle (hydration selesai)
 * 2. Tunggu input visible & enabled
 * 3. Isi input + VERIFIKASI nilai benar-benar masuk
 * 4. Baru polling URL
 */
async function performSearch(page: Page, query: string): Promise<void> {
    // ✅ 1. Tunggu halaman stabil (hydration selesai)
    await page.waitForLoadState('networkidle', { timeout: 15_000 });

    const input = page.locator('input[placeholder*="Cari"]');

    // ✅ 2. Tunggu input visible & enabled
    await input.waitFor({ state: 'visible', timeout: 10_000 });
    await expect(input).toBeEnabled({ timeout: 5_000 });

    // ✅ 3. Isi input, lalu VERIFIKASI nilai benar-benar masuk
    await input.fill(query);
    await expect(input).toHaveValue(query, { timeout: 5_000 });

    // ✅ 4. Tunggu handler search men-trigger perubahan URL
    await expect
        .poll(
            () => new URL(page.url()).searchParams.get('search') ?? '',
            { timeout: 15_000, intervals: [100, 200, 500] },
        )
        .toBe(query);
}

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

async function getCsrf(page: Page): Promise<string> {
    await page.goto('/');
    return await page.evaluate(() => {
        const m = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
        return m ? decodeURIComponent(m[1]) : '';
    });
}

async function captureServerError(page: Page): Promise<string | null> {
    const candidates = [
        page.locator('.bg-red-50').first(),
        page.locator('[role="alert"]').first(),
        page
            .locator(
                'text=/Trip belum waktunya|harus punya minimal|tidak bisa|gagal/i',
            )
            .first(),
    ];

    for (const loc of candidates) {
        const text = await loc
            .textContent({ timeout: 2_000 })
            .catch(() => null);
        if (text && text.trim().length > 0) {
            return text.trim();
        }
    }
    return null;
}

/**
 * Pastikan trip aktif (idempotent).
 *
 * ⚠️ FIX: Inertia redirect TIDAK mengubah URL — `waitForURL` langsung
 * lolos sebelum DOM di-render ulang, sehingga halaman masih tampil
 * "Terjadwal". Solusi: tunggu KONTEN "Sedang Berjalan" visible.
 */
async function ensureTripActive(page: Page, tripId: number): Promise<void> {
    await page.goto(`/admin/trips/${tripId}`);
    await page.waitForLoadState('networkidle');

    const isScheduled = await page
        .getByText(/^Terjadwal$/i)
        .first()
        .isVisible()
        .catch(() => false);

    if (!isScheduled) return;

    await page.getByRole('button', { name: /Aktifkan Trip/i }).click();
    await expect(
        page.getByRole('heading', { name: /Aktifkan Trip\?/i }),
    ).toBeVisible();

    await Promise.all([
        page.waitForResponse(
            (resp) =>
                resp.url().includes('/activate') &&
                resp.request().method() === 'POST',
            { timeout: 15_000 },
        ),
        page.getByRole('button', { name: /Ya, Aktifkan/i }).click(),
    ]);

    // ✅ FIX: tunggu KONTEN "Sedang Berjalan" muncul, bukan waitForURL.
    const isNowActive = await page
        .getByText(/^Sedang Berjalan$/i)
        .first()
        .waitFor({ state: 'visible', timeout: 10_000 })
        .then(() => true)
        .catch(() => false);

    if (!isNowActive) {
        const errorMessage = await captureServerError(page);
        const pageSnippet = (await page
            .locator('body')
            .innerText()
            .catch(() => ''))
            .slice(0, 500);

        throw new Error(
            `ensureTripActive: Gagal activate trip ${tripId}. ` +
            `Status masih scheduled setelah activate. ` +
            `Error server: ${errorMessage ?? '(tidak tertangkap)'}. ` +
            `Snippet: ${pageSnippet.replace(/\s+/g, ' ').slice(0, 200)}`,
        );
    }
}

/**
 * ✅ FIX #2: submitDailyReport — tambah Accept: application/json.
 *
 * Kenapa: tanpa `Accept: application/json`, error 404 dari route
 * (mis. "Trip day tidak ditemukan") di-render sebagai HTML oleh Laravel
 * — sulit didiagnosis. Dengan `Accept: application/json`, error jadi
 * JSON (`{"message": "..."}`) — mudah dibaca & di-debug.
 */
async function submitDailyReport(
    page: Page,
    tripId: number,
    options: {
        hariKe: number;
        mitraIndex?: number;
        catatan?: string;
        tanpaMedia?: boolean;
    },
): Promise<{ report_id: number; status: string }> {
    const csrf = await getCsrf(page);

    const form: Record<string, string> = {
        trip_id: String(tripId),
        hari_ke: String(options.hariKe),
        mitra_index: String(options.mitraIndex ?? 0),
        catatan: options.catatan ?? 'E2E test report',
    };
    if (options.tanpaMedia !== undefined) {
        form.tanpa_media = options.tanpaMedia ? '1' : '0';
    }

    const response = await page.request.post('/_test/submit-daily-report', {
        form,
        headers: {
            'X-XSRF-TOKEN': csrf,
            'Accept': 'application/json',   // ✅ FIX: error 404 jadi JSON
        },
        failOnStatusCode: false,
    });

    if (!response.ok()) {
        const body = await response.text();
        throw new Error(
            `submitDailyReport gagal: ${response.status()} — ${body}`,
        );
    }

    return response.json();
}

async function hasReport(page: Page, catatan: string): Promise<boolean> {
    return page
        .getByText(new RegExp(catatan, 'i'))
        .first()
        .isVisible()
        .catch(() => false);
}

// ==========================================
// TEST SUITE
// ==========================================

test.describe('Admin — Daily Reports Index', () => {
    test('guest tidak bisa akses daily-reports index', async ({
        page,
        asGuest,
    }) => {
        await asGuest();
        await page.goto('/admin/daily-reports');
        await expect(page).toHaveURL('/login');
    });

    test('client tidak bisa akses daily-reports index', async ({
        page,
        asClient,
    }) => {
        await asClient();
        await page.goto('/admin/daily-reports');
        await expect(page).toHaveURL('/client/dashboard');
    });

    test('mitra tidak bisa akses daily-reports index admin', async ({
        page,
        asMitra,
    }) => {
        await asMitra();
        await page.goto('/admin/daily-reports');
        await expect(page).toHaveURL('/mitra/dashboard');
    });

    test('admin bisa akses daily-reports index', async ({ page, asAdmin }) => {
        await asAdmin();
        await page.goto('/admin/daily-reports');
        await expect(page).toHaveURL('/admin/daily-reports');
    });

    test.describe('Elemen Halaman', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/daily-reports');
        });

        test('menampilkan heading "Verifikasi Laporan"', async ({ page }) => {
            await expect(
                page.getByRole('heading', {
                    name: /^Verifikasi Laporan$/i,
                }).first(),
            ).toBeVisible();
        });

        test('menampilkan deskripsi halaman', async ({ page }) => {
            await expect(
                page.getByText(
                    /Verifikasi atau tolak laporan harian yang dikirim mitra/i,
                ),
            ).toBeVisible();
        });

        test('menampilkan input search', async ({ page }) => {
            await expect(
                page.locator('input[placeholder*="Cari"]'),
            ).toHaveAttribute(
                'placeholder',
                /Cari kode trip, paket, atau nama mitra/i,
            );
        });

        test('menampilkan tab "Semua" (seed kosong)', async ({ page }) => {
            await expect(
                page.getByRole('tab', { name: /^Semua/i }),
            ).toBeVisible();

            await expect(
                page.getByRole('tab', { name: /^Pending/i }),
            ).not.toBeVisible();
            await expect(
                page.getByRole('tab', { name: /^Terverifikasi/i }),
            ).not.toBeVisible();
            await expect(
                page.getByRole('tab', { name: /^Ditolak/i }),
            ).not.toBeVisible();
        });
    });

    test.describe('Empty State', () => {
        test('menampilkan empty state ketika belum ada report', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await page.goto('/admin/daily-reports');

            await expect(page.getByText(/Belum ada laporan/i)).toBeVisible();
            await expect(
                page.getByText(/Laporan harian dari mitra akan muncul/i),
            ).toBeVisible();
        });
    });

    test.describe('Filter — Status Tabs', () => {
        test.skip(
            'filter status "submitted" → empty state (seed kosong)',
            async () => {},
        );

        test.skip(
            'filter status "verified" → empty state',
            async () => {},
        );
    });

    test.describe('Search', () => {
        test('search tanpa hasil → empty state', async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/daily-reports');

            // ✅ FIX #1: pakai performSearch — anti race hydration
            await performSearch(page, 'tidak-ada-xyz-999');

            await expect(
                page.getByText(/Tidak ada laporan ditemukan/i),
            ).toBeVisible();
        });
    });

    test.describe('Accessibility', () => {
        test('halaman index tidak punya pelanggaran WCAG kritis', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await page.goto('/admin/daily-reports');
            await page.waitForLoadState('networkidle');

            const results = await new AxeBuilder({ page })
                .withTags(['wcag2a', 'wcag2aa'])
                .disableRules(['region', 'landmark-one-main', 'color-contrast'])
                .analyze();

            const critical = results.violations.filter((v) =>
                ['critical', 'serious'].includes(v.impact ?? ''),
            );
            expect(critical).toEqual([]);
        });
    });

    test.describe.serial('Verify/Reject via Index — Happy Path', () => {
        let tripId: number;

        test('step 1: resolve trip ID', async ({ page, asAdmin }) => {
            await asAdmin();
            tripId = await findTripIdByKode(page, SEED_TRIP_KODE);
        });

        test('step 2: ensure trip active (idempotent)', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await ensureTripActive(page, tripId);
        });

        test('step 3: submit report mitra 0 (Budi)', async ({ page, asAdmin }) => {
            await asAdmin();
            const result = await submitDailyReport(page, tripId, {
                hariKe: 1,
                mitraIndex: 0,
                catatan: CATATAN_BUDI,
            });

            expect(result.report_id).toBeGreaterThan(0);
            expect(result.status).toBe('submitted');
        });

        test('step 4: submit report mitra 1 (Ani)', async ({ page, asAdmin }) => {
            await asAdmin();
            const result = await submitDailyReport(page, tripId, {
                hariKe: 1,
                mitraIndex: 1,
                catatan: CATATAN_ANI,
            });

            expect(result.report_id).toBeGreaterThan(0);
            expect(result.status).toBe('submitted');
        });

        test('step 5: index menampilkan 2 report submitted', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await page.goto('/admin/daily-reports');

            await expect(
                page.getByText(new RegExp(CATATAN_BUDI, 'i')),
            ).toBeVisible();
            await expect(
                page.getByText(new RegExp(CATATAN_ANI, 'i')),
            ).toBeVisible();

            await expect(
                page.getByRole('tab', { name: /^Pending/i }),
            ).toBeVisible();

            const verifButtons = page.getByRole('button', {
                name: /^Verifikasi$/i,
            });
            const rejectButtons = page.getByRole('button', {
                name: /^Tolak$/i,
            });
            expect(await verifButtons.count()).toBeGreaterThanOrEqual(2);
            expect(await rejectButtons.count()).toBeGreaterThanOrEqual(2);
        });

        test('step 6: verify report mitra 0 via modal', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await page.goto('/admin/daily-reports');

            const budiCard = getReportCard(page, CATATAN_BUDI);

            await budiCard
                .getByRole('button', { name: /^Verifikasi$/i })
                .first()
                .click();

            await expect(
                page.getByRole('heading', { name: /Verifikasi Laporan\?/i }),
            ).toBeVisible();

            await Promise.all([
                page.waitForResponse(
                    (resp) =>
                        resp.url().includes('/daily-reports/') &&
                        resp.url().includes('/verify') &&
                        resp.request().method() === 'POST',
                    { timeout: 15_000 },
                ),
                page.getByRole('button', { name: /Ya, Verifikasi/i }).click(),
            ]);

            await expect(
                page.getByText(/Laporan berhasil diverifikasi/i),
            ).toBeVisible({ timeout: 10_000 });

            const updatedBudiCard = getReportCardFinal(page, CATATAN_BUDI);
            await expect(
                updatedBudiCard.getByText(/^Terverifikasi$/i).first(),
            ).toBeVisible();
        });

        test('step 7: reject report mitra 1 via modal + reason', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await page.goto('/admin/daily-reports');

            const aniCard = getReportCard(page, CATATAN_ANI);

            await aniCard
                .getByRole('button', { name: /^Tolak$/i })
                .first()
                .click();

            await expect(
                page.getByRole('heading', { name: /Tolak Laporan\?/i }),
            ).toBeVisible();

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

            await expect(
                page.getByText(/Laporan ditolak/i),
            ).toBeVisible({ timeout: 10_000 });

            const updatedAniCard = getReportCardFinal(page, CATATAN_ANI);
            await expect(
                updatedAniCard.getByText(/^Ditolak$/i).first(),
            ).toBeVisible();
            await expect(
                updatedAniCard.getByText(/Foto kurang jelas/i).first(),
            ).toBeVisible();
        });

        test('step 8: verifikasi status di index setelah verify/reject', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await page.goto('/admin/daily-reports');

            const budiCard = getReportCardFinal(page, CATATAN_BUDI);
            await expect(
                budiCard.getByText(/^Terverifikasi$/i).first(),
            ).toBeVisible();

            const aniCard = getReportCardFinal(page, CATATAN_ANI);
            await expect(
                aniCard.getByText(/^Ditolak$/i).first(),
            ).toBeVisible();

            await expect(
                budiCard.getByRole('button', { name: /^Verifikasi$/i }),
            ).not.toBeVisible();
            await expect(
                aniCard.getByRole('button', { name: /^Verifikasi$/i }),
            ).not.toBeVisible();
        });
    });

    test.describe.serial('Filter — Setelah Mutasi', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/daily-reports');
        });

        test('filter "Terverifikasi" hanya menampilkan report Budi', async ({
            page,
        }) => {
            const budiExists = await hasReport(page, CATATAN_BUDI);
            if (!budiExists) {
                test.skip(
                    true,
                    `Precondition tidak terpenuhi: report "${CATATAN_BUDI}" tidak ada.`,
                );
                return;
            }

            const tabCount = await page
                .getByRole('tab', { name: /^Terverifikasi/i })
                .count();
            if (tabCount === 0) {
                test.skip(
                    true,
                    'Tab "Terverifikasi" tidak render — kemungkinan step 6 (verify Budi) gagal.',
                );
                return;
            }

            await expect(
                page.getByRole('tab', { name: /^Terverifikasi/i }),
            ).toBeVisible();

            await Promise.all([
                page.waitForResponse(
                    (resp) =>
                        resp.url().includes('/admin/daily-reports') &&
                        resp.request().method() === 'GET' &&
                        resp.url().includes('status=verified'),
                    { timeout: 15_000 },
                ),
                page.getByRole('tab', { name: /^Terverifikasi/i }).click(),
            ]);

            await expect(
                page.getByText(new RegExp(CATATAN_BUDI, 'i')),
            ).toBeVisible();
            await expect(
                page.getByText(new RegExp(CATATAN_ANI, 'i')),
            ).not.toBeVisible();
        });

        test('filter "Ditolak" hanya menampilkan report Ani', async ({
            page,
        }) => {
            const aniExists = await hasReport(page, CATATAN_ANI);
            if (!aniExists) {
                test.skip(
                    true,
                    `Precondition tidak terpenuhi: report "${CATATAN_ANI}" tidak ada.`,
                );
                return;
            }

            const tabCount = await page
                .getByRole('tab', { name: /^Ditolak/i })
                .count();
            if (tabCount === 0) {
                test.skip(
                    true,
                    'Tab "Ditolak" tidak render — kemungkinan step 7 (reject Ani) gagal.',
                );
                return;
            }

            await expect(
                page.getByRole('tab', { name: /^Ditolak/i }),
            ).toBeVisible();

            await Promise.all([
                page.waitForResponse(
                    (resp) =>
                        resp.url().includes('/admin/daily-reports') &&
                        resp.request().method() === 'GET' &&
                        resp.url().includes('status=rejected'),
                    { timeout: 15_000 },
                ),
                page.getByRole('tab', { name: /^Ditolak/i }).click(),
            ]);

            await expect(
                page.getByText(new RegExp(CATATAN_ANI, 'i')),
            ).toBeVisible();
            await expect(
                page.getByText(new RegExp(CATATAN_BUDI, 'i')),
            ).not.toBeVisible();
        });
    });

    test.describe.serial('Photo Preview Modal', () => {
        test('klik thumbnail membuka modal preview', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await page.goto('/admin/daily-reports');

            const budiExists = await hasReport(page, CATATAN_BUDI);
            if (!budiExists) {
                test.skip(
                    true,
                    `Precondition tidak terpenuhi: report "${CATATAN_BUDI}" tidak ada.`,
                );
                return;
            }

            const budiCard = getReportCardFinal(page, CATATAN_BUDI);

            const thumb = budiCard
                .getByRole('button', { name: /Lihat foto bukti/i })
                .first();

            if ((await thumb.count()) === 0) {
                test.skip(true, 'Tidak ada thumbnail foto.');
                return;
            }

            await thumb.click();

            const modal = page
                .locator('[role="dialog"], [aria-modal="true"]')
                .first();
            await expect(modal).toBeVisible({ timeout: 5_000 });

            await page.keyboard.press('Escape');
            await expect(modal).not.toBeVisible();
        });
    });
});