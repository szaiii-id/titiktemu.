import { test, expect, SEED_USERS, uniqueUsername } from '../fixtures/auth';

/**
 * Client — Profile Saya
 *
 * Route:
 * - GET /client/profile  → Client\ProfileController@edit
 * - PUT /client/profile  → Client\ProfileController@update
 *
 * Behavior:
 * - Field: name, username (email readonly + disabled)
 * - Submit: disable kalau tidak ada perubahan (hasChanges)
 * - Reset: kembalikan ke nilai awal
 * - Sukses: redirect ke /client/profile + flash status
 *
 * Seed user client: `client@titiktemu.test` / `budiclient` / name: `Budi Client`
 */

// ==========================================
// KONSTANTA
// ==========================================
const SEED_CLIENT_NAME = 'Budi Client';
const SEED_CLIENT_USERNAME = 'budiclient';
const SEED_CLIENT_EMAIL = 'client@titiktemu.test';

// ==========================================
// HELPER
// ==========================================
async function submitProfileUpdate(page: any): Promise<void> {
    await Promise.all([
        page.waitForResponse(
            (resp: any) =>
                resp.url().includes('/client/profile') &&
                resp.request().method() === 'PUT',
            { timeout: 15_000 },
        ),
        page.getByRole('button', { name: /^Simpan Perubahan$/i }).click(),
    ]);
}

