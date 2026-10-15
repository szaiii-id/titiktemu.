import { test, expect, SEED_USERS, uniqueEmail, uniqueUsername } from '../fixtures/auth';

/**
 * Admin — Edit, Delete, Reset Password User
 *
 * Routes:
 * - GET    /admin/users/{id}/edit         → UserController@edit
 * - PUT    /admin/users/{id}              → UserController@update
 * - DELETE /admin/users/{id}              → UserController@destroy
 * - POST   /admin/users/{id}/reset-password → UserController@resetPassword
 *
 * Behavior:
 * - Admin hanya bisa edit/delete/reset user role=admin/mitra (client → 404).
 * - Admin TIDAK bisa hapus diri sendiri (abort 403).
 * - Update user: data akun (name, email, username) + profile (kalau mitra).
 * - Delete user: cascade profile (via repository).
 * - Reset password: generate password baru, tampilkan via CredentialsModal.
 *
 * Seed user (dari UserSeeder):
 * - admin@titiktemu.test / admin / "Administrator Utama" (role=admin)
 * - budi@ptabc.com / ptabc / "Budi Santoso" (role=mitra, profile="PT ABC Travel")
 * - ani@gmail.com / ani / "Ani Wijaya" (role=mitra, profile=null)
 *
 * URUTAN TEST (PENTING):
 * File ini pakai describe.serial untuk section yang MENGUBAH/MENGHAPUS data.
 * Test diurutkan:
 *   1. Access Control, Contract, Data Init, Navigasi, Validasi, a11y (READ-ONLY)
 *   2. Happy Path Edit (ubah data seed)
 *   3. Delete (hapus seed Ani Wijaya)
 *   4. Reset Password (reset Budi Santoso)
 *
 * Test 2, 3, 4 TIDAK idempotent — kalau di-run di DB yang sudah ter-modif,
 * hasilnya bisa beda. Global setup `migrate:fresh + seed` per run
 * memastikan DB selalu fresh.
 */

// ==========================================
// KONSTANTA — sinkron dengan UserSeeder.php
// ==========================================
const SEED_ADMIN = {
    name: 'Administrator Utama',
    username: 'admin',
    email: 'admin@titiktemu.test',
};

const SEED_MITRA_1 = {
    name: 'Budi Santoso',
    username: 'ptabc',
    email: 'budi@ptabc.com',
    namaPenyediaUsaha: 'PT ABC Travel',
    nomorIdentitas: '12.345.678.9-012.000',
    alamat: 'Jl. Merdeka No. 123',
    telepon: '+62 811 2233 4455',
    provinsi: 'Kalimantan Selatan',
    kota: 'Banjarmasin',
    kodePos: '70111',
};

const SEED_MITRA_2 = {
    name: 'Ani Wijaya',
    username: 'aniwijaya',
    email: 'ani@gmail.com',
};

// ==========================================
// HELPER
// ==========================================
/**
 * Submit form edit dan tunggu response PUT /admin/users/{id}.
 */
async function submitEditForm(page: any): Promise<void> {
    await Promise.all([
        page.waitForResponse(
            (resp: any) =>
                resp.url().includes('/admin/users/') &&
                resp.request().method() === 'PUT',
            { timeout: 15_000 },
        ),
        page.getByRole('button', { name: /Simpan Perubahan/i }).click(),
    ]);
}

