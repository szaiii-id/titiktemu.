import { test, expect } from '../fixtures/auth';

/**
 * Contact — Form Kontak Landing Page
 *
 * PENTING: Route `/contact` menggunakan `throttle:3,1` (Laravel built-in).
 * Ini BUKAN `auth.throttle`, jadi `AUTH_THROTTLE_*_TEST_OVERRIDE` TIDAK
 * berpengaruh. Limit tetap 3 POST per 1 menit.
 *
 * Untuk menghindari throttle, kita:
 * 1. Reset throttle sebelum test yang mengirim POST /contact
 * 2. Gunakan `waitForResponse` bukan `networkidle` (lebih cepat)
 */

test.describe('Contact — Form Kontak Landing Page', () => {
    /**
     * Helper: reset throttle untuk route `/contact`.
     *
     * Route `/contact` menggunakan `throttle:3,1` yang di-handle oleh
     * Laravel built-in RateLimiter. Key-nya adalah `ip` (default).
     *
     * Kita bisa reset via endpoint `/_test/clear-throttle` dengan
     * limiter `contact` (jika terdaftar) atau fallback ke hapus
     * langsung via tinker.
     *
     * CATATAN: Karena `throttle:3,1` bukan `auth.throttle`, endpoint
     * `/_test/clear-throttle` mungkin TIDAK bisa menghapusnya. Jadi
     * kita hanya bisa mengandalkan jumlah POST yang sedikit.
     */
    async function resetContactThrottle(page: any): Promise<void> {
        // Coba reset via endpoint (jika didukung)
        try {
            await page.goto('/');
            const csrfToken = await page.evaluate(() => {
                const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
                return match ? decodeURIComponent(match[1]) : '';
            });

            await page.request.post('/_test/clear-throttle', {
                form: { limiter: 'contact', key: '127.0.0.1' },
                headers: { 'X-XSRF-TOKEN': csrfToken },
                failOnStatusCode: false,
            });
        } catch {
            // Abaikan error — mungkin endpoint tidak support
        }
    }

    /**
     * Helper: submit form kontak dan tunggu response.
     */
    async function submitContact(
        page: any,
        data: {
            nama?: string;
            email?: string;
            pesan?: string;
        },
    ): Promise<void> {
        if (data.nama !== undefined) {
            await page.fill('input#nama', data.nama);
        }
        if (data.email !== undefined) {
            await page.fill('input#email', data.email);
        }
        if (data.pesan !== undefined) {
            await page.fill('textarea#pesan', data.pesan);
        }

        await Promise.all([
            page.waitForResponse(
                (resp: any) =>
                    resp.url().includes('/contact') &&
                    resp.request().method() === 'POST',
                { timeout: 10_000 },
            ),
            page.click('button[type="submit"]'),
        ]);
    }

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Scroll ke form kontak
        await page.locator('#contact').scrollIntoViewIfNeeded();
    });

    /*
    |--------------------------------------------------------------------------
    | Contract — Elemen Form
    |--------------------------------------------------------------------------
    */

    test.describe('Elemen Form', () => {
        test('menampilkan heading "Hubungi Kami"', async ({ page }) => {
            await expect(
                page.getByText(/Hubungi Kami/i).first(),
            ).toBeVisible();
        });

        test('menampilkan heading "Punya Pertanyaan atau Butuh Bantuan?"', async ({
            page,
        }) => {
            await expect(
                page.getByRole('heading', { name: /Punya Pertanyaan/i }),
            ).toBeVisible();
        });

        test('menampilkan field nama, email, dan pesan', async ({ page }) => {
            await expect(page.locator('input#nama')).toBeVisible();
            await expect(page.locator('input#email')).toBeVisible();
            await expect(page.locator('textarea#pesan')).toBeVisible();
        });

        test('menampilkan tombol "Kirim Pesan Sekarang"', async ({ page }) => {
            await expect(
                page.getByRole('button', { name: /Kirim Pesan Sekarang/i }),
            ).toBeVisible();
        });

        test('menampilkan informasi kontak (lokasi, email, telepon)', async ({
            page,
        }) => {
            await expect(page.getByText(/Kertak Hanyar/i)).toBeVisible();
            await expect(
                page.getByText(/titiktemukm7@gmail.com/i),
            ).toBeVisible();
            await expect(
                page.getByText(/\+62 811 2233 4455/i),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Atribut Input
    |--------------------------------------------------------------------------
    */

    test.describe('Atribut Input', () => {
        test('input nama memiliki autocomplete="name"', async ({ page }) => {
            await expect(page.locator('input#nama')).toHaveAttribute(
                'autocomplete',
                'name',
            );
        });

        test('input email memiliki autocomplete="email"', async ({ page }) => {
            await expect(page.locator('input#email')).toHaveAttribute(
                'autocomplete',
                'email',
            );
        });

        test('input nama, email, dan pesan wajib diisi (required)', async ({
            page,
        }) => {
            await expect(page.locator('input#nama')).toHaveAttribute(
                'required',
                '',
            );
            await expect(page.locator('input#email')).toHaveAttribute(
                'required',
                '',
            );
            await expect(page.locator('textarea#pesan')).toHaveAttribute(
                'required',
                '',
            );
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Happy Path — Kirim Pesan
    |--------------------------------------------------------------------------
    |
    | PENTING: Test ini mengirim POST /contact. Untuk menghindari
    | throttle (3 per menit), kita reset throttle dulu.
    */

    test('berhasil kirim pesan kontak dengan data valid', async ({ page }) => {
        await resetContactThrottle(page);

        await submitContact(page, {
            nama: 'Budi Test E2E',
            email: 'budi-e2e@titiktemu.test',
            pesan: 'Ini adalah pesan test E2E untuk memastikan form kontak berfungsi dengan baik.',
        });

        // Pesan sukses harus muncul
        await expect(
            page.getByText(/Pesan Anda berhasil terkirim/i),
        ).toBeVisible({ timeout: 10_000 });
    });

    /*
    |--------------------------------------------------------------------------
    | Negative Path — Validasi Frontend (Browser)
    |--------------------------------------------------------------------------
    |
    | Test di bawah ini TIDAK mengirim POST karena browser memblokir
    | submit (karena `required` atau `type="email"`).
    */

    test('gagal kirim jika nama kosong', async ({ page }) => {
        await page.fill('input#email', 'budi@titiktemu.test');
        await page.fill('textarea#pesan', 'Pesan test minimal 10 karakter.');
        await page.click('button[type="submit"]');

        // Browser blokir karena `required`, tetap di halaman
        await expect(page).toHaveURL('/');
    });

    test('gagal kirim jika email kosong', async ({ page }) => {
        await page.fill('input#nama', 'Budi');
        await page.fill('textarea#pesan', 'Pesan test minimal 10 karakter.');
        await page.click('button[type="submit"]');

        await expect(page).toHaveURL('/');
    });

    test('gagal kirim jika pesan kosong', async ({ page }) => {
        await page.fill('input#nama', 'Budi');
        await page.fill('input#email', 'budi@titiktemu.test');
        await page.click('button[type="submit"]');

        await expect(page).toHaveURL('/');
    });

    test('gagal kirim jika format email tidak valid', async ({ page }) => {
        await page.fill('input#nama', 'Budi');
        await page.fill('input#email', 'bukan-email');
        await page.fill('textarea#pesan', 'Pesan test minimal 10 karakter.');

        // Karena input type="email", browser memblokir submit
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/');
    });

    /*
    |--------------------------------------------------------------------------
    | Negative Path — Validasi Server
    |--------------------------------------------------------------------------
    |
    | Test di bawah ini MENGIRIM POST /contact. Untuk menghindari
    | throttle (3 per menit), kita reset throttle dulu.
    |
    | PENTING: Hanya ada SATU test yang mengirim POST untuk validasi
    | server, agar tidak melebihi limit.
    */

    test('gagal kirim jika pesan kurang dari 10 karakter', async ({ page }) => {
        await resetContactThrottle(page);

        await submitContact(page, {
            nama: 'Budi',
            email: 'budi@titiktemu.test',
            pesan: 'Halo', // kurang dari 10 karakter
        });

        // Server menolak dengan error validasi
        // Pesan error bisa dari server (Inertia) atau frontend
        await expect(
            page.getByText(/Pesan minimal 10 karakter/i),
        ).toBeVisible({ timeout: 10_000 });
    });

    /*
    |--------------------------------------------------------------------------
    | Usability & Accessibility (a11y)
    |--------------------------------------------------------------------------
    */

    test('semua input memiliki label yang terasosiasi', async ({ page }) => {
        await expect(page.locator('label[for="nama"]')).toBeVisible();
        await expect(page.locator('label[for="email"]')).toBeVisible();
        await expect(page.locator('label[for="pesan"]')).toBeVisible();
    });

    test('form kontak bisa diakses dari navbar', async ({ page }) => {
        await page.goto('/');

        // Cari link ke #contact di navbar
        const contactLink = page.locator('a[href="#contact"]').first();
        await expect(contactLink).toBeVisible();
    });
});