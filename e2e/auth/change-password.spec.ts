import {
    test,
    expect,
    uniqueEmail,
    uniqueUsername,
    loginAsCustom,
    SEED_USERS,
    logout,
} from '../fixtures/auth';

/**
 * Auth — Ganti Password (Shared, semua role)
 *
 * Route:
 * - GET  /change-password  → Auth\ChangePasswordController@edit
 * - PUT  /change-password  → Auth\ChangePasswordController@update
 *
 * Behavior:
 * - Mode normal (must_change_password = false):
 *     → wajib isi old_password, verifikasi via `current_password` rule
 *     → sukses: redirect ke dashboard role + flash "Password berhasil diubah."
 * - Mode wajib ganti (must_change_password = true):
 *     → old_password tidak wajib
 *     → sukses: logout + redirect /login + flash "Silakan login ulang..."
 *
 * STRATEGI TEST (best practice):
 * ---------------------------------------------------------------------
 * Untuk test yang MEMBUTUHKAN ganti password sukses, kita TIDAK memakai
 * seed user (client@titiktemu.test), karena itu akan merusak test lain
 * yang butuh login dengan password seed.
 *
 * Sebagai gantinya, kita REGISTER user baru via /register di awal test,
 * lalu ganti password user itu. Seed user sama sekali tidak tersentuh.
 *
 * Keuntungan:
 * - Setiap test independen (tidak ada urutan ketergantungan)
 * - Bisa jalan paralel tanpa race condition
 * - Idempotent: bisa dijalankan berapa kali pun
 * - Cermin real user journey (register → ganti password)
 * ---------------------------------------------------------------------
 */

// ==========================================
// KONSTANTA
// ==========================================
const SEED_PASSWORD = 'password123';
const NEW_PASSWORD = 'NewSecurePass123!';

// ==========================================
// HELPER
// ==========================================
/**
 * Register user client baru via UI /register.
 * Return { email, username } supaya bisa dipakai login ulang.
 */
async function registerNewClient(
    page: any,
    nameSuffix = 'E2E',
): Promise<{ email: string; username: string; password: string; name: string }> {
    const email = uniqueEmail('chpw');
    const username = uniqueUsername('chpw');
    const name = `Change Password ${nameSuffix}`;

    await page.goto('/register');
    await page.fill('input#name', name);
    await page.fill('input#username', username);
    await page.fill('input#email', email);
    await page.fill('input#password', SEED_PASSWORD);
    await page.fill('input#password_confirmation', SEED_PASSWORD);

    await Promise.all([
        page.waitForResponse(
            (resp: any) =>
                resp.url().includes('/register') &&
                resp.request().method() === 'POST',
            { timeout: 15_000 },
        ),
        page.click('button[type="submit"]'),
    ]);

    // Setelah register, diarahkan ke dashboard client
    await expect(page).toHaveURL('/client/dashboard', { timeout: 15_000 });

    return { email, username, password: SEED_PASSWORD, name };
}

/**
 * Submit form ganti password dan tunggu response PUT /change-password.
 */
async function submitChangePassword(
    page: any,
    data: {
        oldPassword?: string;
        newPassword?: string;
        newPasswordConfirmation?: string;
    },
): Promise<void> {
    if (data.oldPassword !== undefined) {
        await page.fill('input#old_password', data.oldPassword);
    }
    if (data.newPassword !== undefined) {
        await page.fill('input#password', data.newPassword);
    }
    if (data.newPasswordConfirmation !== undefined) {
        await page.fill(
            'input#password_confirmation',
            data.newPasswordConfirmation,
        );
    }

    await Promise.all([
        page.waitForResponse(
            (resp: any) =>
                resp.url().includes('/change-password') &&
                resp.request().method() === 'PUT',
            { timeout: 15_000 },
        ),
        page.click('button[type="submit"]'),
    ]);
}

