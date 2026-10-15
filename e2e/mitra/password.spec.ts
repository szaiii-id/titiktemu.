import { test, expect, SEED_USERS } from '../fixtures/auth';
import { APP_URL } from '../config';

/**
 * Mitra — Ganti Password
 *
 * Route: PUT /mitra/password
 *
 * PENTING: Test "Happy Path" mengubah password mitra.
 * Semua test yang butuh login mitra HARUS JALAN SEBELUM Happy Path.
 * Kita pakai test.describe.serial() untuk Happy Path agar urutan terjaga,
 * dan letakkan di paling AKHIR file.
 */

// ==========================================
// KONSTANTA
// ==========================================
const NEW_PASSWORD = 'NewPassword123!';

// ==========================================
// HELPER
// ==========================================
async function submitPasswordChange(
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
        await page.fill('input#password_confirmation', data.newPasswordConfirmation);
    }

    await Promise.all([
        page.waitForResponse(
            (resp: any) =>
                resp.url().includes('/mitra/password') &&
                resp.request().method() === 'PUT',
            { timeout: 15_000 },
        ),
        page.click('button[type="submit"]'),
    ]);
}

// ==========================================
// TEST SUITE
// ==========================================
test.describe('Mitra — Ganti Password', () => {
    /*
    |--------------------------------------------------------------------------
    | Access Control
    |--------------------------------------------------------------------------
    */

    test('guest tidak bisa akses halaman ganti password mitra', async ({ page, asGuest }) => {
        await asGuest();
        await page.goto('/mitra/password');
        await expect(page).toHaveURL('/login');
    });

    test('admin tidak bisa akses halaman ganti password mitra', async ({ page, asAdmin }) => {
        await asAdmin();
        await page.goto('/mitra/password');
        await expect(page).toHaveURL('/admin/dashboard');
    });

    test('client tidak bisa akses halaman ganti password mitra', async ({ page, asClient }) => {
        await asClient();
        await page.goto('/mitra/password');
        await expect(page).toHaveURL('/client/dashboard');
    });

    test('mitra bisa akses halaman ganti password', async ({ page, asMitra }) => {
        await asMitra();
        await page.goto('/mitra/password');
        await expect(page).toHaveURL('/mitra/password');
    });

    /*
    |--------------------------------------------------------------------------
    | Contract — Elemen Form
    |--------------------------------------------------------------------------
    */

    test.describe('Elemen Form', () => {
        test.beforeEach(async ({ page, asMitra }) => {
            await asMitra();
            await page.goto('/mitra/password');
        });

        test('menampilkan heading "Ganti Password"', async ({ page }) => {
            await expect(page.locator('h1.text-2xl')).toHaveText(/Ganti Password/);
        });

        test('menampilkan field password lama', async ({ page }) => {
            await expect(page.locator('input#old_password')).toBeVisible();
        });

        test('menampilkan field password baru', async ({ page }) => {
            await expect(page.locator('input#password')).toBeVisible();
        });

        test('menampilkan field konfirmasi password baru', async ({ page }) => {
            await expect(page.locator('input#password_confirmation')).toBeVisible();
        });

        test('menampilkan tombol "Simpan Password Baru"', async ({ page }) => {
            await expect(
                page.getByRole('button', { name: /^Simpan Password Baru$/i }),
            ).toBeVisible();
        });

        test('menampilkan tombol "Batal"', async ({ page }) => {
            await expect(
                page.getByRole('link', { name: /^Batal$/i }),
            ).toBeVisible();
        });

        test('menampilkan card header info user', async ({ page }) => {
            await expect(page.getByText(/KEAMANAN AKUN/i)).toBeVisible();
            await expect(page.getByText(SEED_USERS.mitra.email).first()).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Atribut Input
    |--------------------------------------------------------------------------
    */

    test.describe('Atribut Input', () => {
        test.beforeEach(async ({ page, asMitra }) => {
            await asMitra();
            await page.goto('/mitra/password');
        });

        test('password lama memiliki autocomplete="current-password"', async ({ page }) => {
            await expect(page.locator('input#old_password')).toHaveAttribute(
                'autocomplete',
                'current-password',
            );
        });

        test('password baru memiliki autocomplete="new-password"', async ({ page }) => {
            await expect(page.locator('input#password')).toHaveAttribute(
                'autocomplete',
                'new-password',
            );
        });

        test('konfirmasi password memiliki autocomplete="new-password"', async ({ page }) => {
            await expect(page.locator('input#password_confirmation')).toHaveAttribute(
                'autocomplete',
                'new-password',
            );
        });

        test('semua input password wajib diisi (required)', async ({ page }) => {
            await expect(page.locator('input#old_password')).toHaveAttribute('required', '');
            await expect(page.locator('input#password')).toHaveAttribute('required', '');
            await expect(page.locator('input#password_confirmation')).toHaveAttribute('required', '');
        });

        test('semua input password bertipe password secara default', async ({ page }) => {
            await expect(page.locator('input#old_password')).toHaveAttribute('type', 'password');
            await expect(page.locator('input#password')).toHaveAttribute('type', 'password');
            await expect(page.locator('input#password_confirmation')).toHaveAttribute('type', 'password');
        });
    });

    /*
    |--------------------------------------------------------------------------
    | UI Interaction — Toggle Password
    |--------------------------------------------------------------------------
    */

    test.describe('Toggle Password', () => {
        test.beforeEach(async ({ page, asMitra }) => {
            await asMitra();
            await page.goto('/mitra/password');
        });

        test('toggle password baru mengubah type ke text', async ({ page }) => {
            const passwordInput = page.locator('input#password');
            await expect(passwordInput).toHaveAttribute('type', 'password');

            await page.getByLabel('Toggle password').nth(1).click();
            await expect(passwordInput).toHaveAttribute('type', 'text');

            await page.getByLabel('Toggle password').nth(1).click();
            await expect(passwordInput).toHaveAttribute('type', 'password');
        });

        test('toggle password lama mengubah type ke text', async ({ page }) => {
            const oldPasswordInput = page.locator('input#old_password');
            await expect(oldPasswordInput).toHaveAttribute('type', 'password');

            await page.getByLabel('Toggle password').nth(0).click();
            await expect(oldPasswordInput).toHaveAttribute('type', 'text');
        });

        test('toggle konfirmasi password mengubah type ke text', async ({ page }) => {
            const confirmInput = page.locator('input#password_confirmation');
            await expect(confirmInput).toHaveAttribute('type', 'password');

            await page.getByLabel('Toggle password').nth(2).click();
            await expect(confirmInput).toHaveAttribute('type', 'text');
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Strength Indicator
    |--------------------------------------------------------------------------
    */

    test.describe('Strength Indicator', () => {
        test.beforeEach(async ({ page, asMitra }) => {
            await asMitra();
            await page.goto('/mitra/password');
        });

        test('tidak menampilkan strength bar saat password kosong', async ({ page }) => {
            await expect(page.getByText(/^(Lemah|Cukup|Kuat|Sangat Kuat)$/i)).not.toBeVisible();
        });

        test('menampilkan "Lemah" untuk password pendek', async ({ page }) => {
            await page.fill('input#password', 'abc');
            await expect(page.getByText(/^Lemah$/i)).toBeVisible();
        });

        test('menampilkan "Sangat Kuat" untuk password lengkap', async ({ page }) => {
            await page.fill('input#password', 'Abcdefgh123!');
            await expect(page.getByText(/^Sangat Kuat$/i)).toBeVisible();
        });

        test('menampilkan checklist kriteria saat password diisi', async ({ page }) => {
            await page.fill('input#password', 'abc');
            await expect(page.getByText(/Min\. 8 karakter/)).toBeVisible();
            await expect(page.getByText(/^Huruf$/i)).toBeVisible();
            await expect(page.getByText(/^Angka$/i)).toBeVisible();
            await expect(page.getByText(/^Simbol$/i)).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Validasi Frontend — Konfirmasi Password
    |--------------------------------------------------------------------------
    */

    test.describe('Validasi Konfirmasi (Frontend)', () => {
        test.beforeEach(async ({ page, asMitra }) => {
            await asMitra();
            await page.goto('/mitra/password');
        });

        test('menampilkan peringatan jika konfirmasi tidak cocok', async ({ page }) => {
            await page.fill('input#password', 'password123');
            await page.fill('input#password_confirmation', 'password456');
            await expect(page.getByText(/Konfirmasi password tidak cocok/i)).toBeVisible();
        });

        test('tombol submit disabled saat password tidak cocok', async ({ page }) => {
            await page.fill('input#password', 'password123');
            await page.fill('input#password_confirmation', 'password456');
            await expect(
                page.getByRole('button', { name: /^Simpan Password Baru$/i }),
            ).toBeDisabled();
        });

        test('tombol submit enabled saat password cocok', async ({ page }) => {
            await page.fill('input#password', 'password123');
            await page.fill('input#password_confirmation', 'password123');
            await expect(
                page.getByRole('button', { name: /^Simpan Password Baru$/i }),
            ).not.toBeDisabled();
        });

        test('tidak menampilkan peringatan jika konfirmasi masih kosong', async ({ page }) => {
            await page.fill('input#password', 'password123');
            await expect(page.getByText(/Konfirmasi password tidak cocok/i)).not.toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Validasi Browser
    |--------------------------------------------------------------------------
    */

    test.describe('Validasi Browser (Tidak Kirim POST)', () => {
        test.beforeEach(async ({ page, asMitra }) => {
            await asMitra();
            await page.goto('/mitra/password');
        });

        test('gagal submit jika password lama kosong', async ({ page }) => {
            await page.fill('input#password', 'NewPassword123!');
            await page.fill('input#password_confirmation', 'NewPassword123!');
            await page.click('button[type="submit"]');
            await expect(page).toHaveURL('/mitra/password');
        });

        test('gagal submit jika password baru kosong', async ({ page }) => {
            await page.fill('input#old_password', SEED_USERS.mitra.password);
            await page.click('button[type="submit"]');
            await expect(page).toHaveURL('/mitra/password');
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Validasi Server
    |--------------------------------------------------------------------------
    */

    test.describe('Validasi Server', () => {
        test.beforeEach(async ({ page, asMitra }) => {
            await asMitra();
            await page.goto('/mitra/password');
        });

        test('gagal ganti password jika password lama salah', async ({ page }) => {
            await submitPasswordChange(page, {
                oldPassword: 'password-salah-banget',
                newPassword: 'NewPassword123!',
                newPasswordConfirmation: 'NewPassword123!',
            });
            await expect(page).toHaveURL('/mitra/password');
            await expect(page.getByText(/Password lama tidak sesuai/i)).toBeVisible();
        });

        test('gagal ganti password jika password baru kurang dari 8 karakter', async ({ page }) => {
            await submitPasswordChange(page, {
                oldPassword: SEED_USERS.mitra.password,
                newPassword: 'short',
                newPasswordConfirmation: 'short',
            });
            await expect(page).toHaveURL('/mitra/password');
            await expect(page.locator('p.text-pink').first()).toBeVisible();
        });

        test('gagal ganti password jika konfirmasi tidak cocok (server)', async ({ page }) => {
            await page.fill('input#old_password', SEED_USERS.mitra.password);
            await page.fill('input#password', 'NewPassword123!');
            await page.fill('input#password_confirmation', 'DifferentPassword!');

            await page.evaluate(() => {
                const form = document.querySelector('form');
                form?.requestSubmit();
            });

            await expect(page).toHaveURL('/mitra/password');
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Role Check (Negative)
    |--------------------------------------------------------------------------
    */

    test('client tidak bisa submit ganti password mitra', async ({ page, asClient }) => {
        await asClient();
        await page.goto('/mitra/password');
        await expect(page).toHaveURL('/client/dashboard');
    });

    test('admin tidak bisa submit ganti password mitra', async ({ page, asAdmin }) => {
        await asAdmin();
        await page.goto('/mitra/password');
        await expect(page).toHaveURL('/admin/dashboard');
    });

    /*
    |--------------------------------------------------------------------------
    | Accessibility — SEBELUM Happy Path (karena butuh password lama)
    |--------------------------------------------------------------------------
    */

    test.describe('Accessibility', () => {
        test.beforeEach(async ({ page, asMitra }) => {
            await asMitra();
            await page.goto('/mitra/password');
        });

        test('semua input memiliki label yang terasosiasi', async ({ page }) => {
            await expect(page.locator('label[for="old_password"]')).toBeVisible();
            await expect(page.locator('label[for="password"]')).toBeVisible();
            await expect(page.locator('label[for="password_confirmation"]')).toBeVisible();
        });

        test('tombol toggle password memiliki aria-label', async ({ page }) => {
            const toggles = page.getByLabel('Toggle password');
            await expect(toggles).toHaveCount(3);
        });

        test('tombol "Batal" memiliki href ke /mitra/dashboard', async ({ page }) => {
            const batalLink = page.getByRole('link', { name: /^Batal$/i });
            await expect(batalLink).toHaveAttribute(
                'href',
                /\/mitra\/dashboard$/,
            );
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Flash Message — SEBELUM Happy Path
    |--------------------------------------------------------------------------
    */

    test.describe('Flash Message', () => {
        test('tidak menampilkan flash status di halaman normal', async ({ page, asMitra }) => {
            await asMitra();
            await page.goto('/mitra/password');
            await expect(page.locator('.bg-green-50')).not.toBeVisible();
        });
    });
});

/*
|--------------------------------------------------------------------------
| HAPPY PATH — DI PALING AKHIR (karena mengubah password mitra)
|--------------------------------------------------------------------------
|
| PENTING: Test ini mengubah password mitra. Setelah test ini,
| password mitra berubah dari `password123` → `NewPassword123!`.
|
| Semua test yang butuh password lama HARUS JALAN SEBELUM section ini.
| Kita taruh di describe terpisah di paling akhir file.
|
| ✅ FIX: Semua URL sekarang pakai APP_URL (bukan hardcode 127.0.0.1:8000).
| Alasan: Firefox/Webkit shard pakai port berbeda (8000 + shard_index).
| Hardcode 8000 gagal di shard firefox/webkit (ECONNREFUSED).
*/

test.describe.serial('Mitra — Ganti Password (Happy Path)', () => {
    test('mitra bisa ganti password dengan password lama yang benar', async ({ page, asMitra }) => {
        await asMitra();
        await page.goto('/mitra/password');

        await submitPasswordChange(page, {
            oldPassword: SEED_USERS.mitra.password,
            newPassword: NEW_PASSWORD,
            newPasswordConfirmation: NEW_PASSWORD,
        });

        await expect(page).toHaveURL('/mitra/password', { timeout: 15_000 });
        await expect(page.getByText(/Password berhasil diubah/i)).toBeVisible({
            timeout: 10_000,
        });
    });

    test('setelah ganti password, login dengan password baru berhasil', async ({ page }) => {
        await page.goto('/');

        const csrfToken = await page.evaluate(() => {
            const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
            return match ? decodeURIComponent(match[1]) : '';
        });

        // ✅ FIX: pakai APP_URL (bukan hardcode 127.0.0.1:8000)
        await page.request.post(`${APP_URL}/logout`, {
            headers: { 'X-XSRF-TOKEN': csrfToken },
            failOnStatusCode: false,
        });

        await page.goto('/login');

        const newCsrfToken = await page.evaluate(() => {
            const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
            return match ? decodeURIComponent(match[1]) : '';
        });

        // ✅ FIX: pakai APP_URL
        const response = await page.context().request.post(
            `${APP_URL}/login`,
            {
                form: {
                    identitas: SEED_USERS.mitra.email,
                    password: NEW_PASSWORD,
                    remember: '',
                },
                headers: {
                    'X-XSRF-TOKEN': newCsrfToken,
                    Accept: 'text/html, application/xhtml+xml',
                },
                maxRedirects: 0,
                failOnStatusCode: false,
            },
        );

        expect(response.status()).toBe(302);
        expect(response.headers()['location']).toContain('/mitra/dashboard');
    });

    test('setelah ganti password, login dengan password LAMA gagal', async ({ page }) => {
        await page.goto('/');

        const csrfToken = await page.evaluate(() => {
            const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
            return match ? decodeURIComponent(match[1]) : '';
        });

        // ✅ FIX: pakai APP_URL
        await page.request.post(`${APP_URL}/logout`, {
            headers: { 'X-XSRF-TOKEN': csrfToken },
            failOnStatusCode: false,
        });

        await page.goto('/login');

        const newCsrfToken = await page.evaluate(() => {
            const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
            return match ? decodeURIComponent(match[1]) : '';
        });

        // ✅ FIX: pakai APP_URL
        const response = await page.context().request.post(
            `${APP_URL}/login`,
            {
                form: {
                    identitas: SEED_USERS.mitra.email,
                    password: SEED_USERS.mitra.password,
                    remember: '',
                },
                headers: {
                    'X-XSRF-TOKEN': newCsrfToken,
                    Accept: 'text/html, application/xhtml+xml',
                },
                maxRedirects: 0,
                failOnStatusCode: false,
            },
        );

        expect(response.status()).toBe(302);
        expect(response.headers()['location']).toContain('/login');
    });
});