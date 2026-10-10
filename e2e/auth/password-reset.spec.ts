import { test, expect, uniqueEmail, SEED_USERS } from '../fixtures/auth';

test.describe('Password Reset — Alur Lupa Password', () => {
    /*
    |--------------------------------------------------------------------------
    | Halaman Forgot Password — Contract
    |--------------------------------------------------------------------------
    */

    test.describe('Halaman Forgot Password', () => {
        test.beforeEach(async ({ page }) => {
            await page.goto('/forgot-password');
        });

        test('menampilkan heading "Pemulihan"', async ({ page }) => {
            await expect(
                page.getByRole('heading', { name: /^Pemulihan/i })
            ).toBeVisible();
        });

        test('menampilkan field email', async ({ page }) => {
            await expect(page.locator('label[for="email"]')).toBeVisible();
            await expect(page.locator('input#email')).toBeVisible();
        });

        test('menampilkan tombol "Kirim Tautan Pemulihan"', async ({ page }) => {
            await expect(
                page.getByRole('button', { name: /Kirim Tautan Pemulihan/i })
            ).toBeVisible();
        });

        test('menampilkan tombol kembali ke login', async ({ page }) => {
            await expect(
                page.getByText(/Kembali ke Login/i)
            ).toBeVisible();
        });

        test('input email memiliki autocomplete="email"', async ({ page }) => {
            await expect(page.locator('input#email')).toHaveAttribute(
                'autocomplete',
                'email'
            );
        });

        test('input email bertipe email', async ({ page }) => {
            await expect(page.locator('input#email')).toHaveAttribute(
                'type',
                'email'
            );
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Kirim Tautan Reset — Happy Path
    |--------------------------------------------------------------------------
    */

    test('kirim tautan reset untuk email yang terdaftar', async ({ page }) => {
        await page.goto('/forgot-password');

        await page.fill('input#email', SEED_USERS.client.email);
        await page.click('button[type="submit"]');

        // Setelah submit, tetap di halaman forgot-password
        await expect(page).toHaveURL('/forgot-password');

        // Pesan sukses muncul
        await expect(
            page.getByText(/Tautan pemulihan password telah dikirim/i)
        ).toBeVisible({ timeout: 10_000 });
    });

    /*
    |--------------------------------------------------------------------------
    | Kirim Tautan Reset — Negative Path
    |--------------------------------------------------------------------------
    */

    test('gagal kirim tautan jika email tidak terdaftar', async ({ page }) => {
        await page.goto('/forgot-password');

        await page.fill('input#email', 'tidak-ada@titiktemu.test');
        await page.click('button[type="submit"]');

        // Tetap di halaman forgot-password
        await expect(page).toHaveURL('/forgot-password');

        // Pesan error muncul
        await expect(
            page.getByText(/Email tersebut tidak terdaftar/i)
        ).toBeVisible();
    });

    test('gagal kirim tautan jika email kosong', async ({ page }) => {
        await page.goto('/forgot-password');

        // Tidak isi email, klik submit
        await page.click('button[type="submit"]');

        // Browser blokir karena required, tetap di halaman
        await expect(page).toHaveURL('/forgot-password');
    });

    test('gagal kirim tautan jika format email tidak valid', async ({ page }) => {
        await page.goto('/forgot-password');

        await page.fill('input#email', 'bukan-email');
        await page.click('button[type="submit"]');

        await expect(page).toHaveURL('/forgot-password');
    });

    /*
    |--------------------------------------------------------------------------
    | Halaman Reset Password — Contract
    |--------------------------------------------------------------------------
    */

    test.describe('Halaman Reset Password', () => {
        test('guest bisa akses halaman reset dengan token apapun', async ({ page }) => {
            await page.goto('/reset-password/token-palsu?email=test@titiktemu.test');

            // Halaman reset password harus bisa dibuka (form tetap tampil)
            // Validasi token terjadi saat submit, bukan saat render
            await expect(page).toHaveURL(
                /reset-password\/token-palsu/
            );
            await expect(
                page.getByRole('heading', { name: /Reset Sandi/i })
            ).toBeVisible();
        });

        test('menampilkan email dari query string (readonly)', async ({ page }) => {
            await page.goto(
                '/reset-password/token-apa-saja?email=budi@example.com'
            );

            const emailInput = page.locator('input#email');
            await expect(emailInput).toHaveValue('budi@example.com');
            await expect(emailInput).toHaveAttribute('readonly', '');
        });

        test('menampilkan field password baru dan konfirmasi', async ({ page }) => {
            await page.goto('/reset-password/token-abc?email=test@titiktemu.test');

            await expect(page.locator('input#password')).toBeVisible();
            await expect(page.locator('input#password_confirmation')).toBeVisible();
        });

        test('menampilkan tombol "Simpan Password Baru"', async ({ page }) => {
            await page.goto('/reset-password/token-abc?email=test@titiktemu.test');

            await expect(
                page.getByRole('button', { name: /Simpan Password Baru/i })
            ).toBeVisible();
        });

        test('input password memiliki autocomplete="new-password"', async ({ page }) => {
            await page.goto('/reset-password/token-abc?email=test@titiktemu.test');

            await expect(page.locator('input#password')).toHaveAttribute(
                'autocomplete',
                'new-password'
            );
            await expect(
                page.locator('input#password_confirmation')
            ).toHaveAttribute('autocomplete', 'new-password');
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Reset Password — Validasi Frontend
    |--------------------------------------------------------------------------
    */

    test.describe('Validasi Frontend Reset Password', () => {
        test.beforeEach(async ({ page }) => {
            await page.goto(
                '/reset-password/token-abc?email=test@titiktemu.test'
            );
        });

        test('menampilkan peringatan jika konfirmasi tidak cocok', async ({ page }) => {
            await page.fill('input#password', 'password123');
            await page.fill('input#password_confirmation', 'password456');

            await expect(
                page.getByText(/Konfirmasi password tidak cocok/i)
            ).toBeVisible();
        });

        test('tombol submit disabled saat password tidak cocok', async ({ page }) => {
            await page.fill('input#password', 'password123');
            await page.fill('input#password_confirmation', 'password456');

            await expect(
                page.getByRole('button', { name: /Simpan Password Baru/i })
            ).toBeDisabled();
        });

        test('toggle password menampilkan password', async ({ page }) => {
            const passwordInput = page.locator('input#password');
            await expect(passwordInput).toHaveAttribute('type', 'password');

            await page.getByLabel('Tampilkan password').first().click();
            await expect(passwordInput).toHaveAttribute('type', 'text');
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Reset Password — Negative Path (Token Palsu)
    |--------------------------------------------------------------------------
    */

    test('gagal reset password dengan token palsu', async ({ page }) => {
        await page.goto(
            '/reset-password/token-palsu?email=' + SEED_USERS.client.email
        );

        await page.fill('input#password', 'password-baru-123');
        await page.fill('input#password_confirmation', 'password-baru-123');
        await page.click('button[type="submit"]');

        // Server menolak token, tetap di halaman reset
        // atau redirect dengan error
        await expect(
            page.locator('p.text-pink, [class*="red"]')
        ).toBeVisible({ timeout: 10_000 });
    });

    /*
    |--------------------------------------------------------------------------
    | Usability & Accessibility (a11y)
    |--------------------------------------------------------------------------
    */

    test('halaman forgot password memiliki semua label terasosiasi', async ({ page }) => {
        await page.goto('/forgot-password');
        await expect(page.locator('label[for="email"]')).toBeVisible();
    });

    test('halaman reset password memiliki semua label terasosiasi', async ({ page }) => {
        await page.goto('/reset-password/token-abc?email=test@titiktemu.test');

        await expect(page.locator('label[for="email"]')).toBeVisible();
        await expect(page.locator('label[for="password"]')).toBeVisible();
        await expect(
            page.locator('label[for="password_confirmation"]')
        ).toBeVisible();
    });
});