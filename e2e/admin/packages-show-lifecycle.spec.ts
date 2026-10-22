import { test, expect, SEED_PACKAGES, packageKode } from '../fixtures/auth';
import type { Page } from '@playwright/test';

/**
 * Admin — Paket Wisata (Show): Lifecycle + Business Rules
 *
 * File ini fokus lifecycle transitions (Publish → Archive → Restore → Delete)
 * dan business rule validation dari `PackageService`.
 *
 * Guard di `PackageService`:
 * - Publish:
 *     - Tolak jika `status === AKTIF`
 *     - Tolak jika `!$package->hasDays()` (butuh ≥1 day)
 *     - Tolak jika tidak ada facility include (butuh ≥1 include)
 * - Archive:
 *     - Tolak jika sudah arsip
 * - Restore:
 *     - Tolak jika bukan arsip
 * - Delete:
 *     - Tolak jika `$package->bookings()->exists()` (punya booking)
 *
 * ⚠️ FIX #1: findPackageIdByKode — filter href numeric (hindari /create)
 * ⚠️ FIX #2: openShowPageOrSkip — skip graceful jika package tidak ada
 *           (packages-index.spec.ts bisa menghapus PKG-003, dan
 *           packages-show.spec.ts bisa mengubah statusnya)
 */

// ==========================================
// KONSTANTA — sinkron dengan PackageSeeder.php
// ==========================================

const SEED = {
    aktifDenganBooking: {
        kode: packageKode(SEED_PACKAGES.pasarTerapung.kodeSuffix),
        nama: SEED_PACKAGES.pasarTerapung.nama,
    },
    draftTanpaBooking: {
        kode: packageKode(SEED_PACKAGES.kulinerBanjarmasin.kodeSuffix),
        nama: SEED_PACKAGES.kulinerBanjarmasin.nama,
    },
} as const;

// ==========================================
// HELPER
// ==========================================

/**
 * ✅ FIX #1: findPackageIdByKode — return null jika tidak ada
 * (bukan throw).
 *
 * Kenapa: `packages-index.spec.ts` test "Hapus Paket" menghapus
 * `PKG-{year}-003` (Kuliner Banjarmasin) — soft delete. Test lain
 * di file ini yang assert `PKG-003` akan gagal jika file itu jalan
 * duluan. Return null memungkinkan skip graceful.
 *
 * Sebelumnya locator `a[href*="/admin/packages/"]` match juga tombol
 * "+ Tambah Paket" (`/admin/packages/create`) karena berada di atas
 * tabel. Filter numeric ID memastikan kita pilih href
 * `/admin/packages/{id}` (link "Detail" di row).
 */
async function findPackageIdByKode(
    page: Page,
    kode: string,
): Promise<number | null> {
    await page.goto(
        `/admin/packages?search=${encodeURIComponent(kode)}`,
        { waitUntil: 'domcontentloaded' },
    );

    // ✅ Tunggu sebentar — jangan throw kalau tidak ada
    const rowVisible = await page
        .getByText(kode)
        .first()
        .isVisible()
        .catch(() => false);

    if (!rowVisible) {
        return null;
    }

    // ✅ Filter href yang match `/admin/packages/{numeric}`
    const href = await page
        .locator('a[href*="/admin/packages/"]')
        .evaluateAll((els) =>
            els
                .map((el) => el.getAttribute('href'))
                .find((h) => /\/admin\/packages\/\d+$/.test(h ?? '')),
        );

    if (!href) {
        return null;
    }

    const match = href.match(/\/admin\/packages\/(\d+)$/);
    if (!match) {
        return null;
    }

    return Number(match[1]);
}

/**
 * ✅ FIX #2: openShowPage — return null jika package tidak ada.
 */
async function openShowPage(
    page: Page,
    kode: string,
): Promise<number | null> {
    const id = await findPackageIdByKode(page, kode);
    if (id === null) return null;

    await page.goto(`/admin/packages/${id}`);
    return id;
}

