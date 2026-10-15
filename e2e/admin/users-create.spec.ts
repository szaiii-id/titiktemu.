import { test, expect, SEED_USERS, uniqueEmail, uniqueUsername } from '../fixtures/auth';

/**
 * Admin — Buat User Baru (Create)
 *
 * Route: GET /admin/users/create  → Admin\UserController@create
 *        POST /admin/users         → Admin\UserController@store
 *
 * Behavior:
 * - Step 1: pilih role (admin / mitra). Client TIDAK bisa dibuat di sini.
 * - Step 2: form data akun + (kalau mitra) data usaha.
 * - Password opsional: kalau kosong, server auto-generate (Str::password(12)).
 * - must_change_password = true untuk semua user baru.
 * - Sukses: redirect ke /admin/users + flash credentials (1x lihat) + modal.
 *
 * Validasi (CreateUserRequest):
 * - role: required, in:admin,mitra
 * - name: required, max:255
 * - email: required, email, unique:users,email
 * - username: nullable, unique:users,username
 * - password: nullable, Password::defaults() (min 8, huruf+angka)
 * - Field mitra: semua nullable (opsional)
 *
 * CATATAN PENTING:
 * - Test happy path MENAMBAH user baru ke DB → state leak.
 * - Pakai describe.serial() untuk happy path + taruh di paling akhir.
 * - Setiap test pakai uniqueEmail/uniqueUsername supaya tidak collision.
 */

// ==========================================
// KONSTANTA
// ==========================================
const NEW_ADMIN = {
    name: 'Admin Baru E2E',
    password: 'AdminBaru123!',
};

const NEW_MITRA = {
    name: 'Mitra Baru E2E',
    password: 'MitraBaru123!',
    namaPenyediaUsaha: 'PT Mitra E2E Travel',
    nomorIdentitas: '12.345.678.9-012.999',
    alamat: 'Jl. Test E2E No. 42',
    telepon: '+62 812 3456 9999',
    provinsi: 'Jawa Barat',
    kota: 'Bandung',
    kodePos: '40111',
    deskripsi: 'Mitra baru hasil test E2E.',
};

// ==========================================
// HELPER
// ==========================================
/**
 * Pilih role di step 1 dan tunggu step 2 muncul.
 */
async function selectRole(page: any, role: 'admin' | 'mitra'): Promise<void> {
    const label = role === 'admin' ? 'Admin' : 'Mitra';

    // Card role punya heading h3 dengan text role
    await page
        .locator('button')
        .filter({ has: page.getByRole('heading', { name: label, exact: true }) })
        .click();

    // Tunggu step 2 muncul (heading "Buat Akun {Role}")
    await expect(
        page.getByRole('heading', { name: new RegExp(`Buat Akun ${label}`, 'i') }),
    ).toBeVisible();
}

/**
 * Isi field form create user.
 */
async function fillAccountFields(
    page: any,
    data: {
        name?: string;
        email?: string;
        username?: string;
        password?: string;
    },
): Promise<void> {
    if (data.name !== undefined) await page.fill('input#name', data.name);
    if (data.email !== undefined) await page.fill('input#email', data.email);
    if (data.username !== undefined) await page.fill('input#username', data.username);
    if (data.password !== undefined) await page.fill('input#password', data.password);
}

/**
 * Submit form create dan tunggu response POST /admin/users.
 */
async function submitCreateUser(page: any): Promise<void> {
    await Promise.all([
        page.waitForResponse(
            (resp: any) =>
                resp.url().includes('/admin/users') &&
                resp.request().method() === 'POST' &&
                !resp.url().includes('/create'),
            { timeout: 15_000 },
        ),
        page.getByRole('button', { name: /^Buat User$/i }).click(),
    ]);
}

