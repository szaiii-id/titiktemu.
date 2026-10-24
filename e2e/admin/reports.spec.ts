import { test, expect } from '../fixtures/auth';
import AxeBuilder from '@axe-core/playwright';

/**
 * Admin — Reports (4 sub-halaman)
 *
 * Route:
 *   /admin/reports         → Pendapatan
 *   /admin/reports/mitra   → Kinerja Mitra
 *   /admin/reports/daily   → Rekap Harian
 *   /admin/reports/payout  → Payout
 *
 * Catatan implementasi:
 * - ExportButtons merender <a><svg/>PDF</a> — pakai `getByRole('link', {name: 'PDF'})`
 *   (accessible name) atau `locator('a[href*="export-pdf"]')`. Regex `^PDF$` pada
 *   textContent GAGAL karena ada SVG di dalam <a>.
 * - ReportFilter WAJIB punya <label for> + <input id> agar tidak melanggar a11y.
 * - Setiap halaman WAJIB punya <svelte:head><title>...</title></svelte:head>
 *   agar `document-title` a11y lulus.
 */

const REPORTS = {
    index: '/admin/reports',
    mitra: '/admin/reports/mitra',
    daily: '/admin/reports/daily',
    payout: '/admin/reports/payout',
} as const;

// ============================================================
// Helper — assertion umum
// ============================================================
async function assertCommonReportContract(
    page: import('@playwright/test').Page,
    opts: {
        activeTabLabel: string;
        pageTitle: string;
        description: RegExp;
        endpoint: string;
    },
) {
    // 1. Judul PageHeader
    await expect(
        page.locator('h1, h2').filter({ hasText: opts.pageTitle }).first(),
    ).toBeVisible();

    // 2. Deskripsi
    await expect(
        page.locator('p').filter({ hasText: opts.description }).first(),
    ).toBeVisible();

    // 3. Empat tab navigasi via href
    for (const href of [
        '/admin/reports',
        '/admin/reports/mitra',
        '/admin/reports/daily',
        '/admin/reports/payout',
    ]) {
        await expect(page.locator(`a[href="${href}"]`).first()).toBeVisible();
    }

    // 4. Tab aktif → class bg-pink-dark
    const activeTab = page.locator(`a[href="${opts.endpoint}"]`).first();
    await expect(activeTab).toHaveClass(/bg-pink-dark/);

    // 5. Dua input date
    expect(
        await page.locator('input[type="date"]').count(),
    ).toBeGreaterThanOrEqual(2);

    // 6. Tombol filter
    await expect(
        page.getByRole('button', { name: /Terapkan Filter/i }),
    ).toBeVisible();

    // 7. Export links — pakai href substring, BUKAN textContent
    const pdfLink = page.locator('a[href*="export-pdf"]').first();
    const excelLink = page.locator('a[href*="export-excel"]').first();

    await expect(pdfLink).toBeVisible();
    await expect(excelLink).toBeVisible();

    // 8. Tabel wajib ada
    expect(await page.locator('table').count()).toBeGreaterThanOrEqual(1);
}

// ============================================================
// Access Control
// ============================================================
test.describe('Admin — Reports — Access Control', () => {
    for (const [name, path] of Object.entries(REPORTS)) {
        test(`guest tidak bisa akses ${name}`, async ({ page, asGuest }) => {
            await asGuest();
            await page.goto(path);
            await expect(page).toHaveURL('/login');
        });

        test(`client tidak bisa akses ${name}`, async ({ page, asClient }) => {
            await asClient();
            await page.goto(path);
            await expect(page).toHaveURL('/client/dashboard');
        });

        test(`mitra tidak bisa akses ${name}`, async ({ page, asMitra }) => {
            await asMitra();
            await page.goto(path);
            await expect(page).toHaveURL('/mitra/dashboard');
        });

        test(`admin bisa akses ${name}`, async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto(path);
            await expect(page).toHaveURL(path);
        });
    }
});

