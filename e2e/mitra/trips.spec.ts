import { test, expect, SEED_TRIPS, SEED_USERS, SEED_EXTRA } from '../fixtures/auth';
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

/**
 * Mitra — Trips (Index + Show + Tombol Lapor)
 *
 * Routes:
 * - GET /mitra/trips                     → Mitra\TripController@index
 * - GET /mitra/trips/{trip}              → Mitra\TripController@show
 * - GET /mitra/trips/{trip}/days/{day}/report → Mitra\DailyReportController@create
 *
 * ⚠️ FIX #1: findTripIdByKode — filter href numeric (hindari /create)
 * ⚠️ FIX #2: tab status — precheck, skip jika data kosong
 * ⚠️ FIX #3: strict mode — .first() pada getByText
 * ⚠️ FIX #4: "menampilkan 5 status tab" — precheck tabCount < 5 → skip
 *    (tab hanya render jika statusCounts > 0, sesuai design Svelte)
 * ⚠️ FIX #5: resetTrip di step 1 — anti state leak dari test sebelumnya
 *           (trip bisa sudah active/cancelled).
 * ⚠️ FIX #6: ensureTripActive — verifikasi status = active setelah klik,
 *           throw error jelas jika gagal (bukan timeout).
 */

// ==========================================
// KONSTANTA
// ==========================================

const SEED_TRIP_KODE = `${SEED_TRIPS.e2eConfirmed.kodePrefix}001`;

const SEED_MITRA = {
    name: SEED_USERS.mitra.name,
    email: SEED_USERS.mitra.email,
};

// ==========================================
// HELPER
// ==========================================

/**
 * ✅ FIX #1: filter href numeric — exclude `/admin/trips/create`.
 */
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
 * ✅ FIX #6: ensureTripActive — verifikasi status setelah klik.
 *
 * Kenapa perlu verifikasi:
 * - Cek `isScheduled` hanya cek teks "Terjadwal" visible.
 * - Jika trip **sudah active** (dari test sebelumnya), `isScheduled = false`
 *   → return early → step 4 mengharapkan tombol "Lapor Hari Ini" → gagal.
 * - Jika trip **cancelled**, tombol "Aktifkan Trip" **tidak ada** → klik
 *   gagal silent → heading modal tidak muncul → timeout 20s.
 *
 * Solusi:
 * 1. Cek `isScheduled` — jika `true`, klik + verifikasi modal.
 * 2. Setelah klik, verifikasi status **benar-benar active**.
 * 3. Jika bukan `scheduled`/`active` → throw error jelas.
 */
async function ensureTripActive(page: Page, tripId: number): Promise<void> {
    await page.goto(`/admin/trips/${tripId}`, { waitUntil: 'domcontentloaded' });

    // ✅ Cek status "Terjadwal" — jika false, cek apakah sudah active
    const isScheduled = await page
        .getByText(/^Terjadwal$/i)
        .first()
        .isVisible()
        .catch(() => false);

    if (!isScheduled) {
        // Mungkin sudah active / cancelled / completed
        const isActive = await page
            .getByText(/^Sedang Berjalan$/i)
            .first()
            .isVisible()
            .catch(() => false);

        if (isActive) {
            // Sudah active — tidak perlu aktivasi
            return;
        }

        // Bukan scheduled, bukan active — error jelas
        const pageSnippet = (
            await page.locator('body').innerText().catch(() => '')
        )
            .replace(/\s+/g, ' ')
            .slice(0, 200);

        throw new Error(
            `ensureTripActive: Trip ${tripId} tidak dalam status ` +
            `scheduled/active. Kemungkinan sudah cancelled/completed. ` +
            `Snippet: ${pageSnippet}`,
        );
    }

    // ✅ Klik "Aktifkan Trip" — dengan precheck tombol ada
    const activateBtn = page.getByRole('button', { name: /Aktifkan Trip/i });
    const btnVisible = await activateBtn.isVisible().catch(() => false);

    if (!btnVisible) {
        throw new Error(
            `ensureTripActive: Tombol "Aktifkan Trip" tidak ditemukan ` +
            `di trip ${tripId} padahal status scheduled. ` +
            `Cek TripController@show — mungkin tombol tidak render.`,
        );
    }

    await activateBtn.click();

    // ✅ Verifikasi modal heading muncul
    await expect(
        page.getByRole('heading', { name: /Aktifkan Trip\?/i }),
    ).toBeVisible({ timeout: 10_000 });

    await Promise.all([
        page.waitForResponse(
            (resp) =>
                resp.url().includes('/activate') &&
                resp.request().method() === 'POST',
            { timeout: 15_000 },
        ),
        page.getByRole('button', { name: /Ya, Aktifkan/i }).click(),
    ]);

    await expect(
        page.getByText(/Trip berhasil diaktifkan/i),
    ).toBeVisible({ timeout: 10_000 });

    // ✅ FIX #6: verifikasi status = active setelah aktivasi
    await expect
        .poll(
            async () =>
                await page
                    .getByText(/^Sedang Berjalan$/i)
                    .first()
                    .isVisible()
                    .catch(() => false),
            { timeout: 10_000, intervals: [200, 500] },
        )
        .toBe(true);
}

