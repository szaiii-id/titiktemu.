import { test, expect } from '../fixtures/auth';

test.describe('Contact — Form Kontak Landing Page', () => {
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
                page.getByText(/Hubungi Kami/i).first()
            ).toBeVisible();
        });

        test('menampilkan heading "Punya Pertanyaan atau Butuh Bantuan?"', async ({ page }) => {
            await expect(
                page.getByRole('heading', { name: /Punya Pertanyaan/i })
            ).toBeVisible();
        });

        test('menampilkan field nama, email, dan pesan', async ({ page }) => {
            await expect(page.locator('input#nama')).toBeVisible();
            await expect(page.locator('input#email')).toBeVisible();
            await expect(page.locator('textarea#pesan')).toBeVisible();
        });

        test('menampilkan tombol "Kirim Pesan Sekarang"', async ({ page }) => {
            await expect(
                page.getByRole('button', { name: /Kirim Pesan Sekarang/i })
            ).toBeVisible();
        });

        test('menampilkan informasi kontak (lokasi, email, telepon)', async ({ page }) => {
            await expect(page.getByText(/Kertak Hanyar/i)).toBeVisible();
            await expect(page.getByText(/titiktemukm7@gmail.com/i)).toBeVisible();
            await expect(page.getByText(/\+62 811 2233 4455/i)).toBeVisible();
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
                'name'
            );
        });

        test('input email memiliki autocomplete="email"', async ({ page }) => {
            await expect(page.locator('input#email')).toHaveAttribute(
                'autocomplete',
                'email'
            );
        });

        test('input nama, email, dan pesan wajib diisi (required)', async ({ page }) => {
            await expect(page.locator('input#nama')).toHaveAttribute('required', '');
            await expect(page.locator('input#email')).toHaveAttribute('required', '');
            await expect(page.locator('textarea#pesan')).toHaveAttribute('required', '');
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Happy Path — Kirim Pesan
    |--------------------------------------------------------------------------
    */

    test('berhasil kirim pesan kontak dengan data valid', async ({ page }) => {
        // Matikan email agar tidak benar-benar dikirim
        // (di .env.testing, MAIL_MAILER=log, jadi aman)

        await page.fill('input#nama', 'Budi Test E2E');
        await page.fill('input#email', 'budi-e2e@titiktemu.test');
        await page.fill(
            'textarea#pesan',
            'Ini adalah pesan test E2E untuk memastikan form kontak berfungsi dengan baik.'
        );

        await page.click('button[type="submit"]');

        // Tunggu redirect back (ke halaman yang sama)
        await page.waitForLoadState('networkidle');

        // Pesan sukses harus muncul
        await expect(
            page.getByText(/Pesan Anda berhasil terkirim/i)
        ).toBeVisible({ timeout: 10_000 });
    });

    /*
    |--------------------------------------------------------------------------
    | Negative Path — Validasi
    |--------------------------------------------------------------------------
    */

    test('gagal kirim jika nama kosong', async ({ page }) => {
        await page.fill('input#email', 'budi@titiktemu.test');
        await page.fill('textarea#pesan', 'Pesan test minimal 10 karakter.');
        await page.click('button[type="submit"]');

        // Browser blokir karena `required`
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

    test('gagal kirim jika pesan kurang dari 10 karakter', async ({ page }) => {
        await page.fill('input#nama', 'Budi');
        await page.fill('input#email', 'budi@titiktemu.test');
        await page.fill('textarea#pesan', 'Halo');

        await page.click('button[type="submit"]');

        // Server menolak dengan error validasi
        await expect(
            page.getByText(/Pesan minimal 10 karakter/i)
        ).toBeVisible({ timeout: 10_000 });
    });

    /*
    |--------------------------------------------------------------------------
    | Error Handling (Level UI)
    |--------------------------------------------------------------------------
    */

    test('error dari server ditampilkan sebagai teks di form', async ({ page }) => {
        await page.fill('input#nama', 'Budi');
        await page.fill('input#email', 'budi@titiktemu.test');
        await page.fill('textarea#pesan', 'Halo'); // kurang dari 10 karakter

        await page.click('button[type="submit"]');

        // Error validasi harus muncul dengan warna merah/pink
        const errorMessage = page.locator('p.text-pink, [class*="red"]').first();
        await expect(errorMessage).toBeVisible({ timeout: 10_000 });
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