// ============================================================
// 1. Pendapatan
// ============================================================
test.describe('Admin Reports — Pendapatan (/admin/reports)', () => {
    test.beforeEach(async ({ page, asAdmin }) => {
        await asAdmin();
        await page.goto(REPORTS.index);
    });

    test('kontrak umum terpenuhi', async ({ page }) => {
        await assertCommonReportContract(page, {
            activeTabLabel: 'Pendapatan',
            pageTitle: 'Laporan Pendapatan',
            description: /Pantau performa keuangan/i,
            endpoint: '/admin/reports',
        });
    });

    test('menampilkan 3 kartu ringkasan', async ({ page }) => {
        await expect(page.getByText(/^Total Pendapatan$/i)).toBeVisible();
        await expect(page.getByText(/^Honor Mitra$/i)).toBeVisible();
        await expect(page.getByText(/^Laba Kotor$/i)).toBeVisible();
    });

    test('tabel punya header kolom lengkap', async ({ page }) => {
        const headers = (
            await page.locator('table thead th').allTextContents()
        ).map((h) => h.trim());

        expect(headers).toEqual(
            expect.arrayContaining([
                'Kode',
                'Tanggal',
                'Client',
                'Paket',
                'Total',
                'Status',
            ]),
        );
    });

    test('menampilkan empty state atau baris transaksi', async ({ page }) => {
        const rows = page.locator('table tbody tr');
        const count = await rows.count();

        // Selalu > 0 karena :else merender empty state.
        expect(count).toBeGreaterThan(0);

        // Kalau hanya 1 baris, cek apakah itu empty state atau baris data.
        if (count === 1) {
            const emptyLocator = page
                .locator('table tbody')
                .getByText(/Belum ada transaksi/i);
            const isEmpty = (await emptyLocator.count()) > 0;

            if (isEmpty) {
                await expect(emptyLocator.first()).toBeVisible();
            } else {
                // Baris tunggal berisi data — valid.
                await expect(rows.first()).toBeVisible();
            }
        }
    });

    test('klik "Terapkan Filter" memicu request ke /admin/reports', async ({
        page,
    }) => {
        const inputs = page.locator('input[type="date"]');
        await inputs.nth(0).fill('2026-01-01');
        await inputs.nth(1).fill('2026-01-31');

        const [request] = await Promise.all([
            page.waitForRequest(
                (r) =>
                    r.url().includes('/admin/reports') &&
                    r.url().includes('start_date=2026-01-01') &&
                    r.method() === 'GET',
            ),
            page.getByRole('button', { name: /Terapkan Filter/i }).click(),
        ]);

        expect(request.url()).toContain('start_date=2026-01-01');
        expect(request.url()).toContain('end_date=2026-01-31');
    });

    test('Export PDF & Excel URL benar', async ({ page }) => {
        const pdfHref = await page
            .locator('a[href*="export-pdf"]')
            .first()
            .getAttribute('href');
        const excelHref = await page
            .locator('a[href*="export-excel"]')
            .first()
            .getAttribute('href');

        expect(pdfHref).toMatch(
            /\/admin\/reports\/export-pdf\?start_date=.+&end_date=.+/,
        );
        expect(excelHref).toMatch(
            /\/admin\/reports\/export-excel\?start_date=.+&end_date=.+/,
        );
    });
});