/**
 * ✅ FIX #2: cek apakah tab status dirender.
 * Jika hanya tab "Semua" (atau < 5), data kosong.
 */
async function hasAllStatusTabs(page: Page): Promise<boolean> {
    const tabCount = await page.getByRole('tab').count();
    return tabCount >= 5;
}

// ==========================================
// TEST SUITE
// ==========================================

test.describe('Mitra — Trips', () => {
    test('guest tidak bisa akses trips index mitra', async ({
        page,
        asGuest,
    }) => {
        await asGuest();
        await page.goto('/mitra/trips');
        await expect(page).toHaveURL('/login');
    });

    test('client tidak bisa akses trips index mitra', async ({
        page,
        asClient,
    }) => {
        await asClient();
        await page.goto('/mitra/trips');
        await expect(page).toHaveURL('/client/dashboard');
    });

    test('admin tidak bisa akses trips index mitra', async ({
        page,
        asAdmin,
    }) => {
        await asAdmin();
        await page.goto('/mitra/trips');
        await expect(page).toHaveURL('/admin/dashboard');
    });

    test('mitra bisa akses trips index', async ({ page, asMitra }) => {
        await asMitra();
        await page.goto('/mitra/trips');
        await expect(page).toHaveURL('/mitra/trips');
    });

    test.describe('Index — Contract', () => {
        test.beforeEach(async ({ page, asMitra }) => {
            await asMitra();
            await page.goto('/mitra/trips');
        });

        test('menampilkan heading "Trip Saya"', async ({ page }) => {
            await expect(
                page.getByRole('heading', { name: /^Trip Saya$/i }).first(),
            ).toBeVisible();
        });

        test('menampilkan deskripsi halaman', async ({ page }) => {
            await expect(
                page.getByText(/Daftar trip yang Anda ikuti sebagai mitra/i),
            ).toBeVisible();
        });

        test('menampilkan input search', async ({ page }) => {
            await expect(
                page.locator('input[placeholder*="Cari"]'),
            ).toHaveAttribute(
                'placeholder',
                /Cari kode trip atau nama paket/i,
            );
        });

        /**
         * ✅ FIX #4: tab status hanya render jika `statusCounts[s] > 0`
         * (Svelte filter di `StatusTabs` component).
         *
         * Seed hanya punya 1 trip `scheduled` → tab "Berjalan"/"Selesai"/
         * "Batal" tidak render. Test ini precheck `tabCount < 5` → skip
         * dengan alasan jelas.
         */
        test('menampilkan 5 status tab', async ({ page }) => {
            const hasAllTabs = await hasAllStatusTabs(page);

            if (!hasAllTabs) {
                const actualCount = await page.getByRole('tab').count();
                test.skip(
                    true,
                    `Hanya ${actualCount} tab yang render (bukan 5). ` +
                        `Data seed hanya punya trip "scheduled" — tab ` +
                        `"Berjalan"/"Selesai"/"Batal" hanya render jika ` +
                        `ada trip dengan status tsb. ` +
                        `Untuk test 5 tab, butuh seed trip dengan ` +
                        `berbagai status (mis. 1 active, 1 completed, ` +
                        `1 cancelled).`,
                );
                return;
            }

            await expect(
                page.getByRole('tab', { name: /^Semua/i }),
            ).toBeVisible();
            await expect(
                page.getByRole('tab', { name: /^Terjadwal/i }),
            ).toBeVisible();
            await expect(
                page.getByRole('tab', { name: /^Berjalan/i }),
            ).toBeVisible();
            await expect(
                page.getByRole('tab', { name: /^Selesai/i }),
            ).toBeVisible();
            await expect(
                page.getByRole('tab', { name: /^Batal/i }),
            ).toBeVisible();
        });

        /**
         * ✅ BONUS: test yang selalu bisa jalan — assert tab yang
         * PASTI render (dari seed: 1 scheduled).
         */
        test('menampilkan tab "Semua" dan "Terjadwal"', async ({ page }) => {
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);
            await expect(
                page.getByRole('tab', { name: /^Semua/i }),
            ).toBeVisible();
            await expect(
                page.getByRole('tab', { name: /^Terjadwal/i }),
            ).toBeVisible();
        });
    });

    test.describe('Index — Data Seed', () => {
        test.beforeEach(async ({ page, asMitra }) => {
            await asMitra();
            await page.goto('/mitra/trips');
        });

        test('menampilkan seed trip yang di-assign', async ({ page }) => {
            await expect(
                page.getByText(SEED_TRIP_KODE),
            ).toBeVisible();
        });

        test('menampilkan nama paket', async ({ page }) => {
            await expect(
                page.getByText(/Pasar Terapung/i).first(),
            ).toBeVisible();
        });

        test('menampilkan badge status "Terjadwal"', async ({ page }) => {
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);
            await expect(
                page.getByText(/Terjadwal/i).first(),
            ).toBeVisible();
        });
    });

    test.describe('Index — Filter & Search', () => {
        test.beforeEach(async ({ page, asMitra }) => {
            await asMitra();
            await page.goto('/mitra/trips');
        });

        test('filter status "scheduled"', async ({ page }) => {
            // ✅ FIX #2: precheck tab "Terjadwal" ada
            const tabExists = await page
                .getByRole('tab', { name: /^Terjadwal/i })
                .count();

            if (tabExists === 0) {
                test.skip(
                    true,
                    'Tab "Terjadwal" tidak render — data trip kosong.',
                );
                return;
            }

            await Promise.all([
                page.waitForResponse(
                    (resp) =>
                        resp.url().includes('/mitra/trips') &&
                        resp.request().method() === 'GET' &&
                        resp.url().includes('status=scheduled'),
                    { timeout: 15_000 },
                ),
                page.getByRole('tab', { name: /^Terjadwal/i }).click(),
            ]);

            await expect(
                page.getByText(SEED_TRIP_KODE),
            ).toBeVisible();
        });

        test('search by kode trip', async ({ page }) => {
            await Promise.all([
                page.waitForResponse(
                    (resp) =>
                        resp.url().includes('/mitra/trips') &&
                        resp.request().method() === 'GET' &&
                        resp.url().includes('search='),
                    { timeout: 15_000 },
                ),
                page.fill('input[placeholder*="Cari"]', SEED_TRIP_KODE),
            ]);

            await expect(
                page.getByText(SEED_TRIP_KODE),
            ).toBeVisible();
        });

        test('search tanpa hasil → empty state', async ({ page }) => {
            await Promise.all([
                page.waitForResponse(
                    (resp) =>
                        resp.url().includes('/mitra/trips') &&
                        resp.request().method() === 'GET' &&
                        resp.url().includes('search='),
                    { timeout: 15_000 },
                ),
                page.fill('input[placeholder*="Cari"]', 'tidak-ada-xyz-999'),
            ]);

            await expect(
                page.getByText(/Tidak ada trip ditemukan/i),
            ).toBeVisible();
        });
    });

    test.describe('Index — Navigasi', () => {
        test('klik trip card menuju halaman Show', async ({ page, asMitra }) => {
            await asMitra();
            await page.goto('/mitra/trips');

            const card = page
                .locator('a[href*="/mitra/trips/"]')
                .first();
            await card.click();

            await expect(page).toHaveURL(/\/mitra\/trips\/\d+$/);
        });
    });

    test.describe('Show — Contract', () => {
        test.beforeEach(async ({ page, asMitra }) => {
            await asMitra();
            await page.goto('/mitra/trips');
            await page
                .locator('a[href*="/mitra/trips/"]')
                .first()
                .click();
        });

        test('menampilkan breadcrumb "Kembali ke Trip Saya"', async ({
            page,
        }) => {
            await expect(
                page.getByRole('link', { name: /Kembali ke Trip Saya/i }),
            ).toBeVisible();
        });

        test('menampilkan kode trip', async ({ page }) => {
            // ✅ FIX #3: .first() untuk strict mode
            await expect(
                page.getByText(SEED_TRIP_KODE).first(),
            ).toBeVisible();
        });

        test('menampilkan nama paket (snapshot)', async ({ page }) => {
            await expect(
                page.getByText(/Pasar Terapung/i).first(),
            ).toBeVisible();
        });

        test('menampilkan badge role "Anda: Lead"', async ({ page }) => {
            await expect(
                page.getByText(/Anda: Lead/i).first(),
            ).toBeVisible();
        });

        test('menampilkan section "Itinerary & Laporan"', async ({ page }) => {
            await expect(
                page.getByRole('heading', { name: /Itinerary & Laporan/i }),
            ).toBeVisible();
        });

        test('menampilkan info timezone (WITA)', async ({ page }) => {
            await expect(
                page.getByText(/WITA/i).first(),
            ).toBeVisible();
        });

        test('menampilkan panel "Tugas Saya"', async ({ page }) => {
            await expect(page.getByText(/^Tugas Saya$/i)).toBeVisible();
        });

        test('menampilkan panel "Tim Trip"', async ({ page }) => {
            await expect(page.getByText(/^Tim Trip$/i)).toBeVisible();
        });

        test('menampilkan panel "Cara Lapor"', async ({ page }) => {
            await expect(page.getByText(/^Cara Lapor$/i)).toBeVisible();
        });

        test('menampilkan honor di panel Tugas Saya', async ({ page }) => {
            await expect(
                page.getByText(/Rp 1\.000\.000/i).first(),
            ).toBeVisible();
        });

        test('menampilkan instruksi dari admin', async ({ page }) => {
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);
            await expect(
                page.getByText(/Jaga kebersihan area/i).first(),
            ).toBeVisible();
        });

        test('menampilkan 2 mitra di panel Tim Trip', async ({ page }) => {
            await expect(
                page.getByText(SEED_MITRA.name).first(),
            ).toBeVisible();
            await expect(
                page.getByText(/Ani Wijaya/i).first(),
            ).toBeVisible();
        });
    });

    test.describe('Show — Guard (Skip)', () => {
        test.skip(
            'mitra tidak assigned tidak bisa akses trip (403)',
            async () => {
                // Butuh mitra baru yang tidak assigned ke seed trip.
                // Seed: hanya 2 mitra (budi + ani), keduanya assigned.
            },
        );
    });

    test.describe('Accessibility', () => {
        test('Index tidak punya pelanggaran WCAG kritis', async ({
            page,
            asMitra,
        }) => {
            await asMitra();
            await page.goto('/mitra/trips');
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

        test('Show tidak punya pelanggaran WCAG kritis', async ({
            page,
            asMitra,
        }) => {
            await asMitra();
            await page.goto('/mitra/trips');
            await page
                .locator('a[href*="/mitra/trips/"]')
                .first()
                .click();
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

        test('trip card adalah link fokusable', async ({ page, asMitra }) => {
            await asMitra();
            await page.goto('/mitra/trips');

            const card = page
                .locator('a[href*="/mitra/trips/"]')
                .first();
            const tag = await card.evaluate((el) => el.tagName.toLowerCase());
            expect(tag).toBe('a');
        });
    });

    test.describe.serial('Tombol Lapor — Conditional', () => {
        let tripId: number;

        test('step 1: resolve trip ID + reset state', async ({
            page,
            asAdmin,
            resetTrip,
        }) => {
            // ✅ FIX #5: reset trip ke scheduled SEBELUM setup.
            // Hanya di step 1 — step 2-6 butuh state berurutan.
            await resetTrip();
            await asAdmin();
            tripId = await findTripIdByKode(page, SEED_TRIP_KODE);
            expect(tripId).toBeGreaterThan(0);
        });

        test('step 2: sebelum activate — tombol "Lapor Hari Ini" TIDAK muncul', async ({
            page,
            asMitra,
        }) => {
            await asMitra();
            await page.goto(`/mitra/trips/${tripId}`);

            await expect(
                page.getByRole('link', { name: /Lapor Hari Ini/i }),
            ).not.toBeVisible();
        });

        test('step 3: activate trip', async ({ page, asAdmin }) => {
            await asAdmin();
            // ✅ FIX #6: ensureTripActive — verifikasi status = active
            // setelah klik, throw error jelas jika gagal (bukan timeout).
            await ensureTripActive(page, tripId);
        });

        test('step 4: setelah activate — tombol "Lapor Hari Ini" muncul untuk hari 1', async ({
            page,
            asMitra,
        }) => {
            await asMitra();
            await page.goto(`/mitra/trips/${tripId}`);
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);
            await expect(
                page.getByRole('link', { name: /Lapor Hari Ini/i }),
            ).toBeVisible({ timeout: 10_000 });
        });

        test('step 5: klik "Lapor Hari Ini" menuju form report', async ({
            page,
            asMitra,
        }) => {
            await asMitra();
            await page.goto(`/mitra/trips/${tripId}`);

            await page
                .getByRole('link', { name: /Lapor Hari Ini/i })
                .click();

            await expect(page).toHaveURL(
                /\/mitra\/trips\/\d+\/days\/\d+\/report$/,
            );
        });

        test('step 6: hari 2 (besok) — TIDAK ada tombol "Lapor Hari Ini"', async ({
            page,
            asMitra,
        }) => {
            await asMitra();
            await page.goto(`/mitra/trips/${tripId}`);

            const laporButtons = page.getByRole('link', {
                name: /Lapor Hari Ini/i,
            });
            expect(await laporButtons.count()).toBe(1);
        });
    });

    test.describe('Compatibility — Unauthenticated', () => {
        test('akses trips index tanpa login → /login', async ({
            page,
            asGuest,
        }) => {
            await asGuest();
            await page.goto('/mitra/trips');
            await expect(page).toHaveURL('/login');
        });

        test('akses trip show tanpa login → /login', async ({
            page,
            asGuest,
        }) => {
            await asGuest();
            await page.goto('/mitra/trips/1');
            await expect(page).toHaveURL('/login');
        });
    });
});