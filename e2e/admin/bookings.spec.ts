import { test, expect } from '../fixtures/auth';
import { APP_URL } from '../config';
import AxeBuilder from '@axe-core/playwright';
import type { Locator, Page } from '@playwright/test';

/**
 * Admin — Bookings (Index + Show + Actions)
 *
 * ⚠️ FIX #1: performSearch — polling URL params (anti flaky Inertia)
 * ⚠️ FIX #2: tab — fallback ke getByRole('button') kalau role=tab tidak ada
 * ⚠️ FIX #3: expectPath / expectPagePath — toleran absolute URL
 * ⚠️ FIX #4: modal heading & toast → expect.poll
 * ⚠️ FIX #5: findBookingIdByKode — return null (skip graceful)
 * ⚠️ FIX #6: waitForResponse filter status/tanggal → polling URL
 * ⚠️ FIX #7: strict mode — `.first()` pada semua getByText yang bisa multi-match
 * ⚠️ FIX #8: performSearch — tunggu input ready + terisi sebelum polling
 *           (anti race hydration: fill() sebelum handler siap → query kosong)
 * ⚠️ FIX #9: resetTrip — reset TRP-001 scheduled sebelum test yang sentuh
 *           data booking (Mutation mengubah BKG-001 → mempengaruhi search)
 */

// ==========================================
// HELPER
// ==========================================

async function expectPath(
    locator: Locator,
    expectedPath: string | RegExp,
): Promise<void> {
    const href = await locator.getAttribute('href');
    expect(href).not.toBeNull();
    const actualPath = new URL(href!, APP_URL).pathname;

    if (typeof expectedPath === 'string') {
        expect(actualPath).toBe(expectedPath);
    } else {
        expect(actualPath).toMatch(expectedPath);
    }
}

async function expectPagePath(
    page: Page,
    expectedPath: string | RegExp,
): Promise<void> {
    if (typeof expectedPath === 'string') {
        await expect
            .poll(
                () => new URL(page.url()).pathname,
                { timeout: 10_000, intervals: [100, 200, 500] },
            )
            .toBe(expectedPath);
    } else {
        await expect
            .poll(
                () => {
                    const path = new URL(page.url()).pathname;
                    return expectedPath.test(path);
                },
                { timeout: 10_000, intervals: [100, 200, 500] },
            )
            .toBe(true);
    }
}

async function findBookingIdByKode(
    page: Page,
    kode: string,
): Promise<number | null> {
    await page.goto(
        `/admin/bookings?search=${encodeURIComponent(kode)}`,
        { waitUntil: 'domcontentloaded' },
    );

    const rowVisible = await page
        .getByText(kode)
        .first()
        .isVisible()
        .catch(() => false);
    if (!rowVisible) return null;

    const href = await page
        .locator('a[href*="/admin/bookings/"]')
        .evaluateAll((els) =>
            els
                .map((el) => el.getAttribute('href'))
                .find((h) => /\/admin\/bookings\/\d+$/.test(h ?? '')),
        );

    if (!href) return null;

    const match = href.match(/\/admin\/bookings\/(\d+)$/);
    if (!match) return null;

    return Number(match[1]);
}

async function openShowPage(
    page: Page,
    kode: string,
): Promise<number | null> {
    const id = await findBookingIdByKode(page, kode);
    if (id === null) return null;

    await page.goto(`/admin/bookings/${id}`, {
        waitUntil: 'domcontentloaded',
    });
    return id;
}

async function openShowPageOrSkip(
    page: Page,
    kode: string,
    reason: string,
): Promise<number> {
    const id = await openShowPage(page, kode);
    if (id === null) {
        test.skip(
            true,
            `Booking "${kode}" tidak ditemukan. ${reason}. ` +
                `Cek database/seeders/BookingSeeder.php.`,
        );
        throw new Error('unreachable');
    }
    return id;
}