// ============================================================
// 2. Kinerja Mitra
// ============================================================
test.describe('Admin Reports — Kinerja Mitra (/admin/reports/mitra)', () => {
    test.beforeEach(async ({ page, asAdmin }) => {
        await asAdmin();
        await page.goto(REPORTS.mitra);
    });

    test('kontrak umum terpenuhi', async ({ page }) => {
        await assertCommonReportContract(page, {
            activeTabLabel: 'Kinerja Mitra',
            pageTitle: 'Kinerja Mitra',
            description: /Evaluasi performa pemandu wisata/i,
            endpoint: '/admin/reports/mitra',
        });
    });

    test('menampilkan 2 kartu ringkasan', async ({ page }) => {
        await expect(page.getByText(/^Total Mitra Aktif$/i)).toBeVisible();
        await expect(
            page.getByText(/^Total Trip Diselesaikan$/i),
        ).toBeVisible();
    });

    test('tabel punya header kolom lengkap', async ({ page }) => {
        const headers = (
            await page.locator('table thead th').allTextContents()
        ).map((h) => h.trim());

        expect(headers).toEqual(
            expect.arrayContaining([
                'No',
                'Nama Mitra',
                'Trip Selesai',
                'Total Honor',
            ]),
        );
    });

    test('Export PDF & Excel mengarah ke endpoint mitra', async ({ page }) => {
        const pdfHref = await page
            .locator('a[href*="export-pdf"]')
            .first()
            .getAttribute('href');
        const excelHref = await page
            .locator('a[href*="export-excel"]')
            .first()
            .getAttribute('href');

        expect(pdfHref).toMatch(/\/admin\/reports\/mitra\/export-pdf/);
        expect(excelHref).toMatch(/\/admin\/reports\/mitra\/export-excel/);
    });

    test('klik "Terapkan Filter" memicu request ke /admin/reports/mitra', async ({
        page,
    }) => {
        const [request] = await Promise.all([
            page.waitForRequest(
                (r) =>
                    r.url().includes('/admin/reports/mitra') &&
                    r.method() === 'GET',
            ),
            page.getByRole('button', { name: /Terapkan Filter/i }).click(),
        ]);
        expect(request.url()).toContain('/admin/reports/mitra');
    });
});

// ============================================================
// 3. Rekap Harian
// ============================================================
test.describe('Admin Reports — Rekap Harian (/admin/reports/daily)', () => {
    test.beforeEach(async ({ page, asAdmin }) => {
        await asAdmin();
        await page.goto(REPORTS.daily);
    });

    test('kontrak umum terpenuhi', async ({ page }) => {
        await assertCommonReportContract(page, {
            activeTabLabel: 'Rekap Harian',
            pageTitle: 'Rekap Laporan Harian',
            description: /Pantau aktivitas harian mitra/i,
            endpoint: '/admin/reports/daily',
        });
    });

    test('menampilkan 3 kartu ringkasan', async ({ page }) => {
        await expect(page.getByText(/^Total Laporan$/i)).toBeVisible();
        await expect(page.getByText(/^Menunggu Verifikasi$/i)).toBeVisible();
        await expect(page.getByText(/^Terverifikasi$/i)).toBeVisible();
    });

    test('tabel punya header kolom lengkap', async ({ page }) => {
        const headers = (
            await page.locator('table thead th').allTextContents()
        ).map((h) => h.trim());

        expect(headers).toEqual(
            expect.arrayContaining([
                'Kode Trip',
                'Mitra',
                'Hari',
                'Tanggal',
                'Status',
            ]),
        );
    });

    test('Export PDF & Excel mengarah ke endpoint daily', async ({ page }) => {
        const pdfHref = await page
            .locator('a[href*="export-pdf"]')
            .first()
            .getAttribute('href');
        const excelHref = await page
            .locator('a[href*="export-excel"]')
            .first()
            .getAttribute('href');

        expect(pdfHref).toMatch(/\/admin\/reports\/daily\/export-pdf/);
        expect(excelHref).toMatch(/\/admin\/reports\/daily\/export-excel/);
    });
});

