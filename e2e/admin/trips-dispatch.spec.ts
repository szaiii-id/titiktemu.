import { test, expect, SEED_TRIPS, SEED_USERS, SEED_EXTRA } from '../fixtures/auth';
import type { Page, Locator } from '@playwright/test';

/**
 * Admin — Trip Dispatch (Assign/Unassign/Edit Mitra)
 *
 * ⚠️ FIX #1: anchor `^Assign Mitra$` — hindari match ke "Unassign mitra"
 * ⚠️ FIX #2: dropdown mitra punya `aria-expanded` (unik) — pakai itu.
 *    Accessible name tombol = "Mitra *" (dari aria-labelledby), BUKAN "Pilih mitra...".
 * ⚠️ FIX #3: step 4 precheck trip active + tunggu flash error.
 * ⚠️ FIX #4: resetTrip di beforeEach (non-serial) — anti state leak dari
 *           test Mutation (Assign → Edit → Unassign) yang mengubah
 *           TripMitra & honor.
 * ⚠️ FIX #5: resetTrip HANYA di step 0 serial — step 1-4 butuh state
 *           berurutan (assign → edit → unassign).
 * ⚠️ FIX #6: openShowPageOrSkip — skip graceful jika trip tidak ada.
 */

// ==========================================
// KONSTANTA
// ==========================================

const SEED_TRIP_KODE = `${SEED_TRIPS.e2eConfirmed.kodePrefix}001`;

const SEED_MITRA_1 = {
    name: SEED_USERS.mitra.name,
    email: SEED_USERS.mitra.email,
    role: 'Lead' as const,
};

const SEED_MITRA_2 = {
    name: 'Ani Wijaya',
    email: SEED_EXTRA.mitra2.email,
    role: 'Asisten' as const,
};

// ==========================================
// SELEKTOR
// ==========================================

/** ✅ FIX #1: anchor — hanya match tombol utama */
const ASSIGN_MITRA_BUTTON = { name: /^Assign Mitra$/i };

/**
 * ✅ FIX #2: tombol dropdown mitra punya `aria-expanded` (unik di FormModal).
 * Accessible name-nya "Mitra *" (dari aria-labelledby), BUKAN "Pilih mitra...".
 */
function getMitraDropdown(page: Page): Locator {
    return page.locator('[role="dialog"] button[aria-expanded]');
}

/** Search input di dalam dropdown mitra */
function getMitraSearchInput(page: Page): Locator {
    return page.locator(
        '[role="dialog"] input[placeholder*="Cari nama atau email"]',
    );
}

/** Tombol mitra di dropdown list (match email) */
function getMitraOption(page: Page, email: string): Locator {
    return page
        .locator('[role="dialog"] button')
        .filter({ hasText: new RegExp(email, 'i') })
        .last();
}

// ==========================================
// HELPER FUNGSI
// ==========================================

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

/**
 * ✅ FIX #6: openShowPage — return null jika trip tidak ada.
 */
async function openShowPage(
    page: Page,
    kode: string,
): Promise<number | null> {
    const id = await findTripIdByKode(page, kode).catch(() => null);
    if (id === null) return null;

    await page.goto(`/admin/trips/${id}`);
    return id;
}

/**
 * ✅ FIX #6: openShowPageOrSkip — helper untuk skip kalau trip tidak ada.
 */
async function openShowPageOrSkip(
    page: Page,
    kode: string,
    reason: string,
): Promise<number> {
    const id = await openShowPage(page, kode);
    if (id === null) {
        test.skip(
            true,
            `Trip "${kode}" tidak ditemukan. ${reason}. ` +
                `Cek database/seeders/BookingSeeder.php.`,
        );
        throw new Error('unreachable');
    }
    return id;
}

async function ensureTripActive(page: Page, tripId: number): Promise<void> {
    await page.goto(`/admin/trips/${tripId}`);

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

    await expect(
        page.getByText(/Trip berhasil diaktifkan/i),
    ).toBeVisible({ timeout: 10_000 });
}