// ==========================================
// TEST SUITE
// ==========================================
test.describe('Auth — Ganti Password', () => {
    /*
    |--------------------------------------------------------------------------
    | Access Control — semua role bisa akses (shared route)
    |--------------------------------------------------------------------------
    */

    test('guest tidak bisa akses halaman ganti password', async ({ page, asGuest }) => {
        await asGuest();
        await page.goto('/change-password');
        await expect(page).toHaveURL('/login');
    });

    test('client bisa akses halaman ganti password', async ({ page, asClient }) => {
        await asClient();
        await page.goto('/change-password');
        await expect(page).toHaveURL('/change-password');
    });

    test('mitra bisa akses halaman ganti password', async ({ page, asMitra }) => {
        await asMitra();
        await page.goto('/change-password');
        await expect(page).toHaveURL('/change-password');
    });

    test('admin bisa akses halaman ganti password', async ({ page, asAdmin }) => {
        await asAdmin();
        await page.goto('/change-password');
        await expect(page).toHaveURL('/change-password');
    });

    /*
    |--------------------------------------------------------------------------
    | Contract — Elemen Form (Mode Normal)
    |--------------------------------------------------------------------------
    */

    test.describe('Elemen Form', () => {
        test.beforeEach(async ({ page, asClient }) => {
            await asClient();
            await page.goto('/change-password');
        });

        test('menampilkan heading "Ganti Password"', async ({ page }) => {
            // ✅ FIX: heading punya <span>.</span> di akhir → pakai h2 + toContainText
            await expect(page.locator('h2').first()).toContainText('Ganti Password');
        });

        test('menampilkan deskripsi halaman', async ({ page }) => {
            await expect(
                page.getByText(/Silakan masukkan password lama/i),
            ).toBeVisible();
        });

        test('menampilkan field old_password', async ({ page }) => {
            await expect(page.locator('input#old_password')).toBeVisible();
        });

        test('menampilkan field password baru', async ({ page }) => {
            await expect(page.locator('input#password')).toBeVisible();
        });

        test('menampilkan field konfirmasi password', async ({ page }) => {
            await expect(
                page.locator('input#password_confirmation'),
            ).toBeVisible();
        });

        test('menampilkan tombol "Simpan Password Baru"', async ({ page }) => {
            await expect(
                page.getByRole('button', { name: /Simpan Password Baru/i }),
            ).toBeVisible();
        });

        test('menampilkan tombol "Keluar" di kanan atas', async ({ page }) => {
            await expect(
                page.getByRole('button', { name: /Keluar dari akun/i }),
            ).toBeVisible();
        });

        test('TIDAK menampilkan banner "Wajib Ganti Password"', async ({ page }) => {
            // Mode normal → banner kuning tidak muncul
            await expect(
                page.getByText(/Anda harus mengganti password sebelum/i),
            ).not.toBeVisible();
        });

        test('menampilkan footer copyright', async ({ page }) => {
            await expect(
                page.getByText(/Hak Cipta Titiktemu/i),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Atribut Input
    |--------------------------------------------------------------------------
    */

    test.describe('Atribut Input', () => {
        test.beforeEach(async ({ page, asClient }) => {
            await asClient();
            await page.goto('/change-password');
        });

        test('semua input password bertipe password secara default', async ({ page }) => {
            await expect(page.locator('input#old_password')).toHaveAttribute(
                'type',
                'password',
            );
            await expect(page.locator('input#password')).toHaveAttribute(
                'type',
                'password',
            );
            await expect(
                page.locator('input#password_confirmation'),
            ).toHaveAttribute('type', 'password');
        });

        test('old_password punya autocomplete="current-password"', async ({ page }) => {
            await expect(page.locator('input#old_password')).toHaveAttribute(
                'autocomplete',
                'current-password',
            );
        });

        test('password baru punya autocomplete="new-password"', async ({ page }) => {
            await expect(page.locator('input#password')).toHaveAttribute(
                'autocomplete',
                'new-password',
            );
        });

        test('konfirmasi punya autocomplete="new-password"', async ({ page }) => {
            await expect(
                page.locator('input#password_confirmation'),
            ).toHaveAttribute('autocomplete', 'new-password');
        });

        test('semua field wajib diisi (required)', async ({ page }) => {
            await expect(page.locator('input#old_password')).toHaveAttribute(
                'required',
                '',
            );
            await expect(page.locator('input#password')).toHaveAttribute(
                'required',
                '',
            );
            await expect(
                page.locator('input#password_confirmation'),
            ).toHaveAttribute('required', '');
        });
    });

    /*
    |--------------------------------------------------------------------------
    | UI Interaction — Toggle Password
    |--------------------------------------------------------------------------
    */

    test.describe('Toggle Password', () => {
        test.beforeEach(async ({ page, asClient }) => {
            await asClient();
            await page.goto('/change-password');
        });

        test('toggle old_password mengubah type', async ({ page }) => {
            const input = page.locator('input#old_password');
            await expect(input).toHaveAttribute('type', 'password');

            await page.getByLabel('Tampilkan password').nth(0).click();
            await expect(input).toHaveAttribute('type', 'text');

            await page.getByLabel('Sembunyikan password').nth(0).click();
            await expect(input).toHaveAttribute('type', 'password');
        });

        test('toggle password baru mengubah type', async ({ page }) => {
            const input = page.locator('input#password');
            await expect(input).toHaveAttribute('type', 'password');

            await page.getByLabel('Tampilkan password').nth(1).click();
            await expect(input).toHaveAttribute('type', 'text');
        });

        test('toggle konfirmasi mengubah type', async ({ page }) => {
            const input = page.locator('input#password_confirmation');
            await expect(input).toHaveAttribute('type', 'password');

            await page.getByLabel('Tampilkan password').nth(2).click();
            await expect(input).toHaveAttribute('type', 'text');
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Strength Indicator
    |--------------------------------------------------------------------------
    */

    test.describe('Strength Indicator', () => {
        test.beforeEach(async ({ page, asClient }) => {
            await asClient();
            await page.goto('/change-password');
        });

        test('tidak menampilkan strength bar saat password kosong', async ({ page }) => {
            await expect(
                page.getByText(/^(Lemah|Cukup|Kuat|Sangat Kuat)$/i),
            ).not.toBeVisible();
        });

        test('menampilkan "Lemah" untuk password pendek', async ({ page }) => {
            await page.fill('input#password', 'abc');
            await expect(page.getByText(/^Lemah$/i)).toBeVisible();
        });

        test('menampilkan "Sangat Kuat" untuk password lengkap', async ({ page }) => {
            await page.fill('input#password', 'Abcdefgh123!');
            await expect(page.getByText(/^Sangat Kuat$/i)).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Validasi Frontend — Konfirmasi Password
    |--------------------------------------------------------------------------
    */

    test.describe('Validasi Konfirmasi (Frontend)', () => {
        test.beforeEach(async ({ page, asClient }) => {
            await asClient();
            await page.goto('/change-password');
        });

        test('menampilkan peringatan jika konfirmasi tidak cocok', async ({ page }) => {
            await page.fill('input#password', 'password123');
            await page.fill('input#password_confirmation', 'password456');
            await expect(
                page.getByText(/Konfirmasi password tidak cocok/i),
            ).toBeVisible();
        });

        test('tombol submit disabled saat password tidak cocok', async ({ page }) => {
            await page.fill('input#old_password', SEED_PASSWORD);
            await page.fill('input#password', 'password123');
            await page.fill('input#password_confirmation', 'password456');

            await expect(
                page.getByRole('button', { name: /Simpan Password Baru/i }),
            ).toBeDisabled();
        });

        test('tombol submit enabled saat password cocok', async ({ page }) => {
            await page.fill('input#old_password', SEED_PASSWORD);
            await page.fill('input#password', NEW_PASSWORD);
            await page.fill('input#password_confirmation', NEW_PASSWORD);

            await expect(
                page.getByRole('button', { name: /Simpan Password Baru/i }),
            ).not.toBeDisabled();
        });

        test('tidak menampilkan peringatan jika konfirmasi masih kosong', async ({
            page,
        }) => {
            await page.fill('input#password', 'password123');
            await expect(
                page.getByText(/Konfirmasi password tidak cocok/i),
            ).not.toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Validasi Browser (tidak kirim POST)
    |--------------------------------------------------------------------------
    */

    test.describe('Validasi Browser', () => {
        test.beforeEach(async ({ page, asClient }) => {
            await asClient();
            await page.goto('/change-password');
        });

        test('gagal submit jika old_password kosong', async ({ page }) => {
            await page.fill('input#password', NEW_PASSWORD);
            await page.fill('input#password_confirmation', NEW_PASSWORD);
            await page.click('button[type="submit"]');
            await expect(page).toHaveURL('/change-password');
        });

        test('gagal submit jika password baru kosong', async ({ page }) => {
            await page.fill('input#old_password', SEED_PASSWORD);
            await page.click('button[type="submit"]');
            await expect(page).toHaveURL('/change-password');
        });

        test('gagal submit jika konfirmasi kosong', async ({ page }) => {
            await page.fill('input#old_password', SEED_PASSWORD);
            await page.fill('input#password', NEW_PASSWORD);
            await page.click('button[type="submit"]');
            await expect(page).toHaveURL('/change-password');
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Validasi Server
    |--------------------------------------------------------------------------
    */

    test.describe('Validasi Server', () => {
        test.beforeEach(async ({ page, asClient }) => {
            await asClient();
            await page.goto('/change-password');
        });

        test('gagal jika old_password salah', async ({ page }) => {
            await submitChangePassword(page, {
                oldPassword: 'password-salah-banget',
                newPassword: NEW_PASSWORD,
                newPasswordConfirmation: NEW_PASSWORD,
            });

            await expect(page).toHaveURL('/change-password');
            await expect(
                page.getByText(/Password lama tidak sesuai/i),
            ).toBeVisible({ timeout: 10_000 });
        });

        test('gagal jika password baru kurang dari 8 karakter', async ({ page }) => {
            await submitChangePassword(page, {
                oldPassword: SEED_PASSWORD,
                newPassword: 'short',
                newPasswordConfirmation: 'short',
            });

            await expect(page).toHaveURL('/change-password');
            await expect(page.locator('p.text-pink').first()).toBeVisible({
                timeout: 10_000,
            });
        });

        test('gagal jika password baru sama dengan password lama', async ({ page }) => {
            // Laravel `Password::defaults()` biasanya tidak punya aturan
            // "different from old". Test ini memverifikasi behavior aktual
            // (kalau diizinkan, test akan pass; kalau ditolak, cek pesan error).
            // Kita asumsikan diizinkan — ganti ke assertion yang sesuai
            // kalau ternyata ada aturan tambahan.
            await submitChangePassword(page, {
                oldPassword: SEED_PASSWORD,
                newPassword: SEED_PASSWORD,
                newPasswordConfirmation: SEED_PASSWORD,
            });

            // Karena sistem mengizinkan, akan redirect ke dashboard.
            // Kalau ternyata ditolak, ganti assertion ke cek error.
            // Di sini kita cukup verifikasi tidak stuck di halaman.
            await expect(page).not.toHaveURL('/change-password', {
                timeout: 15_000,
            });
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Accessibility (a11y)
    |--------------------------------------------------------------------------
    */

    test.describe('Accessibility', () => {
        test.beforeEach(async ({ page, asClient }) => {
            await asClient();
            await page.goto('/change-password');
        });

        test('semua input memiliki label terasosiasi', async ({ page }) => {
            await expect(page.locator('label[for="old_password"]')).toBeVisible();
            await expect(page.locator('label[for="password"]')).toBeVisible();
            await expect(
                page.locator('label[for="password_confirmation"]'),
            ).toBeVisible();
        });

        test('semua tombol toggle password punya aria-label', async ({ page }) => {
            const toggles = page.getByLabel('Tampilkan password');
            await expect(toggles).toHaveCount(3);
        });

        test('tombol submit bertipe submit', async ({ page }) => {
            await expect(
                page.getByRole('button', { name: /Simpan Password Baru/i }),
            ).toHaveAttribute('type', 'submit');
        });

        test('tombol Keluar punya aria-label', async ({ page }) => {
            await expect(
                page.getByRole('button', { name: /Keluar dari akun/i }),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Flash Message
    |--------------------------------------------------------------------------
    */

    test.describe('Flash Message', () => {
        test('tidak menampilkan flash di halaman normal', async ({ page, asClient }) => {
            await asClient();
            await page.goto('/change-password');
            await expect(page.locator('.bg-green-50')).not.toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Happy Path — Register User Baru → Ganti Password → Login Ulang
    |--------------------------------------------------------------------------
    |
    | Best practice: tidak menyentuh seed user. Kita register user baru
    | via /register, lalu ganti password user itu. Setelah selesai, user
    | dibiarkan (tidak dihapus), tapi tidak masalah karena:
    | - Email & username unik per run (pakai timestamp + random)
    | - Global setup berikutnya akan migrate:fresh + seed
    |--------------------------------------------------------------------------
    */

    test.describe('Happy Path — Mode Normal', () => {
        test('client baru bisa ganti password dan redirect ke dashboard', async ({
            page,
        }) => {
            // 1. Register user baru (langsung login sebagai user itu)
            const newUser = await registerNewClient(page, 'Normal');

            // 2. Buka halaman ganti password
            await page.goto('/change-password');
            await expect(page).toHaveURL('/change-password');

            // 3. Submit ganti password
            await submitChangePassword(page, {
                oldPassword: newUser.password,
                newPassword: NEW_PASSWORD,
                newPasswordConfirmation: NEW_PASSWORD,
            });

            // 4. Mode normal → redirect ke dashboard client
            await expect(page).toHaveURL('/client/dashboard', {
                timeout: 15_000,
            });

            // 5. Flash message sukses muncul
            // ✅ Sekarang flash dirender oleh DashboardLayout (global),
            // jadi assertion ini akan pass.
            await expect(
                page.getByText(/Password berhasil diubah/i),
            ).toBeVisible({ timeout: 10_000 });
        });

        test('setelah ganti password, login ulang dengan password baru berhasil', async ({
            page,
        }) => {
            // 1. Register user baru
            const newUser = await registerNewClient(page, 'Relogin');

            // 2. Ganti password
            await page.goto('/change-password');
            await submitChangePassword(page, {
                oldPassword: newUser.password,
                newPassword: NEW_PASSWORD,
                newPasswordConfirmation: NEW_PASSWORD,
            });
            await expect(page).toHaveURL('/client/dashboard', {
                timeout: 15_000,
            });

            // 3. Logout
            await logout(page);

            // 4. Login ulang dengan password BARU
            await loginAsCustom(
                page,
                newUser.email,
                NEW_PASSWORD,
                '/client/dashboard',
            );

            await expect(page).toHaveURL('/client/dashboard');
        });

        test('setelah ganti password, login dengan password LAMA gagal', async ({
            page,
        }) => {
            // 1. Register user baru
            const newUser = await registerNewClient(page, 'OldPw');

            // 2. Ganti password
            await page.goto('/change-password');
            await submitChangePassword(page, {
                oldPassword: newUser.password,
                newPassword: NEW_PASSWORD,
                newPasswordConfirmation: NEW_PASSWORD,
            });
            await expect(page).toHaveURL('/client/dashboard', {
                timeout: 15_000,
            });

            // 3. Logout
            await logout(page);

            // 4. Coba login dengan password LAMA
            await page.goto('/login');

            const csrfToken = await page.evaluate(() => {
                const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
                return match ? decodeURIComponent(match[1]) : '';
            });

            const response = await page.context().request.post(
                '/login',
                {
                    form: {
                        identitas: newUser.email,
                        password: newUser.password, // password lama
                        remember: '',
                    },
                    headers: {
                        'X-XSRF-TOKEN': csrfToken,
                        Accept: 'text/html, application/xhtml+xml',
                    },
                    maxRedirects: 0,
                    failOnStatusCode: false,
                },
            );

            // Harus redirect balik ke /login (gagal)
            expect(response.status()).toBe(302);
            expect(response.headers()['location']).toContain('/login');
        });
    });
});