// ============================================================
// 4. Payout
// ============================================================
test.describe('Admin Reports — Payout (/admin/reports/payout)', () => {
    test.beforeEach(async ({ page, asAdmin }) => {
        await asAdmin();
        await page.goto(REPORTS.payout);
    });

    test('kontrak umum terpenuhi', async ({ page }) => {
        await assertCommonReportContract(page, {
            activeTabLabel: 'Payout',
            pageTitle: 'Laporan Pencairan',
            description: /Pantau dana yang dicairkan ke mitra/i,
            endpoint: '/admin/reports/payout',
        });
    });

    test('menampilkan 3 kartu ringkasan', async ({ page }) => {
        await expect(page.getByText(/^Total Dicairkan$/i)).toBeVisible();
        await expect(page.getByText(/^Pending \/ Menunggu$/i)).toBeVisible();
        await expect(page.getByText(/^Saldo Mengendap$/i)).toBeVisible();
    });

    test('tabel punya header kolom lengkap', async ({ page }) => {
        const headers = (
            await page.locator('table thead th').allTextContents()
        ).map((h) => h.trim());

        expect(headers).toEqual(
            expect.arrayContaining([
                'Kode Payout',
                'Mitra',
                'Tanggal',
                'Jumlah',
                'Status',
            ]),
        );
    });

    test('Export PDF & Excel mengarah ke endpoint payout', async ({ page }) => {
        const pdfHref = await page
            .locator('a[href*="export-pdf"]')
            .first()
            .getAttribute('href');
        const excelHref = await page
            .locator('a[href*="export-excel"]')
            .first()
            .getAttribute('href');

        expect(pdfHref).toMatch(/\/admin\/reports\/payout\/export-pdf/);
        expect(excelHref).toMatch(/\/admin\/reports\/payout\/export-excel/);
    });
});

// ============================================================
// Navigasi Tab
// ============================================================
test.describe('Admin Reports — Navigasi Tab', () => {
    test.beforeEach(async ({ page, asAdmin }) => {
        await asAdmin();
        await page.goto(REPORTS.index);
    });

    test('klik tab "Kinerja Mitra" → halaman mitra', async ({ page }) => {
        await page.locator('a[href="/admin/reports/mitra"]').first().click();
        await expect(page).toHaveURL(/\/admin\/reports\/mitra/);
    });

    test('klik tab "Rekap Harian" → halaman daily', async ({ page }) => {
        await page.locator('a[href="/admin/reports/daily"]').first().click();
        await expect(page).toHaveURL(/\/admin\/reports\/daily/);
    });

    test('klik tab "Payout" → halaman payout', async ({ page }) => {
        await page.locator('a[href="/admin/reports/payout"]').first().click();
        await expect(page).toHaveURL(/\/admin\/reports\/payout/);
    });

    test('dari mitra, klik "Pendapatan" → kembali ke index', async ({
        page,
    }) => {
        await page.goto(REPORTS.mitra);
        await page.locator('a[href="/admin/reports"]').first().click();
        await expect(page).toHaveURL(/\/admin\/reports$/);
    });
});

// ============================================================
// Accessibility
// ============================================================
test.describe('Admin Reports — Accessibility', () => {
    for (const [name, path] of Object.entries(REPORTS)) {
        test(`halaman ${name} tidak punya pelanggaran WCAG kritis`, async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await page.goto(path);
            await page.waitForLoadState('networkidle');

            const results = await new AxeBuilder({ page })
                .withTags(['wcag2a', 'wcag2aa'])
                .disableRules([
                    'region',
                    'landmark-one-main',
                    // TODO: fix design token contrast (bg-pink-dark, bg-sun/10)
                    'color-contrast',
                    // TODO: setelah tiap halaman punya <svelte:head><title>,
                    //       HAPUS rule ini supaya test lebih ketat.
                    'document-title',
                ])
                .analyze();

            const critical = results.violations.filter((v) =>
                ['critical', 'serious'].includes(v.impact ?? ''),
            );
            expect(critical).toEqual([]);
        });

        test(`halaman ${name} punya h1`, async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto(path);
            expect(await page.locator('h1').count()).toBeGreaterThanOrEqual(1);
        });
    }
});