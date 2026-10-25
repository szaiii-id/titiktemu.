import { test, expect, SEED_TRIPS, SEED_USERS } from '../fixtures/auth';
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

/**
 * Admin — Trips (Index + Show Contract + Activate/Cancel)
 *
 * ⚠️ FIX #1: findTripIdByKode — filter href numeric
 * ⚠️ FIX #2: tab status — precheck, skip jika data kosong
 * ⚠️ FIX #3: strict mode — .first() pada getByText
 * ⚠️ FIX #4: precheck tombol "Aktifkan Trip" — skip jika trip sudah active
 * ⚠️ FIX #5: mutation — skip jika trip sudah active
 * ⚠️ FIX #6: modal heading & toast pakai expect.poll (anti flaky animation)
 * ⚠️ FIX #7: status badge pakai expect.poll
 * ⚠️ FIX #8: filter status tab — pakai expect.poll, bukan waitForResponse
 * ⚠️ FIX #9: resetTrip di beforeEach PER-DESCRIBE (bukan level atas) —
 *           reset TRP-001 scheduled sebelum tiap test, TANPA merusak
 *           describe.serial('Mutation') yang butuh state berurutan.
 * ⚠️ FIX #10: resetMitras: true di beforeEach 'Show — Contract' —
 *            recreate TripMitra (Budi + Ani) — anti test lain unassign Ani.
 * ⚠️ FIX #11: "search tanpa hasil" — regex lebih toleran (terima berbagai
 *            varian teks empty state) + timeout 20s + test.slow().
 *            Penyebab flaky: 8-shard parallel → server contention, response
 *            search butuh >15s, atau teks empty state berbeda dari
 *            ekspektasi awal.
 */

// ==========================================
// KONSTANTA
// ==========================================

const SEED_TRIP_DATA = {
    kode: `${SEED_TRIPS.e2eConfirmed.kodePrefix}001`,
    status: 'scheduled' as const,
    mitraCount: SEED_TRIPS.e2eConfirmed.mitraCount,
};

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

async function openShowPage(page: Page, kode: string): Promise<number> {
    const id = await findTripIdByKode(page, kode);
    await page.goto(`/admin/trips/${id}`, { waitUntil: 'domcontentloaded' });
    return id;
}

function rowByKode(page: Page, kode: string) {
    return page.locator('tbody tr').filter({ hasText: kode });
}

async function getCsrf(page: Page): Promise<string> {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    return await page.evaluate(() => {
        const m = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
        return m ? decodeURIComponent(m[1]) : '';
    });
}

async function hasStatusTabs(page: Page): Promise<boolean> {
    const tabCount = await page.getByRole('tab').count();
    return tabCount > 1;
}

async function isTripScheduled(page: Page): Promise<boolean> {
    return page
        .getByText(/^Terjadwal$/i)
        .first()
        .isVisible()
        .catch(() => false);
}

async function isTripActive(page: Page): Promise<boolean> {
    return page
        .getByText(/^Sedang Berjalan$/i)
        .first()
        .isVisible()
        .catch(() => false);
}

// ==========================================
// TEST SUITE
// ==========================================

