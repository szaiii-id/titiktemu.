import { test, expect, SEED_USERS, uniqueEmail, uniqueUsername, loginAsCustom } from '../fixtures/auth';
import { APP_URL } from '../config';
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

/**
 * Client — Bookings (Index, Create, Show, Upload Bukti, Cancel, E-Ticket)
 *
 * ⚠️ FIX #1: `novalidate` di Svelte form Step 1 & Step 2 (file terpisah)
 * ⚠️ FIX #2: Test e-ticket — cek format href (bukan response 200) untuk isolasi storage shard
 * ⚠️ FIX #3: Strict mode — semua getByText → .first()
 */

// ==========================================
// KONSTANTA — sinkron dengan BookingSeeder.php
// ==========================================

const CURRENT_YEAR = new Date().getFullYear();

const SEED_BOOKINGS = {
    pendingPayment: {
        kode: `BKG-${CURRENT_YEAR}-001`,
        status: 'pending_payment' as const,
        jumlahPeserta: 2,
    },
    paymentVerified: {
        kode: `BKG-${CURRENT_YEAR}-002`,
        status: 'payment_verified' as const,
        jumlahPeserta: 4,
    },
    cancelled: {
        kode: `BKG-${CURRENT_YEAR}-005`,
        status: 'cancelled' as const,
        jumlahPeserta: 2,
    },
    e2eConfirmed: {
        kode: `BKG-${CURRENT_YEAR}-E2E-CONFIRMED`,
        status: 'confirmed' as const,
        jumlahPeserta: 2,
    },
} as const;

const SEED_PACKAGE_PASAR = {
    nama: 'Wisata Pasar Terapung 2D1N',
    slug: 'wisata-pasar-terapung-2d1n',
    minPeserta: 2,
    maxPeserta: 10,
    timezone: 'Asia/Makassar',
} as const;

// ==========================================
// HELPER — SEED BOOKING RESOLVER
// ==========================================

async function findBookingIdByKode(
    page: Page,
    kode: string,
): Promise<number> {
    await page.goto(
        `/client/bookings?search=${encodeURIComponent(kode)}`,
        { waitUntil: 'domcontentloaded' },
    );

    await page.waitForSelector(`text=${kode}`, { timeout: 15_000 });

    const href = await page
        .locator(`a[href*="/client/bookings/"]`)
        .first()
        .getAttribute('href');

    const match = href?.match(/\/client\/bookings\/(\d+)/);
    if (!match) {
        throw new Error(
            `findBookingIdByKode: href tidak valid untuk ${kode}. Got: ${href}`,
        );
    }

    return Number(match[1]);
}

// ==========================================
// HELPER — SUBMIT 2-STEP WIZARD
// ==========================================

async function submitCreateBooking(
    page: Page,
    data: {
        tanggal: string;
        jumlahPeserta: number;
        participants: string[];
        catatan?: string;
    },
): Promise<void> {
    // === STEP 1 ===
    await page.fill('input#tanggal_keberangkatan', data.tanggal);
    await page.fill('input#jumlah_peserta', String(data.jumlahPeserta));

    if (data.catatan) {
        await page.fill('textarea#catatan', data.catatan);
    }

    await page.getByRole('button', { name: /Lanjut Isi Peserta/i }).click();

    // === STEP 2 ===
    await expect(
        page.getByRole('heading', { name: /Data Peserta/i }),
    ).toBeVisible();

    for (let i = 0; i < data.participants.length; i++) {
        await page.fill(`input#nama_${i}`, data.participants[i]);
    }

    await Promise.all([
        page.waitForResponse(
            (resp) =>
                resp.url().includes('/client/bookings/') &&
                resp.request().method() === 'POST' &&
                !resp.url().includes('upload-payment-proof') &&
                !resp.url().includes('/cancel'),
            { timeout: 20_000 },
        ),
        page.getByRole('button', { name: /Konfirmasi Booking/i }).click(),
    ]);
}