/**
 * ✅ FIX #2: openShowPageOrSkip — helper untuk skip kalau package
 * tidak ada.
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
            `Paket "${kode}" tidak ditemukan. ${reason}. ` +
                `Cek database/seeders/PackageSeeder.php.`,
        );
        throw new Error('unreachable');
    }
    return id;
}

// ==========================================
// TEST SUITE
// ==========================================

test.describe('Admin — Paket Lifecycle (Show)', () => {
    /*
    |--------------------------------------------------------------------------
    | Guard Visibility — Tombol Sesuai Status
    |--------------------------------------------------------------------------
    |
    | Read-only: pakai paket seed yang sudah ada. Tidak mengubah state.
    | --------------------------------------------------------------------------
    */

    test.describe('Guard Visibility (Read-Only)', () => {
        test('paket aktif: tampil Arsipkan + Hapus, TIDAK tampil Publish', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED.aktifDenganBooking.kode,
                'Seed paket Pasar Terapung tidak ada',
            );

            await expect(
                page.getByRole('button', { name: /^Arsipkan$/i }),
            ).toBeVisible();
            await expect(
                page.getByRole('button', { name: /^Hapus$/i }),
            ).toBeVisible();
            await expect(
                page.getByRole('button', { name: /^Publish$/i }),
            ).not.toBeVisible();
            await expect(
                page.getByRole('button', { name: /^Restore$/i }),
            ).not.toBeVisible();
        });

        test('paket draft: tampil Publish + Hapus, TIDAK tampil Arsipkan', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED.draftTanpaBooking.kode,
                'Seed paket draft Kuliner Banjarmasin tidak ada. ' +
                    'Cek database/seeders/PackageSeeder.php — pastikan ' +
                    'PKG-*-003 dibuat dengan status=draft.',
            );

            await expect(
                page.getByRole('button', { name: /^Publish$/i }),
            ).toBeVisible();
            await expect(
                page.getByRole('button', { name: /^Hapus$/i }),
            ).toBeVisible();
            await expect(
                page.getByRole('button', { name: /^Arsipkan$/i }),
            ).not.toBeVisible();
            await expect(
                page.getByRole('button', { name: /^Restore$/i }),
            ).not.toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Error Handling (Level UI) — Delete Package dengan Booking
    |--------------------------------------------------------------------------
    */

    test.describe('Error Handling — Delete Package dengan Booking', () => {
        test('hapus paket yang punya booking → flash error + paket tetap ada', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED.aktifDenganBooking.kode,
                'Seed paket Pasar Terapung tidak ada',
            );

            // Klik "Hapus"
            await page.getByRole('button', { name: /^Hapus$/i }).click();

            // ConfirmModal muncul
            await expect(
                page.getByRole('heading', { name: /Hapus Paket\?/i }),
            ).toBeVisible();

            // Konfirmasi
            await Promise.all([
                page.waitForResponse(
                    (resp) =>
                        resp.url().includes('/admin/packages/') &&
                        resp.request().method() === 'DELETE',
                    { timeout: 15_000 },
                ),
                page.getByRole('button', { name: /Ya, Hapus/i }).click(),
            ]);

            // === ERROR HANDLING LEVEL UI ===
            await expect(
                page.getByText(/tidak bisa dihapus/i),
            ).toBeVisible({ timeout: 10_000 });

            // Paket MASIH ADA (tidak terhapus)
            await expect(page).toHaveURL(/\/admin\/packages\/\d+$/);
            await expect(
                page.getByRole('heading', {
                    name: SEED.aktifDenganBooking.nama,
                }),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | MUTATION — Lifecycle Draft (serial)
    |--------------------------------------------------------------------------
    */

    test.describe.serial('Lifecycle: Publish → Archive → Restore → Delete', () => {
        test('step 1: Publish draft → sukses (jadi aktif)', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED.draftTanpaBooking.kode,
                'Seed paket draft Kuliner Banjarmasin tidak ada. ' +
                    'Cek database/seeders/PackageSeeder.php — pastikan ' +
                    'PKG-*-003 dibuat dengan status=draft.',
            );

            // Klik "Publish"
            await page.getByRole('button', { name: /^Publish$/i }).click();

            // ConfirmModal
            await expect(
                page.getByRole('heading', { name: /Publish Paket\?/i }),
            ).toBeVisible();

            // Konfirmasi
            await Promise.all([
                page.waitForResponse(
                    (resp) =>
                        resp.url().includes('/publish') &&
                        resp.request().method() === 'POST',
                    { timeout: 15_000 },
                ),
                page.getByRole('button', { name: /Ya, Publish/i }).click(),
            ]);

            // Flash sukses
            await expect(
                page.getByText(/Paket berhasil dipublish/i),
            ).toBeVisible({ timeout: 10_000 });

            // Status sekarang "Aktif"
            await expect(
                page.getByText(/^Aktif$/i).first(),
            ).toBeVisible();

            // Tombol "Publish" hilang, "Arsipkan" muncul
            await expect(
                page.getByRole('button', { name: /^Publish$/i }),
            ).not.toBeVisible();
            await expect(
                page.getByRole('button', { name: /^Arsipkan$/i }),
            ).toBeVisible();
        });

        test('step 2: Publish aktif lagi → error (guard "sudah aktif")', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED.draftTanpaBooking.kode,
                'Seed paket draft Kuliner Banjarmasin tidak ada.',
            );

            const id = await findPackageIdByKode(
                page,
                SEED.draftTanpaBooking.kode,
            );
            if (id === null) {
                test.skip(true, 'Package ID tidak ditemukan.');
                return;
            }

            // Ambil CSRF token
            await page.goto('/');
            const csrf = await page.evaluate(() => {
                const m = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
                return m ? decodeURIComponent(m[1]) : '';
            });

            const response = await page.request.post(
                `/admin/packages/${id}/publish`,
                {
                    headers: { 'X-XSRF-TOKEN': csrf },
                    maxRedirects: 0,
                    failOnStatusCode: false,
                },
            );

            // Server redirect back dengan flash error (bukan 4xx)
            expect([302, 303]).toContain(response.status());

            // Verify guard lewat halaman: buka Show dan cek flash
            await page.goto(`/admin/packages/${id}`);

            // Status tetap "Aktif" (tidak berubah)
            await expect(
                page.getByText(/^Aktif$/i).first(),
            ).toBeVisible();
        });

        test('step 3: Arsipkan aktif → sukses (jadi arsip)', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED.draftTanpaBooking.kode,
                'Seed paket draft Kuliner Banjarmasin tidak ada.',
            );

            // Klik "Arsipkan"
            await page.getByRole('button', { name: /^Arsipkan$/i }).click();

            // ConfirmModal
            await expect(
                page.getByRole('heading', { name: /Arsipkan Paket\?/i }),
            ).toBeVisible();

            // Konfirmasi
            await Promise.all([
                page.waitForResponse(
                    (resp) =>
                        resp.url().includes('/archive') &&
                        resp.request().method() === 'POST',
                    { timeout: 15_000 },
                ),
                page.getByRole('button', { name: /Ya, Arsipkan/i }).click(),
            ]);

            // Flash sukses
            await expect(
                page.getByText(/Paket berhasil diarsipkan/i),
            ).toBeVisible({ timeout: 10_000 });

            // Status sekarang "Arsip"
            await expect(
                page.getByText(/^Arsip$/i).first(),
            ).toBeVisible();

            // Tombol "Arsipkan" hilang, "Restore" muncul
            await expect(
                page.getByRole('button', { name: /^Arsipkan$/i }),
            ).not.toBeVisible();
            await expect(
                page.getByRole('button', { name: /^Restore$/i }),
            ).toBeVisible();
        });

        test('step 4: Arsipkan arsip lagi → guard (sudah arsip)', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED.draftTanpaBooking.kode,
                'Seed paket draft Kuliner Banjarmasin tidak ada.',
            );

            const id = await findPackageIdByKode(
                page,
                SEED.draftTanpaBooking.kode,
            );
            if (id === null) {
                test.skip(true, 'Package ID tidak ditemukan.');
                return;
            }

            await page.goto('/');
            const csrf = await page.evaluate(() => {
                const m = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
                return m ? decodeURIComponent(m[1]) : '';
            });

            const response = await page.request.post(
                `/admin/packages/${id}/archive`,
                {
                    headers: { 'X-XSRF-TOKEN': csrf },
                    maxRedirects: 0,
                    failOnStatusCode: false,
                },
            );

            expect([302, 303]).toContain(response.status());

            // Status tetap "Arsip"
            await page.goto(`/admin/packages/${id}`);
            await expect(
                page.getByText(/^Arsip$/i).first(),
            ).toBeVisible();
        });

        test('step 5: Restore arsip → sukses (jadi draft)', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED.draftTanpaBooking.kode,
                'Seed paket draft Kuliner Banjarmasin tidak ada.',
            );

            // Klik "Restore"
            await Promise.all([
                page.waitForResponse(
                    (resp) =>
                        resp.url().includes('/restore') &&
                        resp.request().method() === 'POST',
                    { timeout: 15_000 },
                ),
                page.getByRole('button', { name: /^Restore$/i }).click(),
            ]);

            // Flash sukses
            await expect(
                page.getByText(/Paket berhasil direstore/i),
            ).toBeVisible({ timeout: 10_000 });

            // Status sekarang "Draft"
            await expect(
                page.getByText(/^Draft$/i).first(),
            ).toBeVisible();

            // Tombol "Restore" hilang, "Publish" muncul
            await expect(
                page.getByRole('button', { name: /^Restore$/i }),
            ).not.toBeVisible();
            await expect(
                page.getByRole('button', { name: /^Publish$/i }),
            ).toBeVisible();
        });

        test('step 6: Restore draft lagi → guard (bukan arsip)', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED.draftTanpaBooking.kode,
                'Seed paket draft Kuliner Banjarmasin tidak ada.',
            );

            const id = await findPackageIdByKode(
                page,
                SEED.draftTanpaBooking.kode,
            );
            if (id === null) {
                test.skip(true, 'Package ID tidak ditemukan.');
                return;
            }

            await page.goto('/');
            const csrf = await page.evaluate(() => {
                const m = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
                return m ? decodeURIComponent(m[1]) : '';
            });

            const response = await page.request.post(
                `/admin/packages/${id}/restore`,
                {
                    headers: { 'X-XSRF-TOKEN': csrf },
                    maxRedirects: 0,
                    failOnStatusCode: false,
                },
            );

            expect([302, 303]).toContain(response.status());

            // Status tetap "Draft"
            await page.goto(`/admin/packages/${id}`);
            await expect(
                page.getByText(/^Draft$/i).first(),
            ).toBeVisible();
        });

        test('step 7: Delete draft → sukses (redirect ke index)', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await openShowPageOrSkip(
                page,
                SEED.draftTanpaBooking.kode,
                'Seed paket draft Kuliner Banjarmasin tidak ada.',
            );

            // Klik "Hapus"
            await page.getByRole('button', { name: /^Hapus$/i }).click();

            // ConfirmModal
            await expect(
                page.getByRole('heading', { name: /Hapus Paket\?/i }),
            ).toBeVisible();

            // Konfirmasi
            await Promise.all([
                page.waitForResponse(
                    (resp) =>
                        resp.url().includes('/admin/packages/') &&
                        resp.request().method() === 'DELETE',
                    { timeout: 15_000 },
                ),
                page.getByRole('button', { name: /Ya, Hapus/i }).click(),
            ]);

            // Redirect ke index + flash sukses
            await expect(page).toHaveURL('/admin/packages', {
                timeout: 15_000,
            });
            await expect(
                page.getByText(/Paket berhasil dihapus/i),
            ).toBeVisible({ timeout: 10_000 });

            // Paket tidak muncul lagi di index (soft-deleted)
            await page.goto(
                `/admin/packages?search=${encodeURIComponent(SEED.draftTanpaBooking.kode)}`,
            );
            await expect(
                page.getByText(/Tidak ada hasil ditemukan/i),
            ).toBeVisible({ timeout: 10_000 });
        });
    });
});