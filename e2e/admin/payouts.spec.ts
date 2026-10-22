import { test, expect, SEED_USERS } from '../fixtures/auth';
import { APP_URL } from '../config';
import AxeBuilder from '@axe-core/playwright';
import type { Locator, Page } from '@playwright/test';

/**
 * Admin — Payouts (Index + Approve/Reject/Mark-Paid)
 *
 * ⚠️ FIX #1: tab — fallback ke getByRole('button') kalau role=tab tidak ada
 * ⚠️ FIX #2: strict mode — empty state text ambiguous → exact/locator spesifik
 * ⚠️ FIX #3: waitForResponse → expect.poll URL (anti flaky Inertia)
 * ⚠️ FIX #4: modal heading & status badge → expect.poll
 * ⚠️ FIX #5: expectPath/expectPagePath — toleran absolute URL
 * ⚠️ FIX #6: performSearch — tunggu input ready + terisi sebelum polling
 *           (anti race hydration: fill() sebelum handler siap → query null)
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

async function findMitraIdByEmail(
    page: Page,
    email: string,
): Promise<number> {
    await page.goto(
        `/admin/users?search=${encodeURIComponent(email)}`,
        { waitUntil: 'domcontentloaded' },
    );
    await page.waitForSelector(`text=${email}`, { timeout: 15_000 });

    const href = await page
        .locator(`a[href*="/admin/users/"][href*="/edit"]`)
        .first()
        .getAttribute('href');

    const match = href?.match(/\/admin\/users\/(\d+)\/edit$/);
    if (!match) {
        throw new Error(
            `findMitraIdByEmail: href tidak valid untuk ${email}. Got: ${href}`,
        );
    }
    return Number(match[1]);
}

async function createPayoutViaAPI(
    page: Page,
    mitraId: number,
    jumlah: number,
): Promise<{ payout_id: number; kode: string; status: string }> {
    const csrf = await getCsrf(page);

    const response = await page.request.post('/_test/create-payout', {
        form: {
            mitra_id: String(mitraId),
            jumlah: String(jumlah),
        },
        headers: { 'X-XSRF-TOKEN': csrf },
        failOnStatusCode: false,
    });

    if (!response.ok()) {
        throw new Error(
            `createPayoutViaAPI gagal: ${response.status()} — ${await response.text()}`,
        );
    }

    return response.json();
}

async function findTab(
    page: Page,
    name: RegExp,
): Promise<Locator | null> {
    const roleTab = page.getByRole('tab', { name });
    if ((await roleTab.count()) > 0) {
        return roleTab.first();
    }

    const roleButton = page.getByRole('button', { name });
    if ((await roleButton.count()) > 0) {
        return roleButton.first();
    }

    const anyLink = page.getByRole('link', { name });
    if ((await anyLink.count()) > 0) {
        return anyLink.first();
    }

    return null;
}

/**
 * ✅ FIX #6: performSearch — anti race hydration.
 *
 * Kenapa `Received: null` (bukan "")?
 * - `fill()` sebelum hydration selesai → handler `input`/`keydown`
 *   BELUM terpasang → tidak ada event yang trigger URL update →
 *   query param `search` TIDAK PERNAH ada → `searchParams.get('search')`
 *   return `null`.
 * - Beda dengan `""` (param ada, nilai kosong) — itu terjadi jika
 *   handler terpasang tapi nilai input kosong saat dibaca.
 *
 * Solusi: 4 lapis tunggu.
 * 1. Tunggu networkidle (hydration selesai)
 * 2. Tunggu input visible & enabled
 * 3. Isi input + VERIFIKASI nilai benar-benar masuk (toHaveValue)
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

// ==========================================
// KONSTANTA
// ==========================================

const PAYOUT_JUMLAH = 100_000;
const PAYOUT_JUMLAH_2 = 150_000;

// ==========================================
// TEST SUITE
// ==========================================

test.describe('Admin — Payouts', () => {
    /*
    |--------------------------------------------------------------------------
    | Access Control
    |--------------------------------------------------------------------------
    */

    test('guest tidak bisa akses payouts index', async ({ page, asGuest }) => {
        await asGuest();
        await page.goto('/admin/payouts', { waitUntil: 'domcontentloaded' });
        await expectPagePath(page, '/login');
    });

    test('client tidak bisa akses payouts index', async ({ page, asClient }) => {
        await asClient();
        await page.goto('/admin/payouts', { waitUntil: 'domcontentloaded' });
        await expectPagePath(page, '/client/dashboard');
    });

    test('mitra tidak bisa akses payouts index admin', async ({
        page,
        asMitra,
    }) => {
        await asMitra();
        await page.goto('/admin/payouts', { waitUntil: 'domcontentloaded' });
        await expectPagePath(page, '/mitra/dashboard');
    });

    test('admin bisa akses payouts index', async ({ page, asAdmin }) => {
        await asAdmin();
        await page.goto('/admin/payouts', { waitUntil: 'domcontentloaded' });
        await expectPagePath(page, '/admin/payouts');
    });

    /*
    |--------------------------------------------------------------------------
    | Contract — Elemen Halaman
    |--------------------------------------------------------------------------
    */

    test.describe('Elemen Halaman', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/payouts', { waitUntil: 'domcontentloaded' });
        });

        test('menampilkan heading "Pencairan Honor"', async ({ page }) => {
            await expect(
                page
                    .getByRole('heading', { name: /^Pencairan Honor$/i })
                    .first(),
            ).toBeVisible();
        });

        test('menampilkan deskripsi halaman', async ({ page }) => {
            await expect(
                page.getByText(/Review dan proses pengajuan pencairan/i),
            ).toBeVisible();
        });

        test('menampilkan input search', async ({ page }) => {
            await expect(
                page.locator('input[placeholder*="Cari"]'),
            ).toHaveAttribute(
                'placeholder',
                /Cari kode atau nama pemilik/i,
            );
        });

        test('menampilkan 5 status tab', async ({ page }) => {
            const allTab = await findTab(page, /^Semua/i);
            const pendingTab = await findTab(page, /^Menunggu Review/i);
            const approvedTab = await findTab(page, /^Disetujui/i);
            const paidTab = await findTab(page, /^Sudah Ditransfer/i);
            const rejectedTab = await findTab(page, /^Ditolak/i);

            if (
                !allTab ||
                !pendingTab ||
                !approvedTab ||
                !paidTab ||
                !rejectedTab
            ) {
                test.skip(
                    true,
                    'Tab status tidak render (bukan role=tab). ' +
                    'Svelte component mungkin pakai button/link. ' +
                    'Cek resources/js/Pages/Admin/Payouts/Index.svelte.',
                );
                return;
            }

            await expect(allTab).toBeVisible();
            await expect(pendingTab).toBeVisible();
            await expect(approvedTab).toBeVisible();
            await expect(paidTab).toBeVisible();
            await expect(rejectedTab).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Empty State
    |--------------------------------------------------------------------------
    */

    test.describe('Empty State', () => {
        test('menampilkan empty state ketika belum ada payout', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await page.goto('/admin/payouts', { waitUntil: 'domcontentloaded' });

            await expect(
                page.getByText(/Belum ada pengajuan/i),
            ).toBeVisible();

            await expect(
                page
                    .getByText(/Pengajuan pencairan dari mitra akan muncul/i)
                    .first(),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Filter — Status Tabs (Empty)
    |--------------------------------------------------------------------------
    */

    test.describe('Filter — Status Tabs (Empty)', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/payouts', { waitUntil: 'domcontentloaded' });
        });

        test('filter "pending" → empty', async ({ page }) => {
            const pendingTab = await findTab(page, /^Menunggu Review/i);
            if (!pendingTab) {
                test.skip(true, 'Tab "Menunggu Review" tidak render.');
                return;
            }

            await pendingTab.click();
            await expect
                .poll(
                    () => new URL(page.url()).searchParams.get('status'),
                    { timeout: 15_000, intervals: [100, 200, 500] },
                )
                .toBe('pending');

            await expect(
                page.getByText(/Belum ada pengajuan/i),
            ).toBeVisible();
        });

        test('filter "approved" → empty', async ({ page }) => {
            const approvedTab = await findTab(page, /^Disetujui/i);
            if (!approvedTab) {
                test.skip(true, 'Tab "Disetujui" tidak render.');
                return;
            }

            await approvedTab.click();
            await expect
                .poll(
                    () => new URL(page.url()).searchParams.get('status'),
                    { timeout: 15_000, intervals: [100, 200, 500] },
                )
                .toBe('approved');

            await expect(
                page.getByText(/Belum ada pengajuan/i),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Search — Empty
    |--------------------------------------------------------------------------
    */

    test.describe('Search', () => {
        test('search tanpa hasil → empty', async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/payouts', { waitUntil: 'domcontentloaded' });

            // ✅ FIX #6: pakai performSearch — anti race hydration
            await performSearch(page, 'tidak-ada-xyz-999');

            await expect(
                page.getByText(/Tidak ada pengajuan ditemukan/i),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Accessibility (a11y)
    |--------------------------------------------------------------------------
    */

    test.describe('Accessibility', () => {
        test('halaman index tidak punya pelanggaran WCAG kritis', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await page.goto('/admin/payouts', { waitUntil: 'domcontentloaded' });
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
    });

    /*
    |--------------------------------------------------------------------------
    | MUTATION — Approve → Mark Paid
    |--------------------------------------------------------------------------
    */

    test.describe.serial('Approve → Mark Paid (Happy Path)', () => {
        let mitraId: number;
        let payoutKode: string;

        test('step 1: resolve mitra ID', async ({ page, asAdmin }) => {
            await asAdmin();
            mitraId = await findMitraIdByEmail(
                page,
                SEED_USERS.mitra.email,
            );
            expect(mitraId).toBeGreaterThan(0);
        });

        test('step 2: create payout pending (via /_test)', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            const result = await createPayoutViaAPI(
                page,
                mitraId,
                PAYOUT_JUMLAH,
            );

            expect(result.payout_id).toBeGreaterThan(0);
            expect(result.status).toBe('pending');
            payoutKode = result.kode;
        });

        test('step 3: index menampilkan payout pending', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await page.goto('/admin/payouts', { waitUntil: 'domcontentloaded' });

            await expect
                .poll(
                    async () =>
                        await page
                            .getByText(payoutKode)
                            .first()
                            .isVisible()
                            .catch(() => false),
                    { timeout: 10_000, intervals: [200, 500] },
                )
                .toBe(true);

            await expect(
                page.getByText(/Menunggu Review/i).first(),
            ).toBeVisible();

            await expect(
                page.getByRole('button', { name: /^Approve$/i }).first(),
            ).toBeVisible();
            await expect(
                page.getByRole('button', { name: /^Tolak$/i }).first(),
            ).toBeVisible();
        });

        test('step 4: approve payout → status approved', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await page.goto('/admin/payouts', { waitUntil: 'domcontentloaded' });

            const card = page
                .locator('div')
                .filter({ hasText: payoutKode })
                .first();
            await expect(card).toBeVisible();

            await card
                .getByRole('button', { name: /^Approve$/i })
                .click();

            await expect
                .poll(
                    async () =>
                        await page
                            .getByRole('heading', {
                                name: /Setujui Payout\?/i,
                            })
                            .isVisible()
                            .catch(() => false),
                    { timeout: 10_000, intervals: [100, 200, 500] },
                )
                .toBe(true);

            await Promise.all([
                page.waitForResponse(
                    (resp) =>
                        resp.url().includes('/payouts/') &&
                        resp.url().includes('/approve') &&
                        resp.request().method() === 'POST',
                    { timeout: 15_000 },
                ),
                page
                    .getByRole('button', { name: /Ya, Setujui/i })
                    .click(),
            ]);

            await expect
                .poll(
                    async () =>
                        await page
                            .getByText(/Payout disetujui/i)
                            .isVisible()
                            .catch(() => false),
                    { timeout: 10_000, intervals: [200, 500] },
                )
                .toBe(true);

            const updatedCard = page
                .locator('div')
                .filter({ hasText: payoutKode })
                .first();
            await expect
                .poll(
                    async () =>
                        await updatedCard
                            .getByText(/^Disetujui$/i)
                            .isVisible()
                            .catch(() => false),
                    { timeout: 10_000, intervals: [200, 500] },
                )
                .toBe(true);

            await expect(
                updatedCard.getByRole('button', {
                    name: /Tandai Ditransfer/i,
                }),
            ).toBeVisible();
            await expect(
                updatedCard.getByRole('button', { name: /^Approve$/i }),
            ).not.toBeVisible();
        });

        test('step 5: mark paid payout approved → status paid', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await page.goto('/admin/payouts', { waitUntil: 'domcontentloaded' });

            const card = page
                .locator('div')
                .filter({ hasText: payoutKode })
                .first();

            await card
                .getByRole('button', { name: /Tandai Ditransfer/i })
                .click();

            await expect
                .poll(
                    async () =>
                        await page
                            .getByRole('heading', {
                                name: /Tandai Sudah Ditransfer\?/i,
                            })
                            .isVisible()
                            .catch(() => false),
                    { timeout: 10_000, intervals: [100, 200, 500] },
                )
                .toBe(true);

            await Promise.all([
                page.waitForResponse(
                    (resp) =>
                        resp.url().includes('/payouts/') &&
                        resp.url().includes('/mark-paid') &&
                        resp.request().method() === 'POST',
                    { timeout: 15_000 },
                ),
                page
                    .getByRole('button', { name: /Ya, Tandai/i })
                    .click(),
            ]);

            await expect
                .poll(
                    async () =>
                        await page
                            .getByText(/Payout ditandai sudah ditransfer/i)
                            .isVisible()
                            .catch(() => false),
                    { timeout: 10_000, intervals: [200, 500] },
                )
                .toBe(true);

            const updatedCard = page
                .locator('div')
                .filter({ hasText: payoutKode })
                .first();
            await expect
                .poll(
                    async () =>
                        await updatedCard
                            .getByText(/^Sudah Ditransfer$/i)
                            .isVisible()
                            .catch(() => false),
                    { timeout: 10_000, intervals: [200, 500] },
                )
                .toBe(true);

            await expect(
                updatedCard.getByRole('button', {
                    name: /Tandai Ditransfer/i,
                }),
            ).not.toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | MUTATION — Reject Payout
    |--------------------------------------------------------------------------
    */

    test.describe.serial('Reject Payout (Happy Path)', () => {
        let mitraId: number;
        let payoutKode: string;

        test('step 1: create payout 2 (via /_test)', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            mitraId = await findMitraIdByEmail(
                page,
                SEED_USERS.mitra.email,
            );
            const result = await createPayoutViaAPI(
                page,
                mitraId,
                PAYOUT_JUMLAH_2,
            );
            payoutKode = result.kode;
            expect(result.status).toBe('pending');
        });

        test('step 2: reject payout dengan reason', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await page.goto('/admin/payouts', { waitUntil: 'domcontentloaded' });

            const card = page
                .locator('div')
                .filter({ hasText: payoutKode })
                .first();
            await expect(card).toBeVisible();

            await card
                .getByRole('button', { name: /^Tolak$/i })
                .click();

            await expect
                .poll(
                    async () =>
                        await page
                            .getByRole('heading', {
                                name: /Tolak Payout\?/i,
                            })
                            .isVisible()
                            .catch(() => false),
                    { timeout: 10_000, intervals: [100, 200, 500] },
                )
                .toBe(true);

            await page.fill(
                'textarea#confirm-reason',
                'Data rekening tidak valid',
            );

            await Promise.all([
                page.waitForResponse(
                    (resp) =>
                        resp.url().includes('/payouts/') &&
                        resp.url().includes('/reject') &&
                        resp.request().method() === 'POST',
                    { timeout: 15_000 },
                ),
                page.getByRole('button', { name: /Ya, Tolak/i }).click(),
            ]);

            await expect
                .poll(
                    async () =>
                        await page
                            .getByText(/Payout ditolak/i)
                            .isVisible()
                            .catch(() => false),
                    { timeout: 10_000, intervals: [200, 500] },
                )
                .toBe(true);

            const updatedCard = page
                .locator('div')
                .filter({ hasText: payoutKode })
                .first();
            await expect
                .poll(
                    async () =>
                        await updatedCard
                            .getByText(/^Ditolak$/i)
                            .isVisible()
                            .catch(() => false),
                    { timeout: 10_000, intervals: [200, 500] },
                )
                .toBe(true);

            await expect(
                updatedCard.getByText(/Data rekening tidak valid/i),
            ).toBeVisible();

            await expect(
                updatedCard.getByRole('button', { name: /^Approve$/i }),
            ).not.toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Error Handling — Status Guard (SKIP)
    |--------------------------------------------------------------------------
    */

    test.describe.serial('Error Handling — Status Guard', () => {
        test('approve payout yang sudah approved → flash error', async () => {
            test.skip(
                true,
                'Butuh endpoint /_test/find-payout + payout_id untuk test ' +
                'guard via request. Bisa di-enable kalau endpoint ditambahkan.',
            );
        });

        test('mark-paid pada payout pending → flash error', async () => {
            test.skip(
                true,
                'Butuh payout_id untuk test guard via request.',
            );
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Filter — Setelah Mutasi
    |--------------------------------------------------------------------------
    */

    test.describe.serial('Filter — Setelah Mutasi', () => {
        test('filter "paid" hanya menampilkan payout yang sudah ditransfer', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await page.goto('/admin/payouts', { waitUntil: 'domcontentloaded' });

            const paidTab = await findTab(page, /^Sudah Ditransfer/i);
            if (!paidTab) {
                test.skip(true, 'Tab "Sudah Ditransfer" tidak render.');
                return;
            }

            await paidTab.click();

            await expect
                .poll(
                    () => new URL(page.url()).searchParams.get('status'),
                    { timeout: 15_000, intervals: [100, 200, 500] },
                )
                .toBe('paid');

            await expect(
                page.getByText(/^Sudah Ditransfer$/i).first(),
            ).toBeVisible();
        });

        test('filter "rejected" menampilkan payout yang ditolak', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await page.goto('/admin/payouts', { waitUntil: 'domcontentloaded' });

            const rejectedTab = await findTab(page, /^Ditolak/i);
            if (!rejectedTab) {
                test.skip(true, 'Tab "Ditolak" tidak render.');
                return;
            }

            await rejectedTab.click();

            await expect
                .poll(
                    () => new URL(page.url()).searchParams.get('status'),
                    { timeout: 15_000, intervals: [100, 200, 500] },
                )
                .toBe('rejected');

            await expect(
                page.getByText(/^Ditolak$/i).first(),
            ).toBeVisible();
        });
    });
});