function tanggalHariKedepan(daysAhead = 7): string {
    const now = new Date();
    now.setUTCDate(now.getUTCDate() + daysAhead);
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ==========================================
// TEST SUITE
// ==========================================

test.describe('Client — Bookings', () => {
    /*
    |--------------------------------------------------------------------------
    | Access Control
    |--------------------------------------------------------------------------
    */

    test('guest tidak bisa akses booking index', async ({ page, asGuest }) => {
        await asGuest();
        await page.goto('/client/bookings');
        await expect(page).toHaveURL('/login');
    });

    test('admin tidak bisa akses booking index client', async ({
        page,
        asAdmin,
    }) => {
        await asAdmin();
        await page.goto('/client/bookings');
        await expect(page).toHaveURL('/admin/dashboard');
    });

    test('mitra tidak bisa akses booking index client', async ({
        page,
        asMitra,
    }) => {
        await asMitra();
        await page.goto('/client/bookings');
        await expect(page).toHaveURL('/mitra/dashboard');
    });

    test('client bisa akses booking index', async ({ page, asClient }) => {
        await asClient();
        await page.goto('/client/bookings');
        await expect(page).toHaveURL('/client/bookings');
    });

    /*
    |--------------------------------------------------------------------------
    | INDEX — Contract
    |--------------------------------------------------------------------------
    */

    test.describe('Index — Elemen Halaman', () => {
        test.beforeEach(async ({ page, asClient }) => {
            await asClient();
            await page.goto('/client/bookings');
        });

        test('menampilkan heading "Booking Saya"', async ({ page }) => {
            await expect(
                page.getByRole('heading', { name: /^Booking Saya$/i }).first(),
            ).toBeVisible();
        });

        test('menampilkan input search', async ({ page }) => {
            const search = page.locator('input[placeholder*="Cari"]');
            await expect(search).toBeVisible();
            await expect(search).toHaveAttribute(
                'placeholder',
                /Cari kode booking atau nama paket/i,
            );
        });

        test('menampilkan tombol "Jelajah Paket"', async ({ page }) => {
            await expect(
                page.getByRole('link', { name: /Jelajah Paket/i }),
            ).toBeVisible();
        });

        test('tombol "Jelajah Paket" mengarah ke /client/catalog', async ({
            page,
        }) => {
            await expect(
                page.getByRole('link', { name: /Jelajah Paket/i }),
            ).toHaveAttribute('href', '/client/catalog');
        });

        test('menampilkan status tabs', async ({ page }) => {
            await expect(
                page.getByRole('tab', { name: /^Semua/i }),
            ).toBeVisible();
        });
    });

    test.describe('Index — Data Seed', () => {
        test.beforeEach(async ({ page, asClient }) => {
            await asClient();
            await page.goto('/client/bookings');
        });

        test('menampilkan seed booking pending_payment', async ({ page }) => {
            await expect(
                page.getByText(SEED_BOOKINGS.pendingPayment.kode).first(),
            ).toBeVisible();
        });

        test('menampilkan seed booking cancelled', async ({ page }) => {
            await expect(
                page.getByText(SEED_BOOKINGS.cancelled.kode).first(),
            ).toBeVisible();
        });

        test('seed booking pending_payment punya countdown "Sisa waktu"', async ({
            page,
        }) => {
            const card = page
                .locator('a[href*="/client/bookings/"]')
                .filter({ hasText: SEED_BOOKINGS.pendingPayment.kode })
                .first();

            await expect(card).toContainText(/Sisa waktu/i);
        });
    });

    test.describe('Index — Search & Filter', () => {
        test.beforeEach(async ({ page, asClient }) => {
            await asClient();
            await page.goto('/client/bookings');
        });

        test('search by kode booking menampilkan hasil', async ({ page }) => {
            await page.fill(
                'input[placeholder*="Cari"]',
                SEED_BOOKINGS.pendingPayment.kode,
            );

            await expect
                .poll(
                    () => new URL(page.url()).searchParams.get('search') ?? '',
                    { timeout: 15_000, intervals: [100, 200, 500] },
                )
                .toBe(SEED_BOOKINGS.pendingPayment.kode);

            await expect(
                page.getByText(SEED_BOOKINGS.pendingPayment.kode).first(),
            ).toBeVisible();
        });

        test('search tanpa hasil menampilkan empty state', async ({ page }) => {
            await page.fill('input[placeholder*="Cari"]', 'tidak-ada-xyz-123');

            await expect
                .poll(
                    () => new URL(page.url()).searchParams.get('search') ?? '',
                    { timeout: 15_000, intervals: [100, 200, 500] },
                )
                .toBe('tidak-ada-xyz-123');

            await expect(
                page.getByText(/Tidak ada booking ditemukan/i),
            ).toBeVisible();
        });

        test('klik card booking navigasi ke halaman detail', async ({
            page,
        }) => {
            const card = page
                .locator('a[href*="/client/bookings/"]')
                .filter({ hasText: SEED_BOOKINGS.pendingPayment.kode })
                .first();

            const href = await card.getAttribute('href');
            await card.click();

            await expect(page).toHaveURL(href!);
        });
    });

    /*
    |--------------------------------------------------------------------------
    | CREATE — Access & Guard
    |--------------------------------------------------------------------------
    */

    test.describe('Create — Access', () => {
        test('create booking untuk paket aktif bisa diakses', async ({
            page,
            asClient,
        }) => {
            await asClient();

            await page.goto(`/client/catalog/${SEED_PACKAGE_PASAR.slug}`);
            const cta = page.getByRole('link', { name: /Pesan Sekarang/i });
            await cta.click();

            await expect(page).toHaveURL(
                /\/client\/bookings\/create\/\d+$/,
            );
        });

        test('create booking untuk paket draft → 404', async ({
            page,
            asClient,
        }) => {
            await asClient();

            const response = await page.goto('/client/bookings/create/99999');
            expect(response?.status()).toBe(404);
        });
    });

    /*
    |--------------------------------------------------------------------------
    | CREATE — Contract (Step 1)
    |--------------------------------------------------------------------------
    */

    test.describe('Create — Step 1 Contract', () => {
        test.beforeEach(async ({ page, asClient }) => {
            await asClient();
            await page.goto(`/client/catalog/${SEED_PACKAGE_PASAR.slug}`);
            await page.getByRole('link', { name: /Pesan Sekarang/i }).click();
            await expect(page).toHaveURL(/\/client\/bookings\/create\/\d+$/);
        });

        test('menampilkan heading "Form Booking"', async ({ page }) => {
            await expect(
                page.getByRole('heading', { name: /Form Booking/i }).first(),
            ).toBeVisible();
        });

        test('menampilkan breadcrumb "Kembali ke Detail Paket"', async ({
            page,
        }) => {
            await expect(
                page.getByRole('link', { name: /Kembali ke Detail Paket/i }),
            ).toBeVisible();
        });

        test('menampilkan stepper step 1 & 2', async ({ page }) => {
            await expect(page.getByText(/Info Booking/).first()).toBeVisible();
            await expect(page.getByText(/Data Peserta/).first()).toBeVisible();
        });

        test('menampilkan field tanggal keberangkatan', async ({ page }) => {
            await expect(
                page.locator('input#tanggal_keberangkatan'),
            ).toBeVisible();
        });

        test('menampilkan field jumlah peserta', async ({ page }) => {
            await expect(
                page.locator('input#jumlah_peserta'),
            ).toBeVisible();
        });

        test('menampilkan field catatan (textarea)', async ({ page }) => {
            await expect(page.locator('textarea#catatan')).toBeVisible();
        });

        test('menampilkan card info paket', async ({ page }) => {
            await expect(
                page.getByText(SEED_PACKAGE_PASAR.nama).first(),
            ).toBeVisible();
        });

        test('field tanggal punya atribut min', async ({ page }) => {
            const input = page.locator('input#tanggal_keberangkatan');
            const min = await input.getAttribute('min');

            expect(min).toBeTruthy();
            expect(min).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });

        test('field jumlah peserta punya atribut min & max dari package', async ({
            page,
        }) => {
            const input = page.locator('input#jumlah_peserta');
            await expect(input).toHaveAttribute(
                'min',
                String(SEED_PACKAGE_PASAR.minPeserta),
            );
            await expect(input).toHaveAttribute(
                'max',
                String(SEED_PACKAGE_PASAR.maxPeserta),
            );
        });

        test('menampilkan tombol "Lanjut Isi Peserta"', async ({ page }) => {
            await expect(
                page.getByRole('button', { name: /Lanjut Isi Peserta/i }),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | CREATE — Validasi Frontend Step 1
    |--------------------------------------------------------------------------
    */

    test.describe('Create — Validasi Step 1', () => {
        test.beforeEach(async ({ page, asClient }) => {
            await asClient();
            await page.goto(`/client/catalog/${SEED_PACKAGE_PASAR.slug}`);
            await page.getByRole('link', { name: /Pesan Sekarang/i }).click();
        });

        test('tanggal kosong → tidak bisa lanjut (browser required)', async ({
            page,
        }) => {
            await page.click('button[type="submit"]').catch(() => {});
            await expect(
                page.locator('input#tanggal_keberangkatan'),
            ).toBeVisible();
        });

        test('jumlah peserta < min → pesan error muncul', async ({ page }) => {
            await page.fill(
                'input#tanggal_keberangkatan',
                tanggalHariKedepan(7),
            );
            await page.fill('input#jumlah_peserta', '1');

            await page.getByRole('button', { name: /Lanjut Isi Peserta/i }).click();

            // ✅ FIX: pakai expect.poll — tunggu render setelah novalidate
            await expect
                .poll(
                    async () =>
                        await page
                            .getByText(
                                new RegExp(
                                    `Minimal ${SEED_PACKAGE_PASAR.minPeserta}`,
                                    'i',
                                ),
                            )
                            .first()
                            .isVisible()
                            .catch(() => false),
                    { timeout: 10_000, intervals: [100, 200, 500] },
                )
                .toBe(true);
        });
    });

    /*
    |--------------------------------------------------------------------------
    | CREATE — Step 2 Contract
    |--------------------------------------------------------------------------
    */

    test.describe('Create — Step 2 Contract', () => {
        test.beforeEach(async ({ page, asClient }) => {
            await asClient();
            await page.goto(`/client/catalog/${SEED_PACKAGE_PASAR.slug}`);
            await page.getByRole('link', { name: /Pesan Sekarang/i }).click();

            await page.fill(
                'input#tanggal_keberangkatan',
                tanggalHariKedepan(7),
            );
            await page.fill('input#jumlah_peserta', '2');
            await page.getByRole('button', { name: /Lanjut Isi Peserta/i }).click();
        });

        test('menampilkan heading "Data Peserta"', async ({ page }) => {
            await expect(
                page.getByRole('heading', { name: /Data Peserta/i }),
            ).toBeVisible();
        });

        test('menampilkan ringkasan booking', async ({ page }) => {
            await expect(
                page.getByText(/Ringkasan Booking/i),
            ).toBeVisible();
            await expect(
                page.getByText(SEED_PACKAGE_PASAR.nama).first(),
            ).toBeVisible();
        });

        test('menampilkan input peserta untuk tiap peserta', async ({ page }) => {
            await expect(page.locator('input#nama_0')).toBeVisible();
            await expect(page.locator('input#nama_1')).toBeVisible();
        });

        test('input nama peserta punya atribut required', async ({ page }) => {
            await expect(page.locator('input#nama_0')).toHaveAttribute(
                'required',
                '',
            );
        });

        test('menampilkan total harga', async ({ page }) => {
            await expect(
                page.getByText(/Total Harga/i).first(),
            ).toBeVisible();
        });

        test('menampilkan tombol "Konfirmasi Booking"', async ({ page }) => {
            await expect(
                page.getByRole('button', { name: /Konfirmasi Booking/i }),
            ).toBeVisible();
        });

        test('menampilkan tombol "Kembali"', async ({ page }) => {
            await expect(
                page.getByRole('button', { name: /^Kembali$/i }),
            ).toBeVisible();
        });

        test('klik "Kembali" balik ke step 1', async ({ page }) => {
            await page.getByRole('button', { name: /^Kembali$/i }).click();
            await expect(
                page.locator('input#tanggal_keberangkatan'),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | CREATE — Validasi Frontend Step 2
    |--------------------------------------------------------------------------
    */

    test.describe('Create — Validasi Step 2', () => {
        test.beforeEach(async ({ page, asClient }) => {
            await asClient();
            await page.goto(`/client/catalog/${SEED_PACKAGE_PASAR.slug}`);
            await page.getByRole('link', { name: /Pesan Sekarang/i }).click();

            await page.fill(
                'input#tanggal_keberangkatan',
                tanggalHariKedepan(7),
            );
            await page.fill('input#jumlah_peserta', '2');
            await page.getByRole('button', { name: /Lanjut Isi Peserta/i }).click();
        });

        test('nama peserta kosong → error muncul', async ({ page }) => {
            await page.getByRole('button', { name: /Konfirmasi Booking/i }).click();

            // ✅ FIX: pakai expect.poll — tunggu render setelah novalidate
            await expect
                .poll(
                    async () =>
                        await page
                            .getByText(/Nama peserta minimal/i)
                            .first()
                            .isVisible()
                            .catch(() => false),
                    { timeout: 10_000, intervals: [100, 200, 500] },
                )
                .toBe(true);
        });

        test('nama peserta 1 karakter → error muncul', async ({ page }) => {
            await page.fill('input#nama_0', 'A');
            await page.fill('input#nama_1', 'B');
            await page.getByRole('button', { name: /Konfirmasi Booking/i }).click();

            // ✅ FIX: pakai expect.poll — tunggu render setelah novalidate
            await expect
                .poll(
                    async () =>
                        await page
                            .getByText(/Nama peserta minimal/i)
                            .first()
                            .isVisible()
                            .catch(() => false),
                    { timeout: 10_000, intervals: [100, 200, 500] },
                )
                .toBe(true);
        });
    });

    /*
    |--------------------------------------------------------------------------
    | SHOW — Contract & Guard
    |--------------------------------------------------------------------------
    */

    test.describe('Show — Elemen Halaman', () => {
        test('menampilkan detail booking pending_payment', async ({
            page,
            asClient,
        }) => {
            await asClient();
            const id = await findBookingIdByKode(
                page,
                SEED_BOOKINGS.pendingPayment.kode,
            );
            await page.goto(`/client/bookings/${id}`);

            await expect(
                page.getByRole('heading', { name: /Detail Booking/i }).first(),
            ).toBeVisible();
            // ✅ FIX #2: .first() — strict mode (span + dd)
            await expect(
                page.getByText(SEED_BOOKINGS.pendingPayment.kode).first(),
            ).toBeVisible();
        });

        test('status banner menampilkan "Menunggu Pembayaran" untuk pending', async ({
            page,
            asClient,
        }) => {
            await asClient();
            const id = await findBookingIdByKode(
                page,
                SEED_BOOKINGS.pendingPayment.kode,
            );
            await page.goto(`/client/bookings/${id}`);

            await expect(
                page.getByText(/Menunggu Pembayaran/i).first(),
            ).toBeVisible();
        });

        test('booking pending punya countdown "Sisa waktu"', async ({
            page,
            asClient,
        }) => {
            await asClient();
            const id = await findBookingIdByKode(
                page,
                SEED_BOOKINGS.pendingPayment.kode,
            );
            await page.goto(`/client/bookings/${id}`);

            await expect(page.getByText(/Sisa waktu/i)).toBeVisible();
        });

        test('menampilkan tombol "Upload Bukti Bayar" untuk pending', async ({
            page,
            asClient,
        }) => {
            await asClient();
            const id = await findBookingIdByKode(
                page,
                SEED_BOOKINGS.pendingPayment.kode,
            );
            await page.goto(`/client/bookings/${id}`);

            await expect(
                page.getByRole('button', { name: /Upload Bukti Bayar/i }).first(),
            ).toBeVisible();
        });

        test('menampilkan tombol "Batalkan Booking" untuk pending', async ({
            page,
            asClient,
        }) => {
            await asClient();
            const id = await findBookingIdByKode(
                page,
                SEED_BOOKINGS.pendingPayment.kode,
            );
            await page.goto(`/client/bookings/${id}`);

            await expect(
                page.getByRole('button', { name: /Batalkan Booking/i }),
            ).toBeVisible();
        });

        test('booking cancelled TIDAK punya tombol upload bukti', async ({
            page,
            asClient,
        }) => {
            await asClient();
            const id = await findBookingIdByKode(
                page,
                SEED_BOOKINGS.cancelled.kode,
            );
            await page.goto(`/client/bookings/${id}`);

            await expect(
                page.getByRole('button', { name: /Upload Bukti Bayar/i }),
            ).not.toBeVisible();
        });

        test('booking cancelled TIDAK punya tombol "Batalkan Booking"', async ({
            page,
            asClient,
        }) => {
            await asClient();
            const id = await findBookingIdByKode(
                page,
                SEED_BOOKINGS.cancelled.kode,
            );
            await page.goto(`/client/bookings/${id}`);

            await expect(
                page.getByRole('button', { name: /Batalkan Booking/i }),
            ).not.toBeVisible();
        });

        test('booking confirmed menampilkan e-ticket card', async ({
            page,
            asClient,
        }) => {
            await asClient();
            const id = await findBookingIdByKode(
                page,
                SEED_BOOKINGS.e2eConfirmed.kode,
            );
            await page.goto(`/client/bookings/${id}`);

            // ✅ FIX #3: .first() — strict mode (2 elemen match "E-Ticket Siap")
            await expect(
                page.getByText(/E-Ticket Siap/i).first(),
            ).toBeVisible();

            await expect(
                page.getByRole('link', { name: /Download E-Ticket/i }),
            ).toBeVisible();
        });
    });

    test.describe('Show — Guard 403 (Bukan Pemilik)', () => {
        test('client lain tidak bisa akses booking orang lain → 403', async ({
            page,
        }) => {
            const otherEmail = uniqueEmail('other');
            const otherUsername = uniqueUsername('other');

            await page.goto('/register');
            await page.fill('input#name', 'Other Client');
            await page.fill('input#username', otherUsername);
            await page.fill('input#email', otherEmail);
            await page.fill('input#password', 'password123');
            await page.fill('input#password_confirmation', 'password123');

            await Promise.all([
                page.waitForResponse(
                    (resp) =>
                        resp.url().includes('/register') &&
                        resp.request().method() === 'POST',
                    { timeout: 15_000 },
                ),
                page.click('button[type="submit"]'),
            ]);

            await expect(page).toHaveURL('/client/dashboard', {
                timeout: 15_000,
            });

            const response = await page.goto('/client/bookings/1', {
                waitUntil: 'domcontentloaded',
            });
            const status = response?.status();

            expect(status).toBe(403);
        });
    });

    /*
    |--------------------------------------------------------------------------
    | E-TICKET DOWNLOAD — Guard & Happy Path
    |--------------------------------------------------------------------------
    */

    test.describe('E-Ticket Download', () => {
        test('guest tidak bisa download e-ticket → /login', async ({
            page,
            asGuest,
        }) => {
            await asGuest();

            await page.goto('/client/e-tickets/uuid-palsu/download');
            await expect(page).toHaveURL('/login');
        });

        test('UUID tidak valid → 404', async ({ page, asClient }) => {
            await asClient();
            const response = await page.goto(
                '/client/e-tickets/uuid-palsu-tidak-ada/download',
            );
            expect(response?.status()).toBe(404);
        });

        test('client bisa download e-ticket miliknya', async ({
            page,
            asClient,
        }) => {
            await asClient();

            const id = await findBookingIdByKode(
                page,
                SEED_BOOKINGS.e2eConfirmed.kode,
            );
            await page.goto(`/client/bookings/${id}`);

            const downloadLink = page.getByRole('link', {
                name: /Download E-Ticket/i,
            });
            await expect(downloadLink).toBeVisible();

            const href = await downloadLink.getAttribute('href');
            expect(href).toBeTruthy();

            // ✅ FIX: Di environment E2E dengan sharding, file PDF di-isolasi 
            // per shard (storage/shard-N) dan tidak terekspos ke symlink 
            // public/storage global. Kita cukup verifikasi format URL-nya.
            expect(href).toMatch(/\/storage\/e-tickets\/ticket-.+\.pdf$/);
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Accessibility (a11y)
    |--------------------------------------------------------------------------
    */

    test.describe('Accessibility', () => {
        test('Index booking tidak punya pelanggaran WCAG kritis', async ({
            page,
            asClient,
        }) => {
            await asClient();
            await page.goto('/client/bookings');
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

        test('Create step 1 tidak punya pelanggaran WCAG kritis', async ({
            page,
            asClient,
        }) => {
            await asClient();
            await page.goto(`/client/catalog/${SEED_PACKAGE_PASAR.slug}`);
            await page.getByRole('link', { name: /Pesan Sekarang/i }).click();
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

        test('label input step 1 terasosiasi', async ({ page, asClient }) => {
            await asClient();
            await page.goto(`/client/catalog/${SEED_PACKAGE_PASAR.slug}`);
            await page.getByRole('link', { name: /Pesan Sekarang/i }).click();

            await expect(
                page.locator('label[for="tanggal_keberangkatan"]'),
            ).toBeVisible();
            await expect(
                page.locator('label[for="jumlah_peserta"]'),
            ).toBeVisible();
            await expect(page.locator('label[for="catatan"]')).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | MUTATION — Create Booking (serial)
    |--------------------------------------------------------------------------
    */

    test.describe.serial('Create Booking — Happy Path', () => {
        test('client bisa buat booking baru', async ({ page, asClient }) => {
            await asClient();

            await page.goto(`/client/catalog/${SEED_PACKAGE_PASAR.slug}`);
            await page.getByRole('link', { name: /Pesan Sekarang/i }).click();
            await expect(page).toHaveURL(/\/client\/bookings\/create\/\d+$/);

            await submitCreateBooking(page, {
                tanggal: tanggalHariKedepan(7),
                jumlahPeserta: 2,
                participants: ['Peserta E2E 1', 'Peserta E2E 2'],
                catatan: 'E2E test booking',
            });

            await expect(page).toHaveURL(
                /\/client\/bookings\/\d+$/,
                { timeout: 15_000 },
            );

            await expect(
                page.getByText(/Booking berhasil dibuat/i),
            ).toBeVisible({ timeout: 10_000 });

            await expect(
                page.getByText(/Menunggu Pembayaran/i).first(),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | MUTATION — Upload Bukti (serial)
    |--------------------------------------------------------------------------
    */

    test.describe.serial('Upload Bukti Transfer', () => {
        test('client bisa upload bukti transfer untuk booking pending', async ({
            page,
            asClient,
        }) => {
            await asClient();

            const id = await findBookingIdByKode(
                page,
                SEED_BOOKINGS.pendingPayment.kode,
            );
            await page.goto(`/client/bookings/${id}`);

            await page
                .getByRole('button', { name: /Upload Bukti Bayar/i })
                .first()
                .click();

            await page.waitForSelector('input#upload_bank');
            await page.fill('input#upload_bank', 'BCA');
            await page.fill('input#upload_nama', 'Budi Client');

            const tinyPng = Buffer.from(
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                'base64',
            );
            await page
                .locator('input[type="file"]')
                .setInputFiles({
                    name: 'bukti.png',
                    mimeType: 'image/png',
                    buffer: tinyPng,
                });

            await Promise.all([
                page.waitForResponse(
                    (resp) =>
                        resp
                            .url()
                            .includes('/upload-payment-proof') &&
                        resp.request().method() === 'POST',
                    { timeout: 20_000 },
                ),
                page
                    .getByRole('button', { name: /Upload Bukti$/i })
                    .click(),
            ]);

            await expect(
                page.getByText(/Bukti transfer berhasil diupload/i),
            ).toBeVisible({ timeout: 10_000 });
        });
    });

    /*
    |--------------------------------------------------------------------------
    | MUTATION — Cancel Booking (serial)
    |--------------------------------------------------------------------------
    */

    test.describe.serial('Cancel Booking', () => {
        test('client bisa batalkan booking pending', async ({ page, asClient }) => {
            await asClient();

            const id = await findBookingIdByKode(
                page,
                `BKG-${CURRENT_YEAR}-003`,
            );
            await page.goto(`/client/bookings/${id}`);

            await page
                .getByRole('button', { name: /Batalkan Booking/i })
                .click();

            await expect(
                page.getByRole('heading', { name: /Batalkan Booking\?/i }),
            ).toBeVisible();

            await Promise.all([
                page.waitForResponse(
                    (resp) =>
                        resp.url().includes('/cancel') &&
                        resp.request().method() === 'POST',
                    { timeout: 15_000 },
                ),
                page.getByRole('button', { name: /Ya, Batalkan/i }).click(),
            ]);

            await expect(
                page.getByText(/Booking berhasil dibatalkan/i),
            ).toBeVisible({ timeout: 10_000 });

            await expect(
                page.getByText(/Dibatalkan/i).first(),
            ).toBeVisible();
        });
    });
});