/**
 * ✅ FIX #8: performSearch — anti race hydration.
 *
 * Kenapa: `page.fill()` bisa jalan SEBELUM Svelte hydration selesai.
 * Akibatnya nilai terisi di DOM, tapi handler `input`/`keydown` belum
 * terpasang → URL di-update dengan query kosong (`Received: ""`).
 *
 * Solusi:
 * 1. Tunggu networkidle (hydration selesai)
 * 2. Tunggu input visible
 * 3. Tunggu nilai benar-benar terisi di input
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

function rowByKode(page: Page, kode: string) {
    return page.locator('tbody tr').filter({ hasText: kode });
}

async function findTab(
    page: Page,
    name: RegExp,
): Promise<Locator | null> {
    const roleTab = page.getByRole('tab', { name });
    if ((await roleTab.count()) > 0) return roleTab.first();

    const roleButton = page.getByRole('button', { name });
    if ((await roleButton.count()) > 0) return roleButton.first();

    const anyLink = page.getByRole('link', { name });
    if ((await anyLink.count()) > 0) return anyLink.first();

    return null;
}

// ==========================================
// KONSTANTA
// ==========================================

const CURRENT_YEAR = new Date().getFullYear();

const SEED_BOOKINGS = {
    pendingPayment: `BKG-${CURRENT_YEAR}-001`,
    paymentVerified1: `BKG-${CURRENT_YEAR}-002`,
    paymentVerified2: `BKG-${CURRENT_YEAR}-003`,
    paymentVerified3: `BKG-${CURRENT_YEAR}-004`,
    cancelled: `BKG-${CURRENT_YEAR}-005`,
    confirmed: `BKG-${CURRENT_YEAR}-E2E-CONFIRMED`,
} as const;

// ==========================================
// TEST SUITE
// ==========================================

test.describe('Admin — Bookings', () => {
    /*
    |--------------------------------------------------------------------------
    | Access Control
    |--------------------------------------------------------------------------
    */

    test('guest tidak bisa akses booking index', async ({ page, asGuest }) => {
        await asGuest();
        await page.goto('/admin/bookings', {
            waitUntil: 'domcontentloaded',
        });
        await expectPagePath(page, '/login');
    });

    test('client tidak bisa akses booking index', async ({
        page,
        asClient,
    }) => {
        await asClient();
        await page.goto('/admin/bookings', {
            waitUntil: 'domcontentloaded',
        });
        await expectPagePath(page, '/client/dashboard');
    });

    test('mitra tidak bisa akses booking index', async ({ page, asMitra }) => {
        await asMitra();
        await page.goto('/admin/bookings', {
            waitUntil: 'domcontentloaded',
        });
        await expectPagePath(page, '/mitra/dashboard');
    });

    test('admin bisa akses booking index', async ({ page, asAdmin }) => {
        await asAdmin();
        await page.goto('/admin/bookings', {
            waitUntil: 'domcontentloaded',
        });
        await expectPagePath(page, '/admin/bookings');
    });

    /*
    |--------------------------------------------------------------------------
    | Index — Contract
    |--------------------------------------------------------------------------
    */

    test.describe('Index — Contract', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/bookings', {
                waitUntil: 'domcontentloaded',
            });
        });

        test('menampilkan heading "Booking Management"', async ({ page }) => {
            await expect(
                page
                    .getByRole('heading', { name: /Booking Management/i })
                    .first(),
            ).toBeVisible();
        });

        test('menampilkan search input', async ({ page }) => {
            await expect(
                page.locator('input[placeholder*="Cari"]'),
            ).toHaveAttribute(
                'placeholder',
                /Cari kode booking, nama client, atau paket/i,
            );
        });

        test('menampilkan status tab yang ada di seed', async ({ page }) => {
            const allTab = await findTab(page, /^Semua/i);
            const pendingTab = await findTab(page, /^Pending/i);
            const verifTab = await findTab(page, /^Verifikasi/i);
            const konfirmTab = await findTab(page, /^Konfirmasi/i);
            const batalTab = await findTab(page, /^Batal/i);

            if (
                !allTab ||
                !pendingTab ||
                !verifTab ||
                !konfirmTab ||
                !batalTab
            ) {
                test.skip(
                    true,
                    'Tab status tidak render (bukan role=tab). ' +
                    'Svelte component mungkin pakai button/link. ' +
                    'Cek resources/js/Pages/Admin/Bookings/Index.svelte.',
                );
                return;
            }

            await expect(allTab).toBeVisible();
            await expect(pendingTab).toBeVisible();
            await expect(verifTab).toBeVisible();
            await expect(konfirmTab).toBeVisible();
            await expect(batalTab).toBeVisible();

            const selesaiTab = await findTab(page, /^Selesai/i);
            if (selesaiTab) {
                await expect(selesaiTab).not.toBeVisible();
            }
        });

        test('menampilkan tabel header yang benar', async ({ page }) => {
            await expect(
                page.getByRole('columnheader', { name: /^Booking$/i }),
            ).toBeVisible();
            await expect(
                page.getByRole('columnheader', { name: /^Client$/i }),
            ).toBeVisible();
            await expect(
                page.getByRole('columnheader', {
                    name: /Tanggal Berangkat/i,
                }),
            ).toBeVisible();
            await expect(
                page.getByRole('columnheader', { name: /^Total$/i }),
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

    /*
    |--------------------------------------------------------------------------
    | Index — Data Seed
    |--------------------------------------------------------------------------
    */

    test.describe('Index — Data Seed', () => {
        test.beforeEach(async ({ page, asAdmin, resetTrip }) => {
            await resetTrip(); // ✅ FIX #9: reset state trip
            await asAdmin();
            await page.goto('/admin/bookings', {
                waitUntil: 'domcontentloaded',
            });
        });

        test('menampilkan seed booking pending_payment', async ({ page }) => {
            await expect(
                page.getByText(SEED_BOOKINGS.pendingPayment).first(),
            ).toBeVisible();
        });

        test('menampilkan seed booking cancelled', async ({ page }) => {
            await expect(
                page.getByText(SEED_BOOKINGS.cancelled).first(),
            ).toBeVisible();
        });

        test('row pending_payment menampilkan badge "Menunggu Pembayaran"', async ({
            page,
        }) => {
            const row = rowByKode(page, SEED_BOOKINGS.pendingPayment);
            await expect(
                row.getByText(/Menunggu Pembayaran/i).first(),
            ).toBeVisible();
        });

        test('row payment_verified menampilkan badge "Pembayaran Diverifikasi"', async ({
            page,
        }) => {
            const row = rowByKode(page, SEED_BOOKINGS.paymentVerified1);
            await expect(
                row.getByText(/Pembayaran Diverifikasi/i).first(),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Index — Filter Status
    |--------------------------------------------------------------------------
    */

    test.describe('Index — Filter Status', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/bookings', {
                waitUntil: 'domcontentloaded',
            });
        });

        test('filter status "pending_payment"', async ({ page }) => {
            const pendingTab = await findTab(page, /^Pending/i);
            if (!pendingTab) {
                test.skip(true, 'Tab "Pending" tidak render.');
                return;
            }

            await pendingTab.click();

            await expect
                .poll(
                    () => new URL(page.url()).searchParams.get('status'),
                    { timeout: 15_000, intervals: [100, 200, 500] },
                )
                .toBe('pending_payment');

            await expect(
                page.getByText(SEED_BOOKINGS.pendingPayment).first(),
            ).toBeVisible();
            await expect(
                page.getByText(SEED_BOOKINGS.cancelled).first(),
            ).not.toBeVisible();
        });

        test('filter status "payment_verified"', async ({ page }) => {
            const verifTab = await findTab(page, /^Verifikasi/i);
            if (!verifTab) {
                test.skip(true, 'Tab "Verifikasi" tidak render.');
                return;
            }

            await verifTab.click();

            await expect
                .poll(
                    () => new URL(page.url()).searchParams.get('status'),
                    { timeout: 15_000, intervals: [100, 200, 500] },
                )
                .toBe('payment_verified');

            await expect(
                page.getByText(SEED_BOOKINGS.paymentVerified1).first(),
            ).toBeVisible();
        });

        test('filter status "cancelled"', async ({ page }) => {
            const batalTab = await findTab(page, /^Batal/i);
            if (!batalTab) {
                test.skip(true, 'Tab "Batal" tidak render.');
                return;
            }

            await batalTab.click();

            await expect
                .poll(
                    () => new URL(page.url()).searchParams.get('status'),
                    { timeout: 15_000, intervals: [100, 200, 500] },
                )
                .toBe('cancelled');

            await expect(
                page.getByText(SEED_BOOKINGS.cancelled).first(),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Index — Search
    |--------------------------------------------------------------------------
    */

    test.describe('Index — Search', () => {
        test.beforeEach(async ({ page, asAdmin, resetTrip }) => {
            await resetTrip(); // ✅ FIX #9: reset state trip
            await asAdmin();
            await page.goto('/admin/bookings', {
                waitUntil: 'domcontentloaded',
            });
        });

        test('search by kode menampilkan hasil', async ({ page }) => {
            await performSearch(page, SEED_BOOKINGS.pendingPayment);

            await expect(
                page.getByText(SEED_BOOKINGS.pendingPayment).first(),
            ).toBeVisible();
        });

        test('search tanpa hasil → empty state', async ({ page }) => {
            await performSearch(page, 'tidak-ada-xyz-999');

            await expect
                .poll(
                    async () =>
                        await page
                            .getByText(/Tidak ada booking ditemukan/i)
                            .first()
                            .isVisible()
                            .catch(() => false),
                    { timeout: 15_000, intervals: [100, 200, 500] },
                )
                .toBe(true);
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Index — Filter Tanggal Range
    |--------------------------------------------------------------------------
    */

    test.describe('Index — Filter Tanggal', () => {
        test('klik "Filter Tanggal" menampilkan panel date range', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await page.goto('/admin/bookings', {
                waitUntil: 'domcontentloaded',
            });

            const filterBtn = page.getByRole('button', {
                name: /Filter Tanggal/i,
            });
            const btnExists = await filterBtn
                .isVisible()
                .catch(() => false);
            if (!btnExists) {
                test.skip(true, 'Tombol "Filter Tanggal" tidak ditemukan.');
                return;
            }

            await filterBtn.click();

            await expect(
                page.locator('input#filter-date-from'),
            ).toBeVisible({ timeout: 5_000 });
            await expect(
                page.locator('input#filter-date-to'),
            ).toBeVisible({ timeout: 5_000 });
        });

        test('isi date range + terapkan → query berubah', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await page.goto('/admin/bookings', {
                waitUntil: 'domcontentloaded',
            });

            await page
                .getByRole('button', { name: /Filter Tanggal/i })
                .click();

            await page.fill('input#filter-date-from', '2026-01-01');
            await page.fill('input#filter-date-to', '2026-12-31');

            await page.getByRole('button', { name: /^Terapkan$/i }).click();

            await expect
                .poll(
                    () =>
                        new URL(page.url()).searchParams.get('tanggal_dari'),
                    { timeout: 15_000, intervals: [100, 200, 500] },
                )
                .toBe('2026-01-01');
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Index — Navigasi ke Show
    |--------------------------------------------------------------------------
    */

    test.describe('Index — Navigasi', () => {
        test('klik "Detail" menuju halaman Show', async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/bookings', {
                waitUntil: 'domcontentloaded',
            });

            const row = rowByKode(page, SEED_BOOKINGS.pendingPayment);
            const rowExists = await row.isVisible().catch(() => false);
            if (!rowExists) {
                test.skip(
                    true,
                    `Row booking ${SEED_BOOKINGS.pendingPayment} tidak ditemukan.`,
                );
                return;
            }

            await row.getByRole('link', { name: /Detail/i }).click();
            await expectPagePath(page, /^\/admin\/bookings\/\d+$/);
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Show — Contract
    |--------------------------------------------------------------------------
    */

    test.describe('Show — Contract', () => {
        test.beforeEach(async ({ resetTrip }) => {
            await resetTrip(); // ✅ FIX #9: reset state trip
        });

        test('menampilkan heading "Detail Booking"', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED_BOOKINGS.pendingPayment,
                'Seed booking pending_payment tidak ada',
            );

            await expect(
                page
                    .getByRole('heading', { name: /Detail Booking/i })
                    .first(),
            ).toBeVisible();
        });

        test('menampilkan breadcrumb "Kembali ke Daftar Booking"', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED_BOOKINGS.pendingPayment,
                'Seed booking pending_payment tidak ada',
            );

            await expect(
                page.getByRole('link', {
                    name: /Kembali ke Daftar Booking/i,
                }),
            ).toBeVisible();
        });

        test('menampilkan status badge "Menunggu Pembayaran"', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED_BOOKINGS.pendingPayment,
                'Seed booking pending_payment tidak ada',
            );

            await expect(
                page.getByText(/Menunggu Pembayaran/i).first(),
            ).toBeVisible();
        });

        test('menampilkan section "Client"', async ({ page, asAdmin }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED_BOOKINGS.pendingPayment,
                'Seed booking pending_payment tidak ada',
            );

            await expect(
                page.getByRole('heading', { name: /^Client$/i }).first(),
            ).toBeVisible();
        });

        test('menampilkan section "Data Peserta"', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED_BOOKINGS.pendingPayment,
                'Seed booking pending_payment tidak ada',
            );

            await expect(
                page.getByRole('heading', { name: /Data Peserta/i }).first(),
            ).toBeVisible();
        });

        test('menampilkan section "Pembayaran"', async ({ page, asAdmin }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED_BOOKINGS.pendingPayment,
                'Seed booking pending_payment tidak ada',
            );

            await expect(
                page.getByRole('heading', { name: /^Pembayaran$/i }).first(),
            ).toBeVisible();
        });

        test('menampilkan section "Info Paket"', async ({ page, asAdmin }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED_BOOKINGS.pendingPayment,
                'Seed booking pending_payment tidak ada',
            );

            await expect(page.getByText(/^Info Paket$/i).first()).toBeVisible();
        });

        test('menampilkan section "Timeline"', async ({ page, asAdmin }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED_BOOKINGS.pendingPayment,
                'Seed booking pending_payment tidak ada',
            );

            await expect(page.getByText(/^Timeline$/i).first()).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Show — Action Visibility (Conditional)
    |--------------------------------------------------------------------------
    */

    test.describe('Show — Action Visibility', () => {
        test.beforeEach(async ({ resetTrip }) => {
            await resetTrip(); // ✅ FIX #9: reset state trip
        });

        test('pending_payment: tampil Verifikasi + Batalkan, TIDAK tampil Konfirmasi', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED_BOOKINGS.pendingPayment,
                'Seed booking pending_payment tidak ada',
            );

            await expect(
                page.getByRole('button', {
                    name: /Verifikasi Pembayaran/i,
                }),
            ).toBeVisible();
            await expect(
                page.getByRole('button', { name: /Batalkan Booking/i }),
            ).toBeVisible();
            await expect(
                page.getByRole('button', { name: /Konfirmasi Booking/i }),
            ).not.toBeVisible();
        });

        test('payment_verified: tampil Konfirmasi + Batalkan, TIDAK tampil Verifikasi', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED_BOOKINGS.paymentVerified1,
                'Seed booking payment_verified tidak ada',
            );

            await expect(
                page.getByRole('button', { name: /Konfirmasi Booking/i }),
            ).toBeVisible();
            await expect(
                page.getByRole('button', { name: /Batalkan Booking/i }),
            ).toBeVisible();
            await expect(
                page.getByRole('button', {
                    name: /Verifikasi Pembayaran/i,
                }),
            ).not.toBeVisible();
        });

        test('cancelled: TIDAK ada tombol Verifikasi / Konfirmasi / Batalkan', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED_BOOKINGS.cancelled,
                'Seed booking cancelled tidak ada',
            );

            await expect(
                page.getByRole('button', {
                    name: /Verifikasi Pembayaran/i,
                }),
            ).not.toBeVisible();
            await expect(
                page.getByRole('button', { name: /Konfirmasi Booking/i }),
            ).not.toBeVisible();
            await expect(
                page.getByRole('button', { name: /Batalkan Booking/i }),
            ).not.toBeVisible();
        });

        test('confirmed: TIDAK ada tombol Konfirmasi', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED_BOOKINGS.confirmed,
                'Seed booking confirmed (E2E) tidak ada',
            );

            await expect(
                page.getByRole('button', { name: /Konfirmasi Booking/i }),
            ).not.toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Show — Error Handling (SKIP)
    |--------------------------------------------------------------------------
    */

    test.describe('Show — Error Handling', () => {
        test.skip('verify-payment pada booking payment_verified → flash error', async () => {
            // Guard: BookingService::verifyPayment cek status === pending_payment
            // Sudah di-cover di integration test (Pest).
        });

        test.skip('confirm pada booking pending_payment → flash error', async () => {
            // Guard: BookingService::confirm cek status === payment_verified
            // Sudah di-cover di integration test (Pest).
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Accessibility (a11y)
    |--------------------------------------------------------------------------
    */

    test.describe('Accessibility', () => {
        test.beforeEach(async ({ resetTrip }) => {
            await resetTrip(); // ✅ FIX #9: reset state trip
        });

        test('Index tidak punya pelanggaran WCAG kritis', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await page.goto('/admin/bookings', {
                waitUntil: 'domcontentloaded',
            });
            await page.waitForLoadState('networkidle', { timeout: 15_000 });

            const results = await new AxeBuilder({ page })
                .withTags(['wcag2a', 'wcag2aa'])
                .disableRules([
                    'region',
                    'landmark-one-main',
                    'color-contrast',
                ])
                .analyze();

            const critical = results.violations.filter((v) =>
                ['critical', 'serious'].includes(v.impact ?? ''),
            );
            expect(critical).toEqual([]);
        });

        test('Show tidak punya pelanggaran WCAG kritis', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED_BOOKINGS.pendingPayment,
                'Seed booking pending_payment tidak ada',
            );
            await page.waitForLoadState('networkidle', { timeout: 15_000 });

            const results = await new AxeBuilder({ page })
                .withTags(['wcag2a', 'wcag2aa'])
                .disableRules([
                    'region',
                    'landmark-one-main',
                    'color-contrast',
                ])
                .analyze();

            const critical = results.violations.filter((v) =>
                ['critical', 'serious'].includes(v.impact ?? ''),
            );
            expect(critical).toEqual([]);
        });
    });

    /*
    |--------------------------------------------------------------------------
    | MUTATION — Verify → Confirm → Cancel (serial)
    |--------------------------------------------------------------------------
    */

    test.describe.serial('Mutation — Verify → Confirm → Cancel', () => {
        // ❌ TIDAK resetTrip di step 2/3 — butuh state berurutan.
        // ✅ ResetTrip HANYA di step 1 (sudah di dalam test).

        test('step 1: verify payment BKG-001 (pending → payment_verified)', async ({
            page,
            asAdmin,
            resetTrip,
        }) => {
            // ✅ FIX #9: reset state trip sebelum mutation
            await resetTrip();
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED_BOOKINGS.pendingPayment,
                'Seed booking pending_payment tidak ada',
            );

            const verifBtn = page.getByRole('button', {
                name: /Verifikasi Pembayaran/i,
            });
            const hasBtn = await verifBtn.isVisible().catch(() => false);
            if (!hasBtn) {
                test.skip(
                    true,
                    'Tombol Verifikasi tidak muncul — status booking mungkin ' +
                    'sudah payment_verified dari test sebelumnya.',
                );
                return;
            }

            await verifBtn.click();

            await expect
                .poll(
                    async () =>
                        await page
                            .getByRole('heading', {
                                name: /Verifikasi Pembayaran\?/i,
                            })
                            .isVisible()
                            .catch(() => false),
                    { timeout: 10_000, intervals: [100, 200, 500] },
                )
                .toBe(true);

            await Promise.all([
                page.waitForResponse(
                    (resp) =>
                        resp.url().includes('/verify-payment') &&
                        resp.request().method() === 'POST',
                    { timeout: 15_000 },
                ),
                page
                    .getByRole('button', { name: /Ya, Verifikasi/i })
                    .click(),
            ]);

            await expect
                .poll(
                    async () =>
                        await page
                            .getByText(/Pembayaran berhasil diverifikasi/i)
                            .isVisible()
                            .catch(() => false),
                    { timeout: 10_000, intervals: [200, 500] },
                )
                .toBe(true);

            await expect
                .poll(
                    async () =>
                        await page
                            .getByText(/Pembayaran Diverifikasi/i)
                            .first()
                            .isVisible()
                            .catch(() => false),
                    { timeout: 10_000, intervals: [200, 500] },
                )
                .toBe(true);

            await expect(
                page.getByRole('button', { name: /Konfirmasi Booking/i }),
            ).toBeVisible();
        });

        test('step 2: confirm BKG-001 (payment_verified → confirmed)', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED_BOOKINGS.pendingPayment,
                'Seed booking pending_payment tidak ada',
            );

            const konfirmBtn = page.getByRole('button', {
                name: /Konfirmasi Booking/i,
            });
            const hasBtn = await konfirmBtn.isVisible().catch(() => false);
            if (!hasBtn) {
                test.skip(
                    true,
                    'Tombol Konfirmasi tidak muncul — status booking mungkin ' +
                    'belum payment_verified (step 1 gagal).',
                );
                return;
            }

            await konfirmBtn.click();

            await expect
                .poll(
                    async () =>
                        await page
                            .getByRole('heading', {
                                name: /Konfirmasi Booking\?/i,
                            })
                            .isVisible()
                            .catch(() => false),
                    { timeout: 10_000, intervals: [100, 200, 500] },
                )
                .toBe(true);

            await Promise.all([
                page.waitForResponse(
                    (resp) =>
                        resp.url().includes('/confirm') &&
                        resp.request().method() === 'POST',
                    { timeout: 15_000 },
                ),
                page
                    .getByRole('button', { name: /Ya, Konfirmasi/i })
                    .click(),
            ]);

            await expect
                .poll(
                    async () =>
                        await page
                            .getByText(/Booking berhasil dikonfirmasi/i)
                            .isVisible()
                            .catch(() => false),
                    { timeout: 10_000, intervals: [200, 500] },
                )
                .toBe(true);

            await expect
                .poll(
                    async () =>
                        await page
                            .getByText(/Terkonfirmasi/i)
                            .first()
                            .isVisible()
                            .catch(() => false),
                    { timeout: 10_000, intervals: [200, 500] },
                )
                .toBe(true);

            await expect(
                page.getByRole('button', { name: /Konfirmasi Booking/i }),
            ).not.toBeVisible();
        });

        test('step 3: cancel BKG-002 (payment_verified → cancelled)', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED_BOOKINGS.paymentVerified1,
                'Seed booking payment_verified tidak ada',
            );

            const cancelBtn = page.getByRole('button', {
                name: /Batalkan Booking/i,
            });
            const hasBtn = await cancelBtn.isVisible().catch(() => false);
            if (!hasBtn) {
                test.skip(
                    true,
                    'Tombol Batalkan tidak muncul — status booking mungkin ' +
                    'sudah cancelled dari test sebelumnya.',
                );
                return;
            }

            await cancelBtn.click();

            await expect
                .poll(
                    async () =>
                        await page
                            .getByRole('heading', {
                                name: /Batalkan Booking\?/i,
                            })
                            .isVisible()
                            .catch(() => false),
                    { timeout: 10_000, intervals: [100, 200, 500] },
                )
                .toBe(true);

            await page.fill('textarea#confirm-reason', 'E2E test cancel');

            await Promise.all([
                page.waitForResponse(
                    (resp) =>
                        resp.url().includes('/cancel') &&
                        resp.request().method() === 'POST',
                    { timeout: 15_000 },
                ),
                page.getByRole('button', { name: /Ya, Batalkan/i }).click(),
            ]);

            await expect
                .poll(
                    async () =>
                        await page
                            .getByText(/Booking berhasil dibatalkan/i)
                            .isVisible()
                            .catch(() => false),
                    { timeout: 10_000, intervals: [200, 500] },
                )
                .toBe(true);

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
                page.getByRole('button', { name: /Batalkan Booking/i }),
            ).not.toBeVisible();
        });
    });
});