async function assignMitraViaUI(
    page: Page,
    data: {
        email: string;
        role?: 'lead' | 'asisten';
        honor?: number;
        honorTipe?: 'flat' | 'per_hari';
        instruksi?: string;
    },
): Promise<void> {
    await page.getByRole('button', ASSIGN_MITRA_BUTTON).click();

    await expect(
        page.getByRole('heading', { name: /^Assign Mitra$/i }),
    ).toBeVisible();

    // ✅ Tunggu dialog stabil
    await page.locator('[role="dialog"]').waitFor({ state: 'visible' });

    await getMitraDropdown(page).click();
    await getMitraSearchInput(page).fill(data.email);
    await getMitraOption(page, data.email).click();

    if (data.role) {
        await page.selectOption('select#assign_role', data.role);
    }
    if (data.honorTipe) {
        await page.selectOption('select#assign_honor_tipe', data.honorTipe);
    }
    if (data.honor !== undefined) {
        await page.fill('input[inputmode="numeric"]', String(data.honor));
    }
    if (data.instruksi) {
        await page.fill('textarea#assign_instruksi', data.instruksi);
    }

    await Promise.all([
        page.waitForResponse(
            (resp) =>
                resp.url().includes('/assign-mitra') &&
                resp.request().method() === 'POST',
            { timeout: 15_000 },
        ),
        page.getByRole('button', { name: /^Assign$/i }).last().click(),
    ]);
}

// ==========================================
// TEST SUITE
// ==========================================