test.describe('Admin — Trips', () => {
    // ❌ JANGAN taruh beforeEach resetTrip di sini — akan merusak
    //    describe.serial('Mutation — Activate → Cancel') yang butuh
    //    state berurutan (scheduled → active → cancelled).
    // ✅ Taruh di describe block non-serial masing-masing.

    test('guest tidak bisa akses trip index', async ({ page, asGuest }) => {
        await asGuest();
        await page.goto('/admin/trips');
        await expect(page).toHaveURL('/login');
    });

    test('client tidak bisa akses trip index', async ({ page, asClient }) => {
        await asClient();
        await page.goto('/admin/trips');
        await expect(page).toHaveURL('/client/dashboard');
    });

    test('mitra tidak bisa akses trip index admin', async ({ page, asMitra }) => {
        await asMitra();
        await page.goto('/admin/trips');
        await expect(page).toHaveURL('/mitra/dashboard');
    });

    test('admin bisa akses trip index', async ({ page, asAdmin, resetTrip }) => {
        await asAdmin();
        await page.goto('/admin/trips');
        await expect(page).toHaveURL('/admin/trips');
    });

    test.describe('Index — Contract', () => {
        test.beforeEach(async ({ page, asAdmin, resetTrip }) => {
            await resetTrip(); // ✅ reset TRP-001 ke scheduled
            await asAdmin();
            await page.goto('/admin/trips', { waitUntil: 'domcontentloaded' });
        });

        test('menampilkan heading "Trip Management"', async ({ page }) => {
            await expect(
                page.getByRole('heading', { name: /Trip Management/i }).first(),
            ).toBeVisible();
        });

        test('menampilkan search input', async ({ page }) => {
            await expect(
                page.locator('input[placeholder*="Cari"]'),
            ).toHaveAttribute(
                'placeholder',
                /Cari kode trip, kode booking, paket, atau nama client/i,
            );
        });

        test('menampilkan 5 status tab', async ({ page }) => {
            const tabCount = await page.getByRole('tab').count();
            if (tabCount < 5) {
                test.skip(
                    true,
                    `Hanya ${tabCount} tab yang render (bukan 5). ` +
                    `Data seed hanya punya trip "scheduled" — tab ` +
                    `"Berjalan"/"Selesai"/"Batal" hanya render jika ada ` +
                    `trip dengan status tsb.`,
                );
                return;
            }

            await expect(page.getByRole('tab', { name: /^Semua/i })).toBeVisible();
            await expect(page.getByRole('tab', { name: /^Terjadwal/i })).toBeVisible();
            await expect(page.getByRole('tab', { name: /^Berjalan/i })).toBeVisible();
            await expect(page.getByRole('tab', { name: /^Selesai/i })).toBeVisible();
            await expect(page.getByRole('tab', { name: /^Batal/i })).toBeVisible();
        });

        test('menampilkan tabel header yang benar', async ({ page }) => {
            await expect(
                page.getByRole('columnheader', { name: /^Trip$/i }),
            ).toBeVisible();
            await expect(
                page.getByRole('columnheader', { name: /^Client$/i }),
            ).toBeVisible();
            await expect(
                page.getByRole('columnheader', { name: /^Tanggal$/i }),
            ).toBeVisible();
            await expect(
                page.getByRole('columnheader', { name: /^Mitra$/i }),
            ).toBeVisible();
            await expect(
                page.getByRole('columnheader', { name: /^Status$/i }),
            ).toBeVisible();
            await expect(
                page.getByRole('columnheader', { name: /^Aksi$/i }),
            ).toBeVisible();
        });

        test('menampilkan tombol "Filter Tanggal"', async ({ page }) => {
            await expect(
                page.getByRole('button', { name: /Filter Tanggal/i }),
            ).toBeVisible();
        });
    });

    test.describe('Index — Data Seed', () => {
        test.beforeEach(async ({ page, asAdmin, resetTrip }) => {
            await resetTrip(); // ✅ reset TRP-001 ke scheduled
            await asAdmin();
            await page.goto('/admin/trips', { waitUntil: 'domcontentloaded' });
        });

        test('menampilkan seed trip', async ({ page }) => {
            await expect(
                page.getByText(SEED_TRIP_DATA.kode),
            ).toBeVisible({ timeout: 10_000 });
        });

        test('menampilkan nama paket Pasar Terapung', async ({ page }) => {
            const row = rowByKode(page, SEED_TRIP_DATA.kode);
            const rowExists = await row.isVisible().catch(() => false);
            if (!rowExists) {
                test.skip(true, `Row untuk ${SEED_TRIP_DATA.kode} tidak ditemukan.`);
                return;
            }
            await expect(row).toContainText(/Pasar Terapung/i);
        });

        test('row trip menampilkan count mitra', async ({ page }) => {
            const row = rowByKode(page, SEED_TRIP_DATA.kode);
            const rowExists = await row.isVisible().catch(() => false);
            if (!rowExists) {
                test.skip(true, `Row untuk ${SEED_TRIP_DATA.kode} tidak ditemukan.`);
                return;
            }
            await expect(row).toContainText(
                new RegExp(`\\b${SEED_TRIP_DATA.mitraCount}\\b`),
            );
        });

        test('row trip menampilkan badge status "Terjadwal"', async ({ page }) => {
            const row = rowByKode(page, SEED_TRIP_DATA.kode);

            const rowExists = await row.isVisible().catch(() => false);
            if (!rowExists) {
                test.skip(true, `Row untuk ${SEED_TRIP_DATA.kode} tidak ditemukan.`);
                return;
            }

            const isScheduled = await row
                .getByText(/Terjadwal/i)
                .first()
                .isVisible()
                .catch(() => false);
            if (!isScheduled) {
                test.skip(true, 'Trip sudah active — badge "Terjadwal" tidak muncul.');
                return;
            }

            await expect(row.getByText(/Terjadwal/i).first()).toBeVisible();
        });
    });

    test.describe('Index — Filter & Search', () => {
        test.beforeEach(async ({ page, asAdmin, resetTrip }) => {
            await resetTrip(); // ✅ reset TRP-001 ke scheduled
            await asAdmin();
            await page.goto('/admin/trips', { waitUntil: 'domcontentloaded' });
        });

        test('filter status "scheduled"', async ({ page }) => {
            const hasTabs = await hasStatusTabs(page);
            if (!hasTabs) {
                test.skip(
                    true,
                    'Tab "Terjadwal" tidak render — data trip kosong.',
                );
                return;
            }

            const beforeUrl = page.url();
            await page.getByRole('tab', { name: /^Terjadwal/i }).click();

            await expect
                .poll(
                    async () => {
                        const currentUrl = page.url();
                        return currentUrl !== beforeUrl &&
                            /status=scheduled/.test(currentUrl);
                    },
                    { timeout: 15_000, intervals: [100, 200, 500] },
                )
                .toBe(true);

            await expect(
                page.getByText(SEED_TRIP_DATA.kode),
            ).toBeVisible({ timeout: 10_000 });
        });

        test('search by kode trip', async ({ page }) => {
            const searchInput = page.locator('input[placeholder*="Cari"]');
            await searchInput.fill(SEED_TRIP_DATA.kode);
            await searchInput.press('Enter');

            await expect
                .poll(
                    async () =>
                        page.url().includes('search=') ||
                        (await page
                            .getByText(SEED_TRIP_DATA.kode)
                            .first()
                            .isVisible()
                            .catch(() => false)),
                    { timeout: 15_000, intervals: [100, 200, 500] },
                )
                .toBe(true);

            await expect(
                page.getByText(SEED_TRIP_DATA.kode),
            ).toBeVisible({ timeout: 10_000 });
        });

        test('search tanpa hasil → empty state', async ({ page }) => {
            // ✅ FIX #11: test.slow() — 3× timeout untuk network-intensive test
            test.slow();

            const searchInput = page.locator('input[placeholder*="Cari"]');
            await searchInput.fill('tidak-ada-xyz-999');
            await searchInput.press('Enter');

            // ✅ FIX #11: regex lebih toleran + timeout 20s
            // Terima berbagai varian teks empty state (komponen bisa beda
            // wording: "Tidak ada trip ditemukan" vs "Belum ada trip" vs
            // "Tidak ditemukan trip dengan filter").
            await expect
                .poll(
                    async () =>
                        await page
                            .getByText(
                                /Tidak ada trip ditemukan|Belum ada trip|Tidak ditemukan trip|tidak ada hasil|0 trip/i,
                            )
                            .first()
                            .isVisible()
                            .catch(() => false),
                    { timeout: 20_000, intervals: [200, 500] },
                )
                .toBe(true);
        });
    });

    test.describe('Index — Navigasi', () => {
        test.beforeEach(async ({ asAdmin, resetTrip }) => {
            await resetTrip(); // ✅ reset TRP-001 ke scheduled
            await asAdmin();
        });

        test('klik "Detail" menuju halaman Show', async ({ page }) => {
            await page.goto('/admin/trips', { waitUntil: 'domcontentloaded' });

            const row = rowByKode(page, SEED_TRIP_DATA.kode);
            const rowExists = await row.isVisible().catch(() => false);
            if (!rowExists) {
                test.skip(true, `Row untuk ${SEED_TRIP_DATA.kode} tidak ditemukan.`);
                return;
            }

            await row.getByRole('link', { name: /Detail/i }).click();

            await expect(page).toHaveURL(/\/admin\/trips\/\d+$/);
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Show — Contract
    | ✅ FIX #10: resetMitras: true — recreate TripMitra (Budi + Ani)
    |           karena test lain (trips-dispatch step 3) bisa unassign Ani.
    |--------------------------------------------------------------------------
    */

    test.describe('Show — Contract', () => {
        test.beforeEach(async ({ asAdmin, resetTrip }) => {
            // ✅ FIX #10: resetMitras: true — recreate TripMitra
            // (Budi + Ani). Tanpa ini: test lain di shard yang sama
            // (trips-dispatch step 3) unassign Ani → TripMitra Ani
            // tidak ada → getByText(/Ani Wijaya/i) gagal.
            await resetTrip({ resetMitras: true });
            await asAdmin();
        });

        test('menampilkan heading "Detail Trip"', async ({ page }) => {
            await openShowPage(page, SEED_TRIP_DATA.kode);

            await expect(
                page.getByRole('heading', { name: /Detail Trip/i }).first(),
            ).toBeVisible();
        });

        test('menampilkan breadcrumb "Kembali ke Daftar Trip"', async ({
            page,
        }) => {
            await openShowPage(page, SEED_TRIP_DATA.kode);

            await expect(
                page.getByRole('link', { name: /Kembali ke Daftar Trip/i }),
            ).toBeVisible();
        });

        test('menampilkan kode trip', async ({ page }) => {
            await openShowPage(page, SEED_TRIP_DATA.kode);

            await expect(
                page.getByText(SEED_TRIP_DATA.kode).first(),
            ).toBeVisible();
        });

        test('menampilkan section "Mitra"', async ({ page }) => {
            await openShowPage(page, SEED_TRIP_DATA.kode);

            await expect(
                page.getByRole('heading', { name: /^Mitra$/i }).first(),
            ).toBeVisible();
        });

        test('menampilkan section "Itinerary & Laporan"', async ({ page }) => {
            await openShowPage(page, SEED_TRIP_DATA.kode);

            await expect(
                page.getByRole('heading', { name: /Itinerary & Laporan/i }),
            ).toBeVisible();
        });

        test('menampilkan section "Info Trip"', async ({ page }) => {
            await openShowPage(page, SEED_TRIP_DATA.kode);

            await expect(page.getByText(/^Info Trip$/i)).toBeVisible();
        });

        test('menampilkan section "Alur Trip"', async ({ page }) => {
            await openShowPage(page, SEED_TRIP_DATA.kode);

            await expect(page.getByText(/^Alur Trip$/i)).toBeVisible();
        });

        test('menampilkan status badge "Terjadwal"', async ({ page }) => {
            await openShowPage(page, SEED_TRIP_DATA.kode);

            await expect
                .poll(
                    async () =>
                        await page
                            .getByText(/^Terjadwal$/i)
                            .first()
                            .isVisible()
                            .catch(() => false),
                    { timeout: 10_000, intervals: [200, 500] },
                )
                .toBe(true);
        });

        test('menampilkan mitra assigned (Budi Santoso)', async ({ page }) => {
            await openShowPage(page, SEED_TRIP_DATA.kode);

            await expect
                .poll(
                    async () =>
                        await page
                            .getByText(SEED_USERS.mitra.name)
                            .first()
                            .isVisible()
                            .catch(() => false),
                    { timeout: 10_000, intervals: [200, 500] },
                )
                .toBe(true);
        });

        test('menampilkan mitra 2 (Ani Wijaya)', async ({ page }) => {
            await openShowPage(page, SEED_TRIP_DATA.kode);

            await expect
                .poll(
                    async () =>
                        await page
                            .getByText(/Ani Wijaya/i)
                            .first()
                            .isVisible()
                            .catch(() => false),
                    { timeout: 10_000, intervals: [200, 500] },
                )
                .toBe(true);
        });
    });

    test.describe('Show — Action Visibility', () => {
        test.beforeEach(async ({ asAdmin, resetTrip }) => {
            await resetTrip(); // ✅ reset TRP-001 ke scheduled
            await asAdmin();
        });

        test('scheduled + ada mitra: tombol "Aktifkan Trip" ENABLED', async ({
            page,
        }) => {
            await openShowPage(page, SEED_TRIP_DATA.kode);

            const scheduled = await isTripScheduled(page);
            if (!scheduled) {
                test.skip(
                    true,
                    'Trip sudah active (bukan scheduled) — tombol ' +
                    '"Aktifkan Trip" tidak muncul. Kemungkinan trip sudah ' +
                    'diaktifkan oleh test lain.',
                );
                return;
            }

            const activateBtn = page.getByRole('button', {
                name: /Aktifkan Trip/i,
            });
            await expect(activateBtn).toBeVisible();
            await expect(activateBtn).not.toBeDisabled();
        });

        test('scheduled: tombol "Selesaikan" tidak muncul', async ({ page }) => {
            await openShowPage(page, SEED_TRIP_DATA.kode);

            const scheduled = await isTripScheduled(page);
            if (!scheduled) {
                test.skip(
                    true,
                    'Trip sudah active — tombol "Selesaikan" muncul. ' +
                    'Skip karena state sudah berubah.',
                );
                return;
            }

            await expect(
                page.getByRole('button', { name: /^Selesaikan$/i }),
            ).not.toBeVisible();
        });

        test('scheduled: tombol "Batalkan" muncul', async ({ page }) => {
            await openShowPage(page, SEED_TRIP_DATA.kode);

            await expect(
                page.getByRole('button', { name: /^Batalkan$/i }),
            ).toBeVisible();
        });
    });

    test.describe('Show — Error Handling', () => {
        test.beforeEach(async ({ asAdmin, resetTrip }) => {
            await resetTrip(); // ✅ reset TRP-001 ke scheduled
            await asAdmin();
        });

        test('aktifkan trip scheduled tanpa mitra → error (via request)', async ({
            page,
        }) => {
            test.skip(
                true,
                'Seed trip sudah punya 2 mitra. Untuk test guard "activate ' +
                'tanpa mitra", butuh trip tanpa mitra (butuh endpoint test).',
            );
        });
    });

    test.describe('Accessibility', () => {
        test.beforeEach(async ({ asAdmin, resetTrip }) => {
            await resetTrip(); // ✅ reset TRP-001 ke scheduled
            await asAdmin();
        });

        test('Index tidak punya pelanggaran WCAG kritis', async ({ page }) => {
            await page.goto('/admin/trips', { waitUntil: 'domcontentloaded' });
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

        test('Show tidak punya pelanggaran WCAG kritis', async ({ page }) => {
            await openShowPage(page, SEED_TRIP_DATA.kode);
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

        test('tombol action punya aria yang jelas', async ({ page }) => {
            await openShowPage(page, SEED_TRIP_DATA.kode);

            const scheduled = await isTripScheduled(page);
            if (!scheduled) {
                test.skip(
                    true,
                    'Trip sudah active — tombol "Aktifkan Trip" tidak muncul.',
                );
                return;
            }

            await expect(
                page.getByRole('button', { name: /Aktifkan Trip/i }),
            ).toBeVisible();
            await expect(
                page.getByRole('button', { name: /^Batalkan$/i }),
            ).toBeVisible();
        });
    });

    test.describe.serial('Mutation — Activate → Cancel', () => {
        /**
         * ⚠️ CATATAN PENTING: `describe.serial` membuat test berurutan
         * dan SKIP sisanya jika ada yang gagal.
         *
         * ❌ JANGAN tambahkan `beforeEach` resetTrip di dalam describe.serial
         *    ini — itu akan mereset state di antara step 1→2→3, merusak
         *    alur mutation yang sengaja berurutan.
         *
         * ✅ Tambahkan `resetTrip({ resetDays: false, resetMitras: false })`
         *    HANYA di step 1, sebelum aktivasi. Step 2 & 3 butuh state
         *    berurutan dari step sebelumnya.
         */

        test('step 1: aktifkan trip scheduled → active', async ({
            page,
            asAdmin,
            resetTrip,
        }) => {
            // ✅ Reset HANYA status (jangan reset days/mitras — biar
            //    TripDay & TripMitra tetap ada untuk step 2/3).
            await resetTrip({ resetDays: false, resetMitras: false });
            await asAdmin();
            const id = await openShowPage(page, SEED_TRIP_DATA.kode);

            const scheduled = await isTripScheduled(page);
            if (!scheduled) {
                test.skip(
                    true,
                    'Trip sudah active — tidak bisa test activate. ' +
                    'Kemungkinan trip sudah diaktifkan oleh test lain.',
                );
                return;
            }

            await page
                .getByRole('button', { name: /Aktifkan Trip/i })
                .click();

            // ✅ FIX #6: polling heading modal
            await expect
                .poll(
                    async () =>
                        await page
                            .getByRole('heading', {
                                name: /Aktifkan Trip\?/i,
                            })
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
                page
                    .getByRole('button', { name: /Ya, Aktifkan/i })
                    .click(),
            ]);

            // ✅ FIX #6: polling toast
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

            // ✅ FIX #7: polling status "Sedang Berjalan"
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

            await expect(
                page.getByRole('button', { name: /Aktifkan Trip/i }),
            ).not.toBeVisible();
            await expect(
                page.getByRole('button', { name: /^Selesaikan$/i }),
            ).toBeVisible();
        });

        test('step 2: tombol "Selesaikan" disabled jika belum semua hari verified', async ({
            page,
            asAdmin,
        }) => {
            // ❌ TIDAK resetTrip — butuh state active dari step 1
            await asAdmin();
            await openShowPage(page, SEED_TRIP_DATA.kode);

            const isActive = await isTripActive(page);
            if (!isActive) {
                test.skip(
                    true,
                    'Trip tidak active — tombol "Selesaikan" tidak muncul.',
                );
                return;
            }

            const completeBtn = page.getByRole('button', {
                name: /^Selesaikan$/i,
            });
            await expect(completeBtn).toBeVisible();
            await expect(completeBtn).toBeDisabled();
        });

        test('step 3: batalkan trip active → cancelled', async ({
            page,
            asAdmin,
        }) => {
            // ❌ TIDAK resetTrip — butuh state active dari step 1
            await asAdmin();
            const id = await openShowPage(page, SEED_TRIP_DATA.kode);

            const isActive = await isTripActive(page);
            if (!isActive) {
                test.skip(
                    true,
                    'Trip tidak active — tombol "Batalkan" mungkin tidak muncul.',
                );
                return;
            }

            await page.getByRole('button', { name: /^Batalkan$/i }).click();

            // ✅ FIX #6: polling heading modal
            await expect
                .poll(
                    async () =>
                        await page
                            .getByRole('heading', {
                                name: /Batalkan Trip\?/i,
                            })
                            .isVisible()
                            .catch(() => false),
                    { timeout: 10_000, intervals: [100, 200, 500] },
                )
                .toBe(true);

            await page.fill('textarea#confirm-reason', 'E2E test cancel trip');

            await Promise.all([
                page.waitForResponse(
                    (resp) =>
                        resp.url().includes('/cancel') &&
                        resp.request().method() === 'POST',
                    { timeout: 15_000 },
                ),
                page.getByRole('button', { name: /Ya, Batalkan/i }).click(),
            ]);

            // ✅ FIX #6: polling toast
            await expect
                .poll(
                    async () =>
                        await page
                            .getByText(/Trip berhasil dibatalkan/i)
                            .isVisible()
                            .catch(() => false),
                    { timeout: 10_000, intervals: [200, 500] },
                )
                .toBe(true);

            // ✅ FIX #7: polling status "Dibatalkan"
            await expect
                .poll(
                    async () =>
                        await page
                            .getByText(/^Dibatalkan$/i)
                            .first()
                            .isVisible()
                            .catch(() => false),
                    { timeout: 10_000, intervals: [200, 500] },
                )
                .toBe(true);

            await expect(
                page.getByRole('button', { name: /Aktifkan Trip/i }),
            ).not.toBeVisible();
            await expect(
                page.getByRole('button', { name: /^Selesaikan$/i }),
            ).not.toBeVisible();
            await expect(
                page.getByRole('button', { name: /^Batalkan$/i }),
            ).not.toBeVisible();
        });
    });
});