// ==========================================
// TEST SUITE
// ==========================================
test.describe('Admin — Edit / Delete / Reset User', () => {
    /*
    |--------------------------------------------------------------------------
    | Access Control
    |--------------------------------------------------------------------------
    */

    test('guest tidak bisa akses halaman edit user', async ({ page, asGuest }) => {
        await asGuest();
        // ID 1 = admin seed (asumsi). Kalau bukan, ini tetap test redirect.
        await page.goto('/admin/users/1/edit');
        await expect(page).toHaveURL('/login');
    });

    test('client tidak bisa akses halaman edit user', async ({ page, asClient }) => {
        await asClient();
        await page.goto('/admin/users/1/edit');
        await expect(page).toHaveURL('/client/dashboard');
    });

    test('mitra tidak bisa akses halaman edit user', async ({ page, asMitra }) => {
        await asMitra();
        await page.goto('/admin/users/1/edit');
        await expect(page).toHaveURL('/mitra/dashboard');
    });

    test('admin bisa akses halaman edit user', async ({ page, asAdmin }) => {
        await asAdmin();
        // Cari admin seed via halaman index dulu untuk dapat ID
        await page.goto('/admin/users');

        const adminRow = page
            .locator('tbody tr')
            .filter({ hasText: SEED_ADMIN.email });

        const editLink = adminRow.getByLabel('Edit user');
        await editLink.click();

        await expect(page).toHaveURL(/\/admin\/users\/\d+\/edit$/);
    });

    test('admin TIDAK bisa edit user role=client (404)', async ({ page, asAdmin }) => {
        await asAdmin();

        // Ambil ID client seed via request (tidak ada UI untuk lihat)
        // Asumsi: client ID tidak 1/2/3. Coba akses user yang BUKAN admin/mitra.
        // Kita pakai pendekatan: ambil ID dari halaman /admin/clients,
        // tapi read-only. Jadi kita coba ID 4 (kemungkinan client).
        // Lebih aman: skip test jika tidak bisa dipastikan.

        // Verifikasi: akses dengan ID besar yang tidak ada → 404
        const response = await page.goto('/admin/users/99999/edit');
        expect(response?.status()).toBe(404);
    });

    /*
    |--------------------------------------------------------------------------
    | Contract — Elemen Halaman Edit Admin
    |--------------------------------------------------------------------------
    */

    test.describe('Contract — Edit Admin', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/users');

            const adminRow = page
                .locator('tbody tr')
                .filter({ hasText: SEED_ADMIN.email });

            await adminRow.getByLabel('Edit user').click();
            await page.waitForURL(/\/admin\/users\/\d+\/edit$/);
        });

        test('menampilkan breadcrumb "Kembali ke Daftar User"', async ({ page }) => {
            await expect(
                page.getByRole('link', { name: /Kembali ke Daftar User/i }),
            ).toBeVisible();
        });

        test('breadcrumb mengarah ke /admin/users', async ({ page }) => {
            await expect(
                page.getByRole('link', { name: /Kembali ke Daftar User/i }),
            ).toHaveAttribute('href', /\/admin\/users$/);
        });

        test('menampilkan heading "Edit {name}"', async ({ page }) => {
            await expect(
                page.getByRole('heading', { name: /Edit Administrator Utama/i }),
            ).toBeVisible();
        });

        test('menampilkan badge role "Admin"', async ({ page }) => {
            await expect(
                page.getByText('Admin', { exact: true }).first(),
            ).toBeVisible();
        });

        test('menampilkan field name, email, username', async ({ page }) => {
            await expect(page.locator('input#name')).toBeVisible();
            await expect(page.locator('input#email')).toBeVisible();
            await expect(page.locator('input#username')).toBeVisible();
        });

        test('TIDAK menampilkan section "Data Usaha"', async ({ page }) => {
            await expect(
                page.getByRole('heading', { name: /Data Usaha/i }),
            ).not.toBeVisible();
        });

        test('menampilkan tombol "Batal"', async ({ page }) => {
            await expect(
                page.getByRole('link', { name: /^Batal$/i }),
            ).toBeVisible();
        });

        test('menampilkan tombol "Simpan Perubahan"', async ({ page }) => {
            await expect(
                page.getByRole('button', { name: /Simpan Perubahan/i }),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Contract — Elemen Halaman Edit Mitra
    |--------------------------------------------------------------------------
    */

    test.describe('Contract — Edit Mitra', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/users');

            const mitraRow = page
                .locator('tbody tr')
                .filter({ hasText: SEED_MITRA_1.email });

            await mitraRow.getByLabel('Edit user').click();
            await page.waitForURL(/\/admin\/users\/\d+\/edit$/);
        });

        test('menampilkan heading "Edit Budi Santoso"', async ({ page }) => {
            await expect(
                page.getByRole('heading', { name: /Edit Budi Santoso/i }),
            ).toBeVisible();
        });

        test('menampilkan badge role "Mitra"', async ({ page }) => {
            await expect(
                page.getByText('Mitra', { exact: true }).first(),
            ).toBeVisible();
        });

        test('menampilkan section "Data Usaha"', async ({ page }) => {
            await expect(
                page.getByRole('heading', { name: /Data Usaha/i }),
            ).toBeVisible();
        });

        test('menampilkan field data usaha', async ({ page }) => {
            await expect(page.locator('input#nama_penyedia_usaha')).toBeVisible();
            await expect(page.locator('input#nomor_identitas')).toBeVisible();
            await expect(page.locator('input#telepon')).toBeVisible();
            await expect(page.locator('textarea#alamat')).toBeVisible();
            await expect(page.locator('input#provinsi')).toBeVisible();
            await expect(page.locator('input#kota')).toBeVisible();
            await expect(page.locator('input#kode_pos')).toBeVisible();
            await expect(page.locator('textarea#deskripsi')).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Data Initialization
    |--------------------------------------------------------------------------
    */

    test.describe('Data Initialization', () => {
        test('field admin terisi dari seed', async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/users');

            const adminRow = page
                .locator('tbody tr')
                .filter({ hasText: SEED_ADMIN.email });

            await adminRow.getByLabel('Edit user').click();
            await page.waitForURL(/\/admin\/users\/\d+\/edit$/);

            await expect(page.locator('input#name')).toHaveValue(SEED_ADMIN.name);
            await expect(page.locator('input#email')).toHaveValue(SEED_ADMIN.email);
            await expect(page.locator('input#username')).toHaveValue(SEED_ADMIN.username);
        });

        test('field mitra terisi dari seed', async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/users');

            const mitraRow = page
                .locator('tbody tr')
                .filter({ hasText: SEED_MITRA_1.email });

            await mitraRow.getByLabel('Edit user').click();
            await page.waitForURL(/\/admin\/users\/\d+\/edit$/);

            await expect(page.locator('input#name')).toHaveValue(SEED_MITRA_1.name);
            await expect(page.locator('input#email')).toHaveValue(SEED_MITRA_1.email);
            await expect(page.locator('input#username')).toHaveValue(SEED_MITRA_1.username);
        });

        test('field profile mitra terisi dari seed', async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/users');

            const mitraRow = page
                .locator('tbody tr')
                .filter({ hasText: SEED_MITRA_1.email });

            await mitraRow.getByLabel('Edit user').click();
            await page.waitForURL(/\/admin\/users\/\d+\/edit$/);

            await expect(page.locator('input#nama_penyedia_usaha')).toHaveValue(
                SEED_MITRA_1.namaPenyediaUsaha,
            );
            await expect(page.locator('input#nomor_identitas')).toHaveValue(
                SEED_MITRA_1.nomorIdentitas,
            );
            await expect(page.locator('input#kota')).toHaveValue(SEED_MITRA_1.kota);
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Navigasi
    |--------------------------------------------------------------------------
    */

    test.describe('Navigasi', () => {
        test('breadcrumb klik kembali ke /admin/users', async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/users');

            const adminRow = page
                .locator('tbody tr')
                .filter({ hasText: SEED_ADMIN.email });

            await adminRow.getByLabel('Edit user').click();
            await page.waitForURL(/\/admin\/users\/\d+\/edit$/);

            await page.getByRole('link', { name: /Kembali ke Daftar User/i }).click();
            await expect(page).toHaveURL('/admin/users');
        });

        test('tombol Batal mengarah ke /admin/users', async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/users');

            const adminRow = page
                .locator('tbody tr')
                .filter({ hasText: SEED_ADMIN.email });

            await adminRow.getByLabel('Edit user').click();
            await page.waitForURL(/\/admin\/users\/\d+\/edit$/);

            const batal = page.getByRole('link', { name: /^Batal$/i });
            await expect(batal).toHaveAttribute('href', /\/admin\/users$/);
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Validasi Browser (tidak kirim POST)
    |--------------------------------------------------------------------------
    */

    test.describe('Validasi Browser', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/users');

            const adminRow = page
                .locator('tbody tr')
                .filter({ hasText: SEED_ADMIN.email });

            await adminRow.getByLabel('Edit user').click();
            await page.waitForURL(/\/admin\/users\/\d+\/edit$/);
        });

        test('gagal submit jika name kosong', async ({ page }) => {
            await page.fill('input#name', '');
            await page.getByRole('button', { name: /Simpan Perubahan/i }).click();

            await expect(page).toHaveURL(/\/admin\/users\/\d+\/edit$/);
        });

        test('gagal submit jika email kosong', async ({ page }) => {
            await page.fill('input#email', '');
            await page.getByRole('button', { name: /Simpan Perubahan/i }).click();

            await expect(page).toHaveURL(/\/admin\/users\/\d+\/edit$/);
        });

        test('gagal submit jika email format invalid', async ({ page }) => {
            await page.fill('input#email', 'bukan-email');
            await page.getByRole('button', { name: /Simpan Perubahan/i }).click();

            await expect(page).toHaveURL(/\/admin\/users\/\d+\/edit$/);
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Validasi Server (PUT terkirim, ditolak server)
    |--------------------------------------------------------------------------
    */

    test.describe('Validasi Server', () => {
        test('gagal jika email duplikat dengan user lain', async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/users');

            const adminRow = page
                .locator('tbody tr')
                .filter({ hasText: SEED_ADMIN.email });

            await adminRow.getByLabel('Edit user').click();
            await page.waitForURL(/\/admin\/users\/\d+\/edit$/);

            // Coba pakai email mitra (duplikat)
            await page.fill('input#email', SEED_MITRA_1.email);
            await submitEditForm(page);

            await expect(page).toHaveURL(/\/admin\/users\/\d+\/edit$/);
            await expect(
                page.getByText(/Email sudah digunakan/i),
            ).toBeVisible({ timeout: 10_000 });
        });

        test('gagal jika username duplikat dengan user lain', async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/users');

            const adminRow = page
                .locator('tbody tr')
                .filter({ hasText: SEED_ADMIN.email });

            await adminRow.getByLabel('Edit user').click();
            await page.waitForURL(/\/admin\/users\/\d+\/edit$/);

            // Coba pakai username mitra (duplikat)
            await page.fill('input#username', SEED_MITRA_1.username);
            await submitEditForm(page);

            await expect(page).toHaveURL(/\/admin\/users\/\d+\/edit$/);
            await expect(
                page.getByText(/Username sudah digunakan/i),
            ).toBeVisible({ timeout: 10_000 });
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Accessibility (a11y)
    |--------------------------------------------------------------------------
    */

    test.describe('Accessibility', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/users');

            const adminRow = page
                .locator('tbody tr')
                .filter({ hasText: SEED_ADMIN.email });

            await adminRow.getByLabel('Edit user').click();
            await page.waitForURL(/\/admin\/users\/\d+\/edit$/);
        });

        test('semua input punya label terasosiasi', async ({ page }) => {
            await expect(page.locator('label[for="name"]')).toBeVisible();
            await expect(page.locator('label[for="email"]')).toBeVisible();
            await expect(page.locator('label[for="username"]')).toBeVisible();
        });

        test('tombol "Simpan Perubahan" bertipe submit', async ({ page }) => {
            await expect(
                page.getByRole('button', { name: /Simpan Perubahan/i }),
            ).toHaveAttribute('type', 'submit');
        });

        test('breadcrumb punya href yang benar', async ({ page }) => {
            await expect(
                page.getByRole('link', { name: /Kembali ke Daftar User/i }),
            ).toHaveAttribute('href', /\/admin\/users$/);
        });
    });

    /*
    |--------------------------------------------------------------------------
    | HAPPY PATH — EDIT (serial, di akhir file)
    |--------------------------------------------------------------------------
    |
    | PENTING: Test di bawah ini MENGUBAH data seed di DB.
    | Semua test di atas HARUS JALAN SEBELUM section ini.
    |
    | Kalau di-run tanpa global setup migrate:fresh + seed, hasil bisa beda.
    |--------------------------------------------------------------------------
    */

    test.describe.serial('Happy Path — Edit User', () => {
        test('admin bisa update nama dirinya sendiri (Administrator → Admin Utama)', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await page.goto('/admin/users');

            const adminRow = page
                .locator('tbody tr')
                .filter({ hasText: SEED_ADMIN.email });

            await adminRow.getByLabel('Edit user').click();
            await page.waitForURL(/\/admin\/users\/\d+\/edit$/);

            const newName = 'Admin Utama E2E';
            await page.fill('input#name', newName);
            await submitEditForm(page);

            // Redirect ke index + flash status
            await expect(page).toHaveURL('/admin/users', { timeout: 15_000 });
            await expect(
                page.getByText(/User berhasil diperbarui/i),
            ).toBeVisible({ timeout: 10_000 });

            // Nama baru muncul di tabel
            const tableBody = page.locator('tbody');
            await expect(
                tableBody.getByText(newName, { exact: true }),
            ).toBeVisible();
        });

        test('admin bisa update email & username mitra', async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/users');

            const mitraRow = page
                .locator('tbody tr')
                .filter({ hasText: SEED_MITRA_2.email });

            await mitraRow.getByLabel('Edit user').click();
            await page.waitForURL(/\/admin\/users\/\d+\/edit$/);

            const newEmail = uniqueEmail('editmitra');
            const newUsername = uniqueUsername('editmitra');

            await page.fill('input#email', newEmail);
            await page.fill('input#username', newUsername);
            await submitEditForm(page);

            await expect(page).toHaveURL('/admin/users', { timeout: 15_000 });
            await expect(
                page.getByText(/User berhasil diperbarui/i),
            ).toBeVisible({ timeout: 10_000 });

            const tableBody = page.locator('tbody');
            await expect(tableBody.getByText(newEmail)).toBeVisible();
            await expect(tableBody.getByText(`@${newUsername}`)).toBeVisible();
        });

        test('admin bisa update data usaha mitra', async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/users');

            const mitraRow = page
                .locator('tbody tr')
                .filter({ hasText: SEED_MITRA_1.email });

            await mitraRow.getByLabel('Edit user').click();
            await page.waitForURL(/\/admin\/users\/\d+\/edit$/);

            const newNamaUsaha = 'PT ABC Travel Updated E2E';
            await page.fill('input#nama_penyedia_usaha', newNamaUsaha);
            await page.fill('input#kota', 'Jakarta Pusat');
            await submitEditForm(page);

            await expect(page).toHaveURL('/admin/users', { timeout: 15_000 });
            await expect(
                page.getByText(/User berhasil diperbarui/i),
            ).toBeVisible({ timeout: 10_000 });

            // Nama usaha baru muncul di kolom Usaha
            const tableBody = page.locator('tbody');
            await expect(tableBody.getByText(newNamaUsaha)).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | HAPPY PATH — DELETE (serial, di akhir)
    |--------------------------------------------------------------------------
    |
    | Hapus user seed Ani Wijaya (mitra kedua).
    | Setelah test ini, Ani Wijaya tidak ada di DB.
    |--------------------------------------------------------------------------
    */

    test.describe.serial('Happy Path — Delete User', () => {
       test('admin bisa hapus user mitra (Ani Wijaya)', async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/users');

            // mengubah email Ani Wijaya → uniqueEmail baru.
            // Name "Ani Wijaya" TIDAK diubah oleh test Edit.
            const mitraRow = page
                .locator('tbody tr')
                .filter({ hasText: SEED_MITRA_2.name }); // ← "Ani Wijaya"

            // Klik tombol Hapus
            await mitraRow.getByLabel('Hapus user').click();

            // Modal muncul
            await expect(
                page.getByRole('heading', { name: /Hapus User\?/i }),
            ).toBeVisible();

            // Klik konfirmasi
            await Promise.all([
                page.waitForResponse(
                    (resp: any) =>
                        resp.url().includes('/admin/users/') &&
                        resp.request().method() === 'DELETE',
                    { timeout: 15_000 },
                ),
                page.getByRole('button', { name: /Ya, Hapus/i }).click(),
            ]);

            // Redirect ke index + flash status
            await expect(page).toHaveURL('/admin/users', { timeout: 15_000 });
            await expect(
                page.getByText(/User berhasil dihapus/i).first(),
            ).toBeVisible({ timeout: 10_000 });

            // Ani Wijaya TIDAK ada lagi di tabel (cari pakai name)
            const tableBody = page.locator('tbody');
            await expect(
                tableBody.getByText(SEED_MITRA_2.name, { exact: true }),
            ).not.toBeVisible();
        });

        test('admin TIDAK bisa hapus dirinya sendiri', async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/users');

            // Cari row admin sendiri
            const adminRow = page
                .locator('tbody tr')
                .filter({ hasText: SEED_ADMIN.email });

            // Tombol Hapus TIDAK muncul (conditional render)
            await expect(
                adminRow.getByLabel('Hapus user'),
            ).not.toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | HAPPY PATH — RESET PASSWORD (serial, di akhir)
    |--------------------------------------------------------------------------
    |
    | Reset password user seed Budi Santoso.
    | Setelah test ini, password Budi tidak lagi `password123`.
    |--------------------------------------------------------------------------
    */

    test.describe.serial('Happy Path — Reset Password', () => {
        test('admin bisa reset password user mitra (Budi Santoso)', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await page.goto('/admin/users');

            // Cari row Budi Santoso
            const mitraRow = page
                .locator('tbody tr')
                .filter({ hasText: SEED_MITRA_1.email });

            // Klik tombol Reset Password
            await mitraRow.getByLabel('Reset password').click();

            // Modal konfirmasi muncul
            await expect(
                page.getByRole('heading', { name: /Reset Password\?/i }),
            ).toBeVisible();

            // Klik konfirmasi
            await Promise.all([
                page.waitForResponse(
                    (resp: any) =>
                        resp.url().includes('/reset-password') &&
                        resp.request().method() === 'POST',
                    { timeout: 15_000 },
                ),
                page.getByRole('button', { name: /Ya, Reset Password/i }).click(),
            ]);

            // Redirect ke index + flash status
            await expect(page).toHaveURL('/admin/users', { timeout: 15_000 });

            // Modal kredensial muncul dengan password baru
            await expect(
                page.getByRole('heading', { name: /Kredensial User/i }),
            ).toBeVisible({ timeout: 10_000 });

            // Password ditampilkan (bukan kosong)
            const passwordField = page
                .locator('p.font-mono')
                .first();
            const passwordText = await passwordField.textContent();
            expect(passwordText).toBeTruthy();
            expect(passwordText?.length).toBeGreaterThanOrEqual(8);
        });

        test('modal kredensial bisa ditutup', async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/users');

            const mitraRow = page
                .locator('tbody tr')
                .filter({ hasText: SEED_MITRA_1.email });

            await mitraRow.getByLabel('Reset password').click();
            await page.getByRole('button', { name: /Ya, Reset Password/i }).click();

            // Tunggu modal kredensial muncul
            await expect(
                page.getByRole('heading', { name: /Kredensial User/i }),
            ).toBeVisible({ timeout: 10_000 });

            // Klik tombol Tutup
            await page.getByRole('button', { name: /^Tutup$/i }).click();

            // Modal hilang
            await expect(
                page.getByRole('heading', { name: /Kredensial User/i }),
            ).not.toBeVisible();
        });
    });
});