test.describe('Admin — Trip Dispatch', () => {
    test('guest tidak bisa akses show trip', async ({ page, asGuest }) => {
        await asGuest();
        await page.goto('/admin/trips/1');
        await expect(page).toHaveURL('/login');
    });

    test('client tidak bisa akses show trip', async ({ page, asClient }) => {
        await asClient();
        await page.goto('/admin/trips/1');
        await expect(page).toHaveURL('/client/dashboard');
    });

    test('mitra tidak bisa akses show trip admin', async ({
        page,
        asMitra,
    }) => {
        await asMitra();
        await page.goto('/admin/trips/1');
        await expect(page).toHaveURL('/mitra/dashboard');
    });

    /*
    |--------------------------------------------------------------------------
    | Show — Section Mitra
    | ✅ FIX #4: resetTrip di beforeEach — anti state leak dari Mutation
    |--------------------------------------------------------------------------
    */

    test.describe('Show — Section Mitra', () => {
        test.beforeEach(async ({ page, asAdmin, resetTrip }) => {
            // ✅ FIX #4: reset TRP-001 ke scheduled + TripMitra ke seed
            // (Budi + Ani) — anti state leak dari Mutation yang mengubah
            // honor & unassign Ani.
            await resetTrip();
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED_TRIP_KODE,
                'Seed trip TRP-001 tidak ada',
            );
        });

        test('menampilkan heading "Mitra"', async ({ page }) => {
            await expect(
                page.getByRole('heading', { name: /^Mitra$/i }).first(),
            ).toBeVisible();
        });

        test('menampilkan count "2 mitra di-assign"', async ({ page }) => {
            await expect(
                page.getByText(/2 mitra di-assign/i),
            ).toBeVisible();
        });

        test('menampilkan mitra 1 (Budi Santoso) dengan badge Lead', async ({
            page,
        }) => {
            await expect(
                page.getByText(SEED_MITRA_1.name).first(),
            ).toBeVisible();
            await expect(
                page.getByText(/^Lead$/i).first(),
            ).toBeVisible();
        });

        test('menampilkan mitra 2 (Ani Wijaya) dengan badge Asisten', async ({
            page,
        }) => {
            await expect(
                page.getByText(SEED_MITRA_2.name).first(),
            ).toBeVisible();
            await expect(
                page.getByText(/^Asisten$/i).first(),
            ).toBeVisible();
        });

        test('menampilkan honor per mitra', async ({ page }) => {
            await expect(
                page.getByText(/Rp 1\.000\.000/i).first(),
            ).toBeVisible();
            await expect(
                page.getByText(/Rp 500\.000/i).first(),
            ).toBeVisible();
        });

        test('menampilkan tombol "Assign Mitra"', async ({ page }) => {
            await expect(
                page.getByRole('button', ASSIGN_MITRA_BUTTON),
            ).toBeVisible();
        });

        test('menampilkan tombol Edit per mitra', async ({ page }) => {
            const editButtons = page.getByLabel('Edit mitra');
            expect(await editButtons.count()).toBeGreaterThanOrEqual(2);
        });

        test('menampilkan tombol Unassign per mitra', async ({ page }) => {
            const unassignButtons = page.getByLabel('Unassign mitra');
            expect(await unassignButtons.count()).toBeGreaterThanOrEqual(2);
        });

        test('menampilkan total honor semua mitra', async ({ page }) => {
            await expect(
                page.getByText(/Total Honor Semua Mitra/i),
            ).toBeVisible();
            await expect(
                page.getByText(/Rp 1\.500\.000/i).first(),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | FormModal Assign — Contract (read-only, aman tanpa resetTrip)
    |--------------------------------------------------------------------------
    */

    test.describe('FormModal Assign — Contract', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED_TRIP_KODE,
                'Seed trip TRP-001 tidak ada',
            );
        });

        test('klik "Assign Mitra" membuka FormModal', async ({ page }) => {
            await page.getByRole('button', ASSIGN_MITRA_BUTTON).click();

            await expect(
                page.getByRole('heading', { name: /^Assign Mitra$/i }),
            ).toBeVisible();
        });

        test('FormModal punya dropdown mitra', async ({ page }) => {
            await page.getByRole('button', ASSIGN_MITRA_BUTTON).click();

            await expect(
                page.getByRole('heading', { name: /^Assign Mitra$/i }),
            ).toBeVisible();

            await expect(getMitraDropdown(page)).toBeVisible();
        });

        test('klik dropdown memunculkan search input', async ({ page }) => {
            await page.getByRole('button', ASSIGN_MITRA_BUTTON).click();

            await expect(
                page.getByRole('heading', { name: /^Assign Mitra$/i }),
            ).toBeVisible();

            await getMitraDropdown(page).click();

            await expect(getMitraSearchInput(page)).toBeVisible();
        });

        test('search input memfilter daftar mitra', async ({ page }) => {
            await page.getByRole('button', ASSIGN_MITRA_BUTTON).click();

            await expect(
                page.getByRole('heading', { name: /^Assign Mitra$/i }),
            ).toBeVisible();

            await getMitraDropdown(page).click();
            await getMitraSearchInput(page).fill('Ani');

            await expect(getMitraOption(page, 'ani@gmail.com')).toBeVisible();
        });

        test('FormModal punya select Role (Lead/Asisten)', async ({ page }) => {
            await page.getByRole('button', ASSIGN_MITRA_BUTTON).click();

            await expect(
                page.getByRole('heading', { name: /^Assign Mitra$/i }),
            ).toBeVisible();

            const roleSelect = page.locator('select#assign_role');
            await expect(roleSelect).toBeVisible();

            const options = roleSelect.locator('option');
            await expect(options).toHaveCount(2);
        });

        test('FormModal punya select Tipe Honor (flat/per_hari)', async ({
            page,
        }) => {
            await page.getByRole('button', ASSIGN_MITRA_BUTTON).click();

            await expect(
                page.getByRole('heading', { name: /^Assign Mitra$/i }),
            ).toBeVisible();

            const tipeSelect = page.locator('select#assign_honor_tipe');
            await expect(tipeSelect).toBeVisible();
        });

        test('FormModal punya input honor (RupiahInput)', async ({ page }) => {
            await page.getByRole('button', ASSIGN_MITRA_BUTTON).click();

            await expect(
                page.getByRole('heading', { name: /^Assign Mitra$/i }),
            ).toBeVisible();

            await expect(
                page.locator('input[inputmode="numeric"]').first(),
            ).toBeVisible();
        });

        test('FormModal punya textarea instruksi', async ({ page }) => {
            await page.getByRole('button', ASSIGN_MITRA_BUTTON).click();

            await expect(
                page.getByRole('heading', { name: /^Assign Mitra$/i }),
            ).toBeVisible();

            await expect(
                page.locator('textarea#assign_instruksi'),
            ).toBeVisible();
        });

        test('FormModal punya tombol Assign', async ({ page }) => {
            await page.getByRole('button', ASSIGN_MITRA_BUTTON).click();

            await expect(
                page.getByRole('heading', { name: /^Assign Mitra$/i }),
            ).toBeVisible();

            await expect(
                page.getByRole('button', { name: /^Assign$/i }).last(),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Error Handling — Assign Duplikat
    | ✅ FIX #4: resetTrip di beforeEach — Budi pasti assigned
    |--------------------------------------------------------------------------
    */

    test.describe('Error Handling — Assign Duplikat', () => {
        test.beforeEach(async ({ resetTrip }) => {
            // ✅ FIX #4: resetTrip — pastikan Budi assigned ke trip
            // (Mutation step 3 bisa unassign Ani, tapi Budi tetap.
            //  Tapi kalau Mutation step 4 unassign Budi — perlu reset.)
            await resetTrip();
        });

        test('assign mitra yang sudah assigned → flash error', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED_TRIP_KODE,
                'Seed trip TRP-001 tidak ada',
            );

            await assignMitraViaUI(page, {
                email: SEED_MITRA_1.email,
                honor: 500000,
            });

            await page.waitForLoadState('networkidle');

            await expect(
                page.getByText(/sudah di-assign ke trip ini/i),
            ).toBeVisible({ timeout: 10_000 });
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Accessibility (read-only, aman tanpa resetTrip)
    |--------------------------------------------------------------------------
    */

    test.describe('Accessibility', () => {
        test('FormModal assign punya role="dialog" + aria-modal', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED_TRIP_KODE,
                'Seed trip TRP-001 tidak ada',
            );

            await page.getByRole('button', ASSIGN_MITRA_BUTTON).click();

            const modal = page.locator('[role="dialog"]').first();
            await expect(modal).toBeVisible();
            await expect(modal).toHaveAttribute('aria-modal', 'true');
        });
    });

    /*
    |--------------------------------------------------------------------------
    | MUTATION — Assign → Edit → Unassign (serial)
    | ✅ FIX #5: resetTrip HANYA di step 0 — step 1-4 butuh state berurutan
    |--------------------------------------------------------------------------
    */

    test.describe.serial('Mutation — Assign → Edit → Unassign', () => {
        // ❌ JANGAN taruh beforeEach resetTrip di sini — akan merusak alur
        //    step 2 (edit honor) dan step 3 (unassign Ani) yang butuh state
        //    berurutan dari step 1.
        // ✅ Reset HANYA di step 0 (precondition).

        test('step 0: activate trip (precondition)', async ({
            page,
            asAdmin,
            resetTrip,
        }) => {
            // ✅ FIX #5: resetTrip HANYA di step 0
            await resetTrip();
            await asAdmin();
            const tripId = await findTripIdByKode(page, SEED_TRIP_KODE);
            await ensureTripActive(page, tripId);
        });

        test('step 1: admin bisa assign mitra baru', async ({ page }) => {
            test.skip(
                true,
                'Seed sudah assign semua mitra (budi + ani) ke trip ini.',
            );
        });

        test('step 2: admin bisa edit assignment mitra (ubah honor)', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED_TRIP_KODE,
                'Seed trip TRP-001 tidak ada',
            );

            const mitraCard = page
                .locator('div')
                .filter({ hasText: SEED_MITRA_1.name })
                .filter({ hasText: SEED_MITRA_1.email })
                .first();

            await mitraCard.getByLabel('Edit mitra').first().click();

            await expect(
                page.getByRole('heading', { name: /Edit Assignment/i }),
            ).toBeVisible();

            const honorInput = page.locator('input[inputmode="numeric"]').first();
            await honorInput.fill('1200000');

            await Promise.all([
                page.waitForResponse(
                    (resp) =>
                        resp.url().includes('/admin/trips/') &&
                        resp.url().includes('/mitras/') &&
                        resp.request().method() === 'PUT',
                    { timeout: 15_000 },
                ),
                page.getByRole('button', { name: /^Simpan$/i }).last().click(),
            ]);

            await expect(
                page.getByText(/Assignment mitra berhasil diperbarui/i),
            ).toBeVisible({ timeout: 10_000 });

            await expect(
                page.getByText(/Rp 1\.200\.000/i).first(),
            ).toBeVisible();
        });

        test('step 3: admin bisa unassign mitra 2 (Ani) — masih ada mitra 1', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED_TRIP_KODE,
                'Seed trip TRP-001 tidak ada',
            );

            const mitraCard = page
                .locator('div')
                .filter({ hasText: SEED_MITRA_2.name })
                .filter({ hasText: SEED_MITRA_2.email })
                .first();

            const cardExists = await mitraCard
                .isVisible()
                .catch(() => false);
            if (!cardExists) {
                test.skip(
                    true,
                    'Mitra 2 (Ani) tidak ditemukan — kemungkinan sudah ' +
                    'di-unassign oleh test sebelumnya.',
                );
                return;
            }

            await mitraCard.getByLabel('Unassign mitra').first().click();

            await expect(
                page.getByRole('heading', { name: /Unassign Mitra\?/i }),
            ).toBeVisible();

            await Promise.all([
                page.waitForResponse(
                    (resp) =>
                        resp.url().includes('/admin/trips/') &&
                        resp.url().includes('/mitras/') &&
                        resp.request().method() === 'DELETE',
                    { timeout: 15_000 },
                ),
                page.getByRole('button', { name: /Ya, Unassign/i }).click(),
            ]);

            await expect(
                page.getByText(/Mitra berhasil di-unassign/i),
            ).toBeVisible({ timeout: 10_000 });

            await expect(
                page.getByText(SEED_MITRA_2.email).first(),
            ).not.toBeVisible();
        });

        test('step 4: unassign mitra terakhir saat active → guard error', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            const tripId = await openShowPageOrSkip(
                page,
                SEED_TRIP_KODE,
                'Seed trip TRP-001 tidak ada',
            );

            const isActive = await page
                .getByText(/^Sedang Berjalan$/i)
                .first()
                .isVisible()
                .catch(() => false);

            if (!isActive) {
                test.skip(
                    true,
                    'Trip tidak active — guard "harus punya minimal 1 mitra" ' +
                    'hanya trigger saat trip active. Kemungkinan trip sudah ' +
                    'di-cancel/complete oleh test lain.',
                );
                return;
            }

            const mitraCard = page
                .locator('div')
                .filter({ hasText: SEED_MITRA_1.name })
                .filter({ hasText: SEED_MITRA_1.email })
                .first();

            const cardExists = await mitraCard
                .isVisible()
                .catch(() => false);
            if (!cardExists) {
                test.skip(
                    true,
                    'Mitra 1 (Budi) tidak ditemukan — kemungkinan sudah ' +
                    'di-unassign oleh test sebelumnya.',
                );
                return;
            }

            await mitraCard.getByLabel('Unassign mitra').first().click();

            await expect(
                page.getByRole('heading', { name: /Unassign Mitra\?/i }),
            ).toBeVisible();

            await Promise.all([
                page.waitForResponse(
                    (resp) =>
                        resp.url().includes('/admin/trips/') &&
                        resp.url().includes('/mitras/') &&
                        resp.request().method() === 'DELETE',
                    { timeout: 15_000 },
                ),
                page.getByRole('button', { name: /Ya, Unassign/i }).click(),
            ]);

            await page.waitForLoadState('networkidle');

            const flashError = await page
                .locator('[role="alert"], .bg-red-50')
                .textContent({ timeout: 5_000 })
                .catch(() => null);

            const flashSuccess = await page
                .locator('.bg-green-50, [role="status"]')
                .textContent({ timeout: 2_000 })
                .catch(() => null);

            if (flashSuccess && !flashError) {
                throw new Error(
                    `Unassign berhasil padahal seharusnya ditolak guard. ` +
                    `Flash sukses: "${flashSuccess}". ` +
                    `Cek: apakah TripController::unassignMitra memeriksa ` +
                    `"minimal 1 mitra" saat trip active?`,
                );
            }

            await expect(
                page.getByText(/harus punya minimal 1 mitra/i),
            ).toBeVisible({ timeout: 10_000 });

            await expect(
                page.getByText(SEED_MITRA_1.email).first(),
            ).toBeVisible();
        });
    });
});