// ==========================================
// TEST SUITE
// ==========================================
test.describe('Admin — Buat User Baru', () => {
    /*
    |--------------------------------------------------------------------------
    | Access Control
    |--------------------------------------------------------------------------
    */

    test('guest tidak bisa akses halaman create user', async ({ page, asGuest }) => {
        await asGuest();
        await page.goto('/admin/users/create');
        await expect(page).toHaveURL('/login');
    });

    test('client tidak bisa akses halaman create user', async ({ page, asClient }) => {
        await asClient();
        await page.goto('/admin/users/create');
        await expect(page).toHaveURL('/client/dashboard');
    });

    test('mitra tidak bisa akses halaman create user', async ({ page, asMitra }) => {
        await asMitra();
        await page.goto('/admin/users/create');
        await expect(page).toHaveURL('/mitra/dashboard');
    });

    test('admin bisa akses halaman create user', async ({ page, asAdmin }) => {
        await asAdmin();
        await page.goto('/admin/users/create');
        await expect(page).toHaveURL('/admin/users/create');
    });

    /*
    |--------------------------------------------------------------------------
    | Step 1 — Pilih Role
    |--------------------------------------------------------------------------
    */

    test.describe('Step 1 — Pilih Role', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/users/create');
        });

        test('menampilkan heading "Pilih Role User"', async ({ page }) => {
            await expect(
                page.getByRole('heading', { name: /Pilih Role User/i }),
            ).toBeVisible();
        });

        test('menampilkan deskripsi "Client tidak bisa dibuat di sini"', async ({
            page,
        }) => {
            await expect(
                page.getByText(/Client tidak bisa dibuat di sini/i),
            ).toBeVisible();
        });

        test('menampilkan card Admin dengan deskripsi', async ({ page }) => {
            await expect(
                page.getByRole('heading', { name: 'Admin', exact: true }),
            ).toBeVisible();
            await expect(
                page.getByText(/Pengelola platform/i),
            ).toBeVisible();
        });

        test('menampilkan card Mitra dengan deskripsi', async ({ page }) => {
            await expect(
                page.getByRole('heading', { name: 'Mitra', exact: true }),
            ).toBeVisible();
            await expect(
                page.getByText(/Penyedia layanan travel/i),
            ).toBeVisible();
        });

        test('step indicator menunjukkan step 1 aktif', async ({ page }) => {
            await expect(page.getByText(/Pilih Role/i).first()).toBeVisible();
            await expect(page.getByText(/Isi Data/i).first()).toBeVisible();
        });

        test('breadcrumb "Kembali ke Daftar User" mengarah ke /admin/users', async ({
            page,
        }) => {
            await expect(
                page.getByRole('link', { name: /Kembali ke Daftar User/i }),
            ).toHaveAttribute('href', /\/admin\/users$/);
        });

        test('klik card Admin pindah ke step 2', async ({ page }) => {
            await selectRole(page, 'admin');

            await expect(
                page.getByRole('heading', { name: /Buat Akun Admin/i }),
            ).toBeVisible();
        });

        test('klik card Mitra pindah ke step 2', async ({ page }) => {
            await selectRole(page, 'mitra');

            await expect(
                page.getByRole('heading', { name: /Buat Akun Mitra/i }),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Step 2 — Form Admin
    |--------------------------------------------------------------------------
    */

    test.describe('Step 2 — Form Admin', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/users/create');
            await selectRole(page, 'admin');
        });

        test('menampilkan heading "Buat Akun Admin"', async ({ page }) => {
            await expect(
                page.getByRole('heading', { name: /Buat Akun Admin/i }),
            ).toBeVisible();
        });

        test('menampilkan deskripsi "Isi data dasar untuk akun admin"', async ({
            page,
        }) => {
            await expect(
                page.getByText(/Isi data dasar untuk akun admin/i),
            ).toBeVisible();
        });

        test('TIDAK menampilkan section "Data Usaha"', async ({ page }) => {
            await expect(
                page.getByRole('heading', { name: /^Data Usaha/i }),
            ).not.toBeVisible();
        });

        test('menampilkan field name, email, username, password', async ({ page }) => {
            await expect(page.locator('input#name')).toBeVisible();
            await expect(page.locator('input#email')).toBeVisible();
            await expect(page.locator('input#username')).toBeVisible();
            await expect(page.locator('input#password')).toBeVisible();
        });

        test('field name wajib diisi (required)', async ({ page }) => {
            await expect(page.locator('input#name')).toHaveAttribute('required', '');
        });

        test('field email wajib diisi (required)', async ({ page }) => {
            await expect(page.locator('input#email')).toHaveAttribute('required', '');
        });

        test('field username TIDAK required (opsional)', async ({ page }) => {
            const username = page.locator('input#username');
            const isRequired = await username.getAttribute('required');
            expect(isRequired).toBeNull();
        });

        test('field password TIDAK required (auto-generate kalau kosong)', async ({
            page,
        }) => {
            const password = page.locator('input#password');
            const isRequired = await password.getAttribute('required');
            expect(isRequired).toBeNull();
        });

        test('menampilkan tombol "Generate" untuk password', async ({ page }) => {
            await expect(
                page.getByRole('button', { name: /^Generate$/i }),
            ).toBeVisible();
        });

        test('menampilkan tombol "Buat User"', async ({ page }) => {
            await expect(
                page.getByRole('button', { name: /^Buat User$/i }),
            ).toBeVisible();
        });

        test('menampilkan tombol "Ganti Role" untuk kembali ke step 1', async ({
            page,
        }) => {
            await expect(
                page.getByRole('button', { name: /Ganti Role/i }),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Step 2 — Form Mitra
    |--------------------------------------------------------------------------
    */

    test.describe('Step 2 — Form Mitra', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/users/create');
            await selectRole(page, 'mitra');
        });

        test('menampilkan heading "Buat Akun Mitra"', async ({ page }) => {
            await expect(
                page.getByRole('heading', { name: /Buat Akun Mitra/i }),
            ).toBeVisible();
        });

        test('menampilkan section "Data Usaha" dengan label (opsional)', async ({
            page,
        }) => {
            await expect(
                page.getByRole('heading', { name: /Data Usaha/i }),
            ).toBeVisible();
            await expect(
                page.getByText(/\(opsional\)/i).first(),
            ).toBeVisible();
        });

        test('menampilkan field data usaha lengkap', async ({ page }) => {
            await expect(page.locator('input#nama_penyedia_usaha')).toBeVisible();
            await expect(page.locator('input#nomor_identitas')).toBeVisible();
            await expect(page.locator('input#telepon')).toBeVisible();
            await expect(page.locator('textarea#alamat')).toBeVisible();
            await expect(page.locator('input#provinsi')).toBeVisible();
            await expect(page.locator('input#kota')).toBeVisible();
            await expect(page.locator('input#kode_pos')).toBeVisible();
            await expect(page.locator('textarea#deskripsi')).toBeVisible();
        });

        test('field data usaha TIDAK required (semua opsional)', async ({ page }) => {
            await expect(page.locator('input#nama_penyedia_usaha')).not.toHaveAttribute(
                'required',
                '',
            );
            await expect(page.locator('input#nomor_identitas')).not.toHaveAttribute(
                'required',
                '',
            );
        });

        test('field data akun tetap required', async ({ page }) => {
            await expect(page.locator('input#name')).toHaveAttribute('required', '');
            await expect(page.locator('input#email')).toHaveAttribute('required', '');
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Navigasi Step
    |--------------------------------------------------------------------------
    */

    test.describe('Navigasi Step', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/users/create');
        });

        test('tombol "Ganti Role" kembali ke step 1', async ({ page }) => {
            await selectRole(page, 'admin');
            await expect(
                page.getByRole('heading', { name: /Buat Akun Admin/i }),
            ).toBeVisible();

            await page.getByRole('button', { name: /Ganti Role/i }).click();

            await expect(
                page.getByRole('heading', { name: /Pilih Role User/i }),
            ).toBeVisible();
        });

        test('tombol "Kembali" di footer kembali ke step 1', async ({ page }) => {
            await selectRole(page, 'mitra');

            await page.getByRole('button', { name: /^Kembali$/i }).click();

            await expect(
                page.getByRole('heading', { name: /Pilih Role User/i }),
            ).toBeVisible();
        });

        test('kembali ke step 1 menghapus error yang ada', async ({ page }) => {
            // Pilih admin, isi data duplikat, submit → dapat error
            await selectRole(page, 'admin');
            await fillAccountFields(page, {
                name: 'Test',
                email: SEED_USERS.admin.email, // duplikat
                password: 'Test12345!',
            });
            await submitCreateUser(page);

            // Error muncul
            await expect(
                page.getByText(/Email sudah digunakan/i),
            ).toBeVisible();

            // Klik Ganti Role
            await page.getByRole('button', { name: /Ganti Role/i }).click();

            // Kembali ke step 2, error harus hilang
            await selectRole(page, 'admin');
            await expect(
                page.getByText(/Email sudah digunakan/i),
            ).not.toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Generate Password
    |--------------------------------------------------------------------------
    */

    test.describe('Generate Password', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/users/create');
            await selectRole(page, 'admin');
        });

        test('klik Generate mengisi field password', async ({ page }) => {
            const passwordField = page.locator('input#password');
            await expect(passwordField).toHaveValue('');

            await page.getByRole('button', { name: /^Generate$/i }).click();

            // Password terisi (12 karakter)
            const value = await passwordField.inputValue();
            expect(value.length).toBeGreaterThanOrEqual(8);
        });

        test('setelah Generate, password visible (bukan dots)', async ({ page }) => {
            await page.getByRole('button', { name: /^Generate$/i }).click();

            await expect(page.locator('input#password')).toHaveAttribute(
                'type',
                'text',
            );
        });

        test('generate 2x menghasilkan password berbeda', async ({ page }) => {
            await page.getByRole('button', { name: /^Generate$/i }).click();
            const pwd1 = await page.locator('input#password').inputValue();

            await page.getByRole('button', { name: /^Generate$/i }).click();
            const pwd2 = await page.locator('input#password').inputValue();

            expect(pwd1).not.toBe(pwd2);
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Toggle Password
    |--------------------------------------------------------------------------
    */

    test.describe('Toggle Password', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/users/create');
            await selectRole(page, 'admin');
        });

        test('toggle password mengubah type', async ({ page }) => {
            const input = page.locator('input#password');
            await expect(input).toHaveAttribute('type', 'password');

            await page.getByLabel('Toggle password').click();
            await expect(input).toHaveAttribute('type', 'text');

            await page.getByLabel('Toggle password').click();
            await expect(input).toHaveAttribute('type', 'password');
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
            await page.goto('/admin/users/create');
            await selectRole(page, 'admin');
        });

        test('gagal submit jika name kosong', async ({ page }) => {
            await fillAccountFields(page, {
                email: uniqueEmail('noname'),
                password: 'Test12345!',
            });
            await page.getByRole('button', { name: /^Buat User$/i }).click();

            await expect(page).toHaveURL('/admin/users/create');
        });

        test('gagal submit jika email kosong', async ({ page }) => {
            await fillAccountFields(page, {
                name: 'Test',
                password: 'Test12345!',
            });
            await page.getByRole('button', { name: /^Buat User$/i }).click();

            await expect(page).toHaveURL('/admin/users/create');
        });

        test('gagal submit jika email format invalid', async ({ page }) => {
            await fillAccountFields(page, {
                name: 'Test',
                email: 'bukan-email',
                password: 'Test12345!',
            });
            await page.getByRole('button', { name: /^Buat User$/i }).click();

            await expect(page).toHaveURL('/admin/users/create');
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Validasi Server (POST terkirim, ditolak server)
    |--------------------------------------------------------------------------
    */

    test.describe('Validasi Server', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/users/create');
            await selectRole(page, 'admin');
        });

        test('gagal jika email sudah terdaftar (admin seed)', async ({ page }) => {
            await fillAccountFields(page, {
                name: 'Test Duplikat',
                email: SEED_USERS.admin.email,
                username: uniqueUsername('dup'),
                password: 'Test12345!',
            });
            await submitCreateUser(page);

            await expect(page).toHaveURL('/admin/users/create');
            await expect(
                page.getByText(/Email sudah digunakan/i),
            ).toBeVisible({ timeout: 10_000 });
        });

        test('gagal jika email sudah terdaftar (mitra seed)', async ({ page }) => {
            await fillAccountFields(page, {
                name: 'Test Duplikat 2',
                email: SEED_USERS.mitra.email,
                username: uniqueUsername('dup2'),
                password: 'Test12345!',
            });
            await submitCreateUser(page);

            await expect(page).toHaveURL('/admin/users/create');
            await expect(
                page.getByText(/Email sudah digunakan/i),
            ).toBeVisible({ timeout: 10_000 });
        });

        test('gagal jika username sudah terdaftar', async ({ page }) => {
            await fillAccountFields(page, {
                name: 'Test Duplikat 3',
                email: uniqueEmail('dup3'),
                username: 'admin', // username seed
                password: 'Test12345!',
            });
            await submitCreateUser(page);

            await expect(page).toHaveURL('/admin/users/create');
            await expect(
                page.getByText(/Username sudah digunakan/i),
            ).toBeVisible({ timeout: 10_000 });
        });

        test('gagal jika password kurang dari 8 karakter', async ({ page }) => {
            await fillAccountFields(page, {
                name: 'Test',
                email: uniqueEmail('short'),
                username: uniqueUsername('short'),
                password: 'short',
            });
            await submitCreateUser(page);

            await expect(page).toHaveURL('/admin/users/create');
            await expect(page.locator('p.text-pink').first()).toBeVisible({
                timeout: 10_000,
            });
        });

        test('email error muncul di field email', async ({ page }) => {
            await fillAccountFields(page, {
                name: 'Test',
                email: SEED_USERS.admin.email,
                password: 'Test12345!',
            });
            await submitCreateUser(page);

            const errorEmail = page
                .locator('input#email')
                .locator('xpath=following-sibling::p');
            await expect(errorEmail).toBeVisible({ timeout: 10_000 });
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
            await page.goto('/admin/users/create');
        });

        test('card role di step 1 adalah button', async ({ page }) => {
            const adminCard = page
                .locator('button')
                .filter({ has: page.getByRole('heading', { name: 'Admin', exact: true }) });
            await expect(adminCard).toBeVisible();
        });

        test('semua input di step 2 (admin) punya label', async ({ page }) => {
            await selectRole(page, 'admin');

            await expect(page.locator('label[for="name"]')).toBeVisible();
            await expect(page.locator('label[for="email"]')).toBeVisible();
            await expect(page.locator('label[for="username"]')).toBeVisible();
            await expect(page.locator('label[for="password"]')).toBeVisible();
        });

        test('semua input di step 2 (mitra) punya label', async ({ page }) => {
            await selectRole(page, 'mitra');

            await expect(page.locator('label[for="nama_penyedia_usaha"]')).toBeVisible();
            await expect(page.locator('label[for="nomor_identitas"]')).toBeVisible();
            await expect(page.locator('label[for="telepon"]')).toBeVisible();
            await expect(page.locator('label[for="alamat"]')).toBeVisible();
        });

        test('tombol toggle password punya aria-label', async ({ page }) => {
            await selectRole(page, 'admin');

            await expect(
                page.getByLabel('Toggle password'),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Happy Path — Buat User Baru (HARUS DI PALING AKHIR)
    |--------------------------------------------------------------------------
    |
    | PENTING: Test di section ini MENAMBAH user baru ke DB.
    | Setelah run, DB tidak kembali ke seed — test lain yang expect
    | exact count akan gagal.
    |
    | Pakai describe.serial() + taruh di akhir file.
    | Setiap test pakai uniqueEmail/uniqueUsername supaya tidak collision
    | dengan test lain atau antar run.
    |--------------------------------------------------------------------------
    */

    test.describe.serial('Happy Path', () => {
        test('admin bisa buat user admin baru', async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/users/create');
            await selectRole(page, 'admin');

            const email = uniqueEmail('newadmin');
            const username = uniqueUsername('newadmin');

            await fillAccountFields(page, {
                name: NEW_ADMIN.name,
                email,
                username,
                password: NEW_ADMIN.password,
            });

            await submitCreateUser(page);

            // Redirect ke /admin/users
            await expect(page).toHaveURL('/admin/users', { timeout: 15_000 });

            // User baru muncul di tabel
            const tableBody = page.locator('tbody');
            await expect(
                tableBody.getByText(NEW_ADMIN.name, { exact: true }),
            ).toBeVisible();
            await expect(tableBody.getByText(email)).toBeVisible();
        });

        test('admin bisa buat user mitra baru dengan data usaha lengkap', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await page.goto('/admin/users/create');
            await selectRole(page, 'mitra');

            const email = uniqueEmail('newmitra');
            const username = uniqueUsername('newmitra');

            // Isi data akun
            await fillAccountFields(page, {
                name: NEW_MITRA.name,
                email,
                username,
                password: NEW_MITRA.password,
            });

            // Isi data usaha
            await page.fill('input#nama_penyedia_usaha', NEW_MITRA.namaPenyediaUsaha);
            await page.fill('input#nomor_identitas', NEW_MITRA.nomorIdentitas);
            await page.fill('input#telepon', NEW_MITRA.telepon);
            await page.fill('textarea#alamat', NEW_MITRA.alamat);
            await page.fill('input#provinsi', NEW_MITRA.provinsi);
            await page.fill('input#kota', NEW_MITRA.kota);
            await page.fill('input#kode_pos', NEW_MITRA.kodePos);
            await page.fill('textarea#deskripsi', NEW_MITRA.deskripsi);

            await submitCreateUser(page);

            // Redirect ke /admin/users
            await expect(page).toHaveURL('/admin/users', { timeout: 15_000 });

            // User baru muncul di tabel dengan nama usaha
            const tableBody = page.locator('tbody');
            await expect(
                tableBody.getByText(NEW_MITRA.name, { exact: true }),
            ).toBeVisible();
            await expect(
                tableBody.getByText(NEW_MITRA.namaPenyediaUsaha),
            ).toBeVisible();
        });

        test('admin bisa buat mitra baru tanpa isi data usaha (opsional)', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await page.goto('/admin/users/create');
            await selectRole(page, 'mitra');

            const email = uniqueEmail('minimal');
            const username = uniqueUsername('minimal');

            // Hanya isi data akun, data usaha kosong
            await fillAccountFields(page, {
                name: 'Mitra Minimal E2E',
                email,
                username,
                password: 'Minimal123!',
            });

            await submitCreateUser(page);

            await expect(page).toHaveURL('/admin/users', { timeout: 15_000 });

            const tableBody = page.locator('tbody');
            await expect(
                tableBody.getByText('Mitra Minimal E2E', { exact: true }),
            ).toBeVisible();
        });

        test('admin bisa buat user tanpa isi password (auto-generate)', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await page.goto('/admin/users/create');
            await selectRole(page, 'admin');

            const email = uniqueEmail('autopass');
            const username = uniqueUsername('autopass');

            // Tidak isi password
            await fillAccountFields(page, {
                name: 'Admin Auto Pass E2E',
                email,
                username,
            });

            await submitCreateUser(page);

            // Redirect ke /admin/users + user muncul
            await expect(page).toHaveURL('/admin/users', { timeout: 15_000 });

            const tableBody = page.locator('tbody');
            await expect(
                tableBody.getByText('Admin Auto Pass E2E', { exact: true }),
            ).toBeVisible();
        });
    });
});