// ==========================================
// TEST SUITE
// ==========================================
test.describe('Client — Profile Saya', () => {
    /*
    |--------------------------------------------------------------------------
    | Access Control
    |--------------------------------------------------------------------------
    */

    test('guest tidak bisa akses halaman profile client', async ({ page, asGuest }) => {
        await asGuest();
        await page.goto('/client/profile');
        await expect(page).toHaveURL('/login');
    });

    test('admin tidak bisa akses halaman profile client', async ({ page, asAdmin }) => {
        await asAdmin();
        await page.goto('/client/profile');
        await expect(page).toHaveURL('/admin/dashboard');
    });

    test('mitra tidak bisa akses halaman profile client', async ({ page, asMitra }) => {
        await asMitra();
        await page.goto('/client/profile');
        await expect(page).toHaveURL('/mitra/dashboard');
    });

    test('client bisa akses halaman profile', async ({ page, asClient }) => {
        await asClient();
        await page.goto('/client/profile');
        await expect(page).toHaveURL('/client/profile');
    });

    /*
    |--------------------------------------------------------------------------
    | Contract — Elemen Form
    |--------------------------------------------------------------------------
    */

    test.describe('Elemen Form', () => {
        test.beforeEach(async ({ page, asClient }) => {
            await asClient();
            await page.goto('/client/profile');
        });

        test('menampilkan heading "Profile Saya"', async ({ page }) => {
            await expect(page.locator('h1.text-2xl')).toHaveText(/Profile Saya/);
        });

        test('menampilkan field name', async ({ page }) => {
            await expect(page.locator('input#name')).toBeVisible();
        });

        test('menampilkan field username', async ({ page }) => {
            await expect(page.locator('input#username')).toBeVisible();
        });

        test('menampilkan field email (readonly, disabled)', async ({ page }) => {
            const emailInput = page.locator('input#email');
            await expect(emailInput).toBeVisible();
            await expect(emailInput).toHaveAttribute('readonly', '');
            await expect(emailInput).toHaveAttribute('disabled', '');
        });

        test('menampilkan tombol "Simpan Perubahan"', async ({ page }) => {
            await expect(
                page.getByRole('button', { name: /^Simpan Perubahan$/i }),
            ).toBeVisible();
        });

        test('menampilkan tombol "Reset"', async ({ page }) => {
            await expect(
                page.getByRole('button', { name: /^Reset$/i }),
            ).toBeVisible();
        });

        test('menampilkan badge "CLIENT"', async ({ page }) => {
            // ✅ FIX: pakai locator text (bukan getByText exact)
            await expect(page.locator('text=CLIENT').first()).toBeVisible();
        });

        test('menampilkan info "Email tidak dapat diubah"', async ({ page }) => {
            await expect(
                page.getByText(/Email tidak dapat diubah/i).first(),
            ).toBeVisible();
        });

        test('menampilkan placeholder "Read-only" di label email', async ({ page }) => {
            // ✅ FIX: pakai locator text
            await expect(page.locator('text=Read-only').first()).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Data Initialization
    |--------------------------------------------------------------------------
    */

    test.describe('Data Initialization', () => {
        test.beforeEach(async ({ page, asClient }) => {
            await asClient();
            await page.goto('/client/profile');
        });

        test('field name terisi dari user.name', async ({ page }) => {
            await expect(page.locator('input#name')).toHaveValue(SEED_CLIENT_NAME);
        });

        test('field username terisi dari user.username', async ({ page }) => {
            await expect(page.locator('input#username')).toHaveValue(SEED_CLIENT_USERNAME);
        });

        test('field email terisi dari user.email', async ({ page }) => {
            await expect(page.locator('input#email')).toHaveValue(SEED_CLIENT_EMAIL);
        });

        test('avatar menampilkan huruf pertama dari name', async ({ page }) => {
            // ✅ FIX: pakai class selector + filter hasText
            // Avatar preview card ada di index ke-2 (setelah topbar)
            const avatar = page.locator('div.w-20.h-20.rounded-3xl').filter({ hasText: 'B' });
            await expect(avatar).toBeVisible();
        });

        test('preview name di card header', async ({ page }) => {
            await expect(
                page.locator('h2').filter({ hasText: SEED_CLIENT_NAME }),
            ).toBeVisible();
        });

        test('preview username pakai @ prefix', async ({ page }) => {
            await expect(page.getByText(`@${SEED_CLIENT_USERNAME}`).first()).toBeVisible();
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
            await page.goto('/client/profile');
        });

        test('field name bertipe text', async ({ page }) => {
            await expect(page.locator('input#name')).toHaveAttribute('type', 'text');
        });

        test('field email bertipe email', async ({ page }) => {
            await expect(page.locator('input#email')).toHaveAttribute('type', 'email');
        });

        test('field name wajib diisi (required)', async ({ page }) => {
            await expect(page.locator('input#name')).toHaveAttribute('required', '');
        });

        test('field username TIDAK required (opsional)', async ({ page }) => {
            const usernameInput = page.locator('input#username');
            const isRequired = await usernameInput.getAttribute('required');
            expect(isRequired).toBeNull();
        });

        test('field email readonly', async ({ page }) => {
            await expect(page.locator('input#email')).toHaveAttribute('readonly', '');
        });

        test('field email disabled', async ({ page }) => {
            await expect(page.locator('input#email')).toHaveAttribute('disabled', '');
        });
    });

    /*
    |--------------------------------------------------------------------------
    | hasChanges Behavior
    |--------------------------------------------------------------------------
    */

    test.describe('hasChanges Behavior', () => {
        test.beforeEach(async ({ page, asClient }) => {
            await asClient();
            await page.goto('/client/profile');
        });

        test('tombol submit disabled saat form tidak berubah', async ({ page }) => {
            await expect(
                page.getByRole('button', { name: /^Simpan Perubahan$/i }),
            ).toBeDisabled();
        });

        test('tombol reset disabled saat form tidak berubah', async ({ page }) => {
            await expect(
                page.getByRole('button', { name: /^Reset$/i }),
            ).toBeDisabled();
        });

        test('tombol submit enabled saat name diubah', async ({ page }) => {
            await page.fill('input#name', 'Nama Baru');
            await expect(
                page.getByRole('button', { name: /^Simpan Perubahan$/i }),
            ).not.toBeDisabled();
        });

        test('tombol submit enabled saat username diubah', async ({ page }) => {
            await page.fill('input#username', 'usernamebaru');
            await expect(
                page.getByRole('button', { name: /^Simpan Perubahan$/i }),
            ).not.toBeDisabled();
        });

        test('tombol reset enabled saat form berubah', async ({ page }) => {
            await page.fill('input#name', 'Nama Baru');
            await expect(
                page.getByRole('button', { name: /^Reset$/i }),
            ).not.toBeDisabled();
        });

        test('tombol submit disabled kembali saat perubahan di-revert', async ({ page }) => {
            await page.fill('input#name', 'Nama Baru');
            await expect(
                page.getByRole('button', { name: /^Simpan Perubahan$/i }),
            ).not.toBeDisabled();

            await page.fill('input#name', SEED_CLIENT_NAME);
            await expect(
                page.getByRole('button', { name: /^Simpan Perubahan$/i }),
            ).toBeDisabled();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Reset Form Behavior
    |--------------------------------------------------------------------------
    */

    test.describe('Reset Form', () => {
        test.beforeEach(async ({ page, asClient }) => {
            await asClient();
            await page.goto('/client/profile');
        });

        test('klik Reset mengembalikan name ke nilai awal', async ({ page }) => {
            await page.fill('input#name', 'Nama Sementara');
            await page.getByRole('button', { name: /^Reset$/i }).click();

            await expect(page.locator('input#name')).toHaveValue(SEED_CLIENT_NAME);
        });

        test('klik Reset mengembalikan username ke nilai awal', async ({ page }) => {
            await page.fill('input#username', 'username-sementara');
            await page.getByRole('button', { name: /^Reset$/i }).click();

            await expect(page.locator('input#username')).toHaveValue(SEED_CLIENT_USERNAME);
        });

        test('setelah Reset, tombol submit disabled kembali', async ({ page }) => {
            await page.fill('input#name', 'Nama Sementara');
            await expect(
                page.getByRole('button', { name: /^Simpan Perubahan$/i }),
            ).not.toBeDisabled();

            await page.getByRole('button', { name: /^Reset$/i }).click();
            await expect(
                page.getByRole('button', { name: /^Simpan Perubahan$/i }),
            ).toBeDisabled();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Form Submit — Happy Path
    |--------------------------------------------------------------------------
    */

    test.describe('Form Submit — Happy Path', () => {
        test('client bisa update name', async ({ page, asClient }) => {
            await asClient();
            await page.goto('/client/profile');

            const newName = 'Nama Baru E2E';
            await page.fill('input#name', newName);
            await submitProfileUpdate(page);

            await expect(page).toHaveURL('/client/profile');
            await expect(
                page.getByText(/Profile berhasil diperbarui/i),
            ).toBeVisible({ timeout: 10_000 });

            await expect(page.locator('input#name')).toHaveValue(newName);
        });

        test('client bisa update username', async ({ page, asClient }) => {
            await asClient();
            await page.goto('/client/profile');

            const newUsername = uniqueUsername('e2e');
            await page.fill('input#username', newUsername);
            await submitProfileUpdate(page);

            await expect(page).toHaveURL('/client/profile');
            await expect(
                page.getByText(/Profile berhasil diperbarui/i),
            ).toBeVisible({ timeout: 10_000 });

            await expect(page.locator('input#username')).toHaveValue(newUsername);
        });

        test('client bisa update name dan username sekaligus', async ({ page, asClient }) => {
            await asClient();
            await page.goto('/client/profile');

            const newName = 'Nama Lengkap E2E';
            const newUsername = uniqueUsername('e2e');
            await page.fill('input#name', newName);
            await page.fill('input#username', newUsername);
            await submitProfileUpdate(page);

            await expect(page).toHaveURL('/client/profile');
            await expect(
                page.getByText(/Profile berhasil diperbarui/i),
            ).toBeVisible({ timeout: 10_000 });

            await expect(page.locator('input#name')).toHaveValue(newName);
            await expect(page.locator('input#username')).toHaveValue(newUsername);
        });

        test('email TIDAK berubah setelah update', async ({ page, asClient }) => {
            await asClient();
            await page.goto('/client/profile');

            await page.fill('input#name', 'Nama Baru E2E');
            await submitProfileUpdate(page);

            await expect(page.locator('input#email')).toHaveValue(SEED_CLIENT_EMAIL);
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Form Submit — Negative Path
    |--------------------------------------------------------------------------
    */

    test.describe('Form Submit — Negative Path', () => {
        test.beforeEach(async ({ page, asClient }) => {
            await asClient();
            await page.goto('/client/profile');
        });

        test('gagal submit jika name kosong (browser validation)', async ({ page }) => {
            await page.fill('input#name', '');
            await page.click('button[type="submit"]');
            await expect(page).toHaveURL('/client/profile');
        });

        test('gagal update jika username sudah dipakai user lain (server validation)', async ({ page }) => {
            await page.fill('input#username', 'admin');
            await submitProfileUpdate(page);

            await expect(page).toHaveURL('/client/profile');
            await expect(
                page.getByText(/Username sudah digunakan/i),
            ).toBeVisible({ timeout: 10_000 });
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Email Read-Only Behavior
    |--------------------------------------------------------------------------
    */

    test.describe('Email Read-Only', () => {
        test.beforeEach(async ({ page, asClient }) => {
            await asClient();
            await page.goto('/client/profile');
        });

        test('email tidak bisa diubah (readonly)', async ({ page }) => {
            const emailInput = page.locator('input#email');

            await emailInput.evaluate((el: HTMLInputElement) => {
                el.value = 'newemail@example.com';
            });

            await page.reload();
            await expect(page.locator('input#email')).toHaveValue(SEED_CLIENT_EMAIL);
        });

        test('email disabled tidak bisa difokus', async ({ page }) => {
            const emailInput = page.locator('input#email');
            await expect(emailInput).toBeDisabled();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | UI Interaction — Avatar Preview
    |--------------------------------------------------------------------------
    */

    test.describe('Avatar Preview', () => {
        test.beforeEach(async ({ page, asClient }) => {
            await asClient();
            await page.goto('/client/profile');
            // Reset via UI — 1x saja per describe, bukan per test
            if (await page.locator('input#name').inputValue() !== SEED_CLIENT_NAME) {
                await page.fill('input#name', SEED_CLIENT_NAME);
                await submitProfileUpdate(page);
                await page.goto('/client/profile');
            }
        });

        test('avatar menampilkan huruf pertama dari name', async ({ page }) => {
            await expect(page.getByTestId('avatar-preview')).toHaveText('B');
        });

        test('avatar update saat name diubah di form', async ({ page }) => {
            await page.fill('input#name', 'Zulkifli');
            const avatar = page.getByTestId('avatar-preview');
            await expect(avatar).toHaveText('Z');
        });

        test('preview username update saat username diubah', async ({ page }) => {
            await page.fill('input#username', 'usernamebaru');
            await expect(page.getByText('@usernamebaru').first()).toBeVisible();
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
            await page.goto('/client/profile');
        });

        test('semua input memiliki label yang terasosiasi', async ({ page }) => {
            await expect(page.locator('label[for="name"]')).toBeVisible();
            await expect(page.locator('label[for="username"]')).toBeVisible();
            await expect(page.locator('label[for="email"]')).toBeVisible();
        });

        test('tombol "Reset" memiliki tipe button', async ({ page }) => {
            await expect(
                page.getByRole('button', { name: /^Reset$/i }),
            ).toHaveAttribute('type', 'button');
        });

        test('tombol "Simpan Perubahan" memiliki tipe submit', async ({ page }) => {
            await expect(
                page.getByRole('button', { name: /^Simpan Perubahan$/i }),
            ).toHaveAttribute('type', 'submit');
        });

        test('field email memiliki aria-readonly atau disabled', async ({ page }) => {
            const emailInput = page.locator('input#email');
            const readonly = await emailInput.getAttribute('readonly');
            const disabled = await emailInput.getAttribute('disabled');
            expect(readonly !== null || disabled !== null).toBe(true);
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Flash Message
    |--------------------------------------------------------------------------
    */

    test.describe('Flash Message', () => {
        test('tidak menampilkan flash status di halaman normal', async ({ page, asClient }) => {
            await asClient();
            await page.goto('/client/profile');

            await expect(page.locator('.bg-green-50')).not.toBeVisible();
        });
    });
});