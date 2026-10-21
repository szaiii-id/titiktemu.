import { test, expect, SEED_USERS, uniqueEmail, uniqueUsername, resetUser } from '../fixtures/auth';

/**
 * Admin — Manajemen User (Index)
 *
 * Route: GET /admin/users  → Admin\UserController@index
 *
 * Behavior:
 * - List user dengan role=admin DAN role=mitra (BUKAN client)
 * - Search: nama, email, username (debounced 300ms)
 * - Tab filter: Semua / Admin / Mitra (client-side filter di Svelte)
 * - Pagination: default per_page=15
 * - Actions per row: Edit, Reset Password, Hapus (kecuali diri sendiri)
 *
 * Seed user (dari UserSeeder):
 * - admin@titiktemu.test / admin / "Administrator Utama" (role=admin)
 * - budi@ptabc.com / ptabc / "Budi Santoso" (role=mitra, profile="PT ABC Travel")
 * - ani@gmail.com / aniwijaya / "Ani Wijaya" (role=mitra, profile=null)
 * - client@titiktemu.test / budiclient / "Budi Client" (role=client — TIDAK muncul)
 *
 * CATATAN PENTING:
 * - Admin yang login = admin@titiktemu.test = "Administrator Utama".
 *   Jadi nama/email admin muncul 2x di halaman:
 *   1. Sidebar "Masuk sebagai" (complementary)
 *   2. Tabel Manajemen User
 *   → Semua pencarian nama/email admin HARUS di-scope ke `tbody`.
 * - Tab filter (Semua/Admin/Mitra) adalah CLIENT-SIDE filter di Svelte.
 *   Jadi tidak mengubah URL, tidak trigger request.
 * - Assertion count dibuat RELATIF (bukan hardcoded), karena file test
 *   lain (`users-create`, `users-edit`) bisa menambah/menghapus user
 *   sebelum file ini jalan dalam run yang sama.
 * - Assertion yang spesifik menyebut `Ani Wijaya` (SEED_MITRA_2) juga
 *   dibuat relatif, karena user ini bisa DIHAPUS oleh file test lain
 *   (`users-edit.spec.ts` — happy path delete).
 *
 * ⚠️ FIX #1: performSearch — 4 lapis tunggu (anti race hydration)
 * ⚠️ FIX #2: resetUser di beforeEach — anti state leak dari users-edit
 *           (users-edit happy path mengubah nama admin "Administrator Utama"
 *           → "Admin Utama E2E", yang bisa mempengaruhi test seed di sini).
 */

// ==========================================
// KONSTANTA — sinkron dengan UserSeeder.php
// ==========================================
const SEED_ADMIN = {
    name: 'Administrator Utama',
    username: 'admin',
    email: 'admin@titiktemu.test',
    role: 'admin',
};

const SEED_MITRA_1 = {
    name: 'Budi Santoso',
    username: 'ptabc',
    email: 'budi@ptabc.com',
    role: 'mitra',
    namaPenyediaUsaha: 'PT ABC Travel',
};

// ==========================================
// HELPER
// ==========================================

/**
 * ✅ FIX #1: performSearch — anti race hydration.
 *
 * Kenapa: `page.fill()` bisa jalan SEBELUM Svelte hydration selesai.
 * Akibatnya nilai terisi di DOM, tapi handler `input`/`keydown` belum
 * terpasang → URL di-update dengan query kosong (`Received: ""`).
 *
 * Solusi:
 * 1. Tunggu networkidle (hydration selesai)
 * 2. Tunggu input visible & enabled
 * 3. Isi input + VERIFIKASI nilai benar-benar masuk
 * 4. Baru polling URL
 */
async function performSearch(page: any, query: string): Promise<void> {
    // ✅ 1. Tunggu halaman stabil (hydration selesai)
    await page.waitForLoadState('networkidle', { timeout: 15_000 });

    const input = page.locator('input[placeholder*="Cari"]');

    // ✅ 2. Tunggu input visible & enabled
    await input.waitFor({ state: 'visible', timeout: 10_000 });
    await expect(input).toBeEnabled({ timeout: 5_000 });

    // ✅ 3. Isi input, lalu VERIFIKASI nilai benar-benar masuk
    await input.fill(query);
    await expect(input).toHaveValue(query, { timeout: 5_000 });

    // ✅ 4. Tunggu handler search men-trigger perubahan URL
    await expect
        .poll(
            () => new URL(page.url()).searchParams.get('search') ?? '',
            { timeout: 15_000, intervals: [100, 200, 500] },
        )
        .toBe(query);
}

/**
 * ✅ FIX #2: resetState — reset admin user + login sebagai admin.
 *
 * Kenapa: `users-edit.spec.ts` (happy path) mengubah:
 * - Nama admin: "Administrator Utama" → "Admin Utama E2E"
 * - Email mitra 2: "ani@gmail.com" → uniqueEmail
 * - Hapus mitra 2: Ani Wijaya
 *
 * Test di file ini yang assert `SEED_ADMIN.name` akan gagal jika
 * `users-edit` jalan duluan. Reset di sini mengembalikan:
 * - Nama admin → "Administrator Utama"
 * - Email admin → "admin@titiktemu.test"
 * - Username admin → "admin"
 *
 * Yang TIDAK bisa di-reset: user mitra 2 yang sudah DIHAPUS. Test
 * yang assert "Ani Wijaya" sudah dibuat relatif (minimal 1 mitra).
 */
async function resetAdminAndLogin(page: any): Promise<void> {
    // ✅ Reset nama admin ke seed (jika diubah oleh users-edit)
    await resetUser(page, SEED_USERS.admin.email, {
        name: SEED_ADMIN.name,
        username: SEED_ADMIN.username,
        password: SEED_USERS.admin.password,
    });

    // ✅ Login sebagai admin
    const { loginViaUI } = await import('../fixtures/auth');
    await loginViaUI(page, 'admin');
}

// ==========================================
// TEST SUITE
// ==========================================
test.describe('Admin — Manajemen User', () => {
    /*
    |--------------------------------------------------------------------------
    | Access Control
    |--------------------------------------------------------------------------
    */

    test('guest tidak bisa akses halaman manajemen user', async ({ page, asGuest }) => {
        await asGuest();
        await page.goto('/admin/users');
        await expect(page).toHaveURL('/login');
    });

    test('client tidak bisa akses halaman manajemen user', async ({ page, asClient }) => {
        await asClient();
        await page.goto('/admin/users');
        await expect(page).toHaveURL('/client/dashboard');
    });

    test('mitra tidak bisa akses halaman manajemen user', async ({ page, asMitra }) => {
        await asMitra();
        await page.goto('/admin/users');
        await expect(page).toHaveURL('/mitra/dashboard');
    });

    test('admin bisa akses halaman manajemen user', async ({ page, asAdmin }) => {
        await asAdmin();
        await page.goto('/admin/users');
        await expect(page).toHaveURL('/admin/users');
    });

    /*
    |--------------------------------------------------------------------------
    | Contract — Elemen Halaman
    |--------------------------------------------------------------------------
    */

    test.describe('Elemen Halaman', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/users');
        });

        test('menampilkan heading "Manajemen User"', async ({ page }) => {
            await expect(
                page.getByRole('heading', { name: /^Manajemen User$/i }).first(),
            ).toBeVisible();
        });

        test('menampilkan deskripsi halaman', async ({ page }) => {
            await expect(
                page.getByText(/Kelola akun admin dan mitra/i),
            ).toBeVisible();
        });

        test('menampilkan tombol "Tambah User"', async ({ page }) => {
            await expect(
                page.getByRole('link', { name: /Tambah User/i }),
            ).toBeVisible();
        });

        test('tombol "Tambah User" mengarah ke /admin/users/create', async ({ page }) => {
            await expect(
                page.getByRole('link', { name: /Tambah User/i }),
            ).toHaveAttribute('href', /\/admin\/users\/create$/);
        });

        test('menampilkan input search', async ({ page }) => {
            const searchInput = page.locator('input[placeholder*="Cari"]');
            await expect(searchInput).toBeVisible();
            await expect(searchInput).toHaveAttribute(
                'placeholder',
                /Cari nama, email, atau username/i,
            );
        });

        test('menampilkan 3 tab filter: Semua, Admin, Mitra', async ({ page }) => {
            await expect(
                page.getByRole('tab', { name: /^Semua/i }),
            ).toBeVisible();
            await expect(
                page.getByRole('tab', { name: /^Admin/i }),
            ).toBeVisible();
            await expect(
                page.getByRole('tab', { name: /^Mitra/i }),
            ).toBeVisible();
        });

        test('menampilkan tabel dengan header yang benar', async ({ page }) => {
            await expect(
                page.getByRole('columnheader', { name: /^User$/i }),
            ).toBeVisible();
            await expect(
                page.getByRole('columnheader', { name: /^Role$/i }),
            ).toBeVisible();
            await expect(
                page.getByRole('columnheader', { name: /^Aksi$/i }),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Data Initialization — ✅ FIX #2: pakai resetAdminAndLogin
    |--------------------------------------------------------------------------
    |
    | Kenapa perlu reset?
    | `users-edit.spec.ts` (happy path) mengubah nama admin
    | "Administrator Utama" → "Admin Utama E2E". Test di sini yang
    | assert `SEED_ADMIN.name` akan gagal jika file lain jalan duluan.
    */

    test.describe('Data Initialization', () => {
        test.beforeEach(async ({ page }) => {
            // ✅ FIX #2: reset admin ke seed + login
            await resetAdminAndLogin(page);
            await page.goto('/admin/users');
        });

        test('menampilkan seed admin', async ({ page }) => {
            const tableBody = page.locator('tbody');

            await expect(
                tableBody.getByText(SEED_ADMIN.name, { exact: true }),
            ).toBeVisible();
            await expect(
                tableBody.getByText(SEED_ADMIN.email),
            ).toBeVisible();
        });

        test('menampilkan seed mitra (Budi Santoso)', async ({ page }) => {
            const tableBody = page.locator('tbody');

            await expect(
                tableBody.getByText(SEED_MITRA_1.name, { exact: true }),
            ).toBeVisible();
            await expect(
                tableBody.getByText(SEED_MITRA_1.email),
            ).toBeVisible();
        });

        test('menampilkan minimal 1 mitra di tabel', async ({ page }) => {
            const tableBody = page.locator('tbody');
            const mitraBadges = tableBody.getByText(/^\s*Mitra\s*$/);
            expect(await mitraBadges.count()).toBeGreaterThanOrEqual(1);
        });

        test('menampilkan nama usaha mitra di kolom Usaha', async ({ page }) => {
            const tableBody = page.locator('tbody');

            await expect(
                tableBody.getByText(SEED_MITRA_1.namaPenyediaUsaha),
            ).toBeVisible();
        });

        test('menampilkan badge role "Admin" dan "Mitra"', async ({ page }) => {
            const tableBody = page.locator('tbody');

            await expect(
                tableBody.getByText(/^\s*Admin\s*$/).first(),
            ).toBeVisible();
            await expect(
                tableBody.getByText(/^\s*Mitra\s*$/).first(),
            ).toBeVisible();
        });

        test('TIDAK menampilkan user role=client', async ({ page }) => {
            const tableBody = page.locator('tbody');
            await expect(
                tableBody.getByText(SEED_USERS.client.email),
            ).not.toBeVisible();
        });

        test('menampilkan minimal 2 row (admin + minimal 1 mitra)', async ({ page }) => {
            const rows = page.locator('tbody tr');
            const count = await rows.count();
            expect(count).toBeGreaterThanOrEqual(2);
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Tab Filter (Client-Side)
    |--------------------------------------------------------------------------
    */

    test.describe('Tab Filter', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/users');
        });

        test('tab "Semua" aktif secara default', async ({ page }) => {
            const semuaTab = page.getByRole('tab', { name: /^Semua/i });
            await expect(semuaTab).toHaveClass(/bg-white/);
        });

        test('klik tab "Admin" menampilkan hanya admin', async ({ page }) => {
            await page.getByRole('tab', { name: /^Admin/i }).click();

            const tableBody = page.locator('tbody');

            await expect(
                tableBody.getByText(SEED_ADMIN.name, { exact: true }),
            ).toBeVisible();

            await expect(
                tableBody.getByText(SEED_MITRA_1.name, { exact: true }),
            ).not.toBeVisible();
        });

        test('klik tab "Mitra" menampilkan hanya mitra', async ({ page }) => {
            await page.getByRole('tab', { name: /^Mitra/i }).click();

            const tableBody = page.locator('tbody');

            const mitraBadges = tableBody.getByText(/^\s*Mitra\s*$/);
            expect(await mitraBadges.count()).toBeGreaterThanOrEqual(1);

            await expect(
                tableBody.getByText(SEED_ADMIN.name, { exact: true }),
            ).not.toBeVisible();
        });

        test('klik tab "Semua" menampilkan semua user', async ({ page }) => {
            await page.getByRole('tab', { name: /^Admin/i }).click();

            const tableBody = page.locator('tbody');
            await expect(
                tableBody.getByText(SEED_MITRA_1.name, { exact: true }),
            ).not.toBeVisible();

            await page.getByRole('tab', { name: /^Semua/i }).click();
            await expect(
                tableBody.getByText(SEED_ADMIN.name, { exact: true }),
            ).toBeVisible();
            await expect(
                tableBody.getByText(SEED_MITRA_1.name, { exact: true }),
            ).toBeVisible();
        });

        test('tab menampilkan jumlah count yang benar', async ({ page }) => {
            const semuaTab = page.getByRole('tab', { name: /^Semua/i });
            const semuaText = await semuaTab.textContent();
            const tabCount = Number(semuaText?.match(/\d+/)?.[0] ?? 0);

            const rowCount = await page.locator('tbody tr').count();
            expect(tabCount).toBe(rowCount);
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Search Behavior
    |--------------------------------------------------------------------------
    */

    test.describe('Search', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/users');
        });

        test('search by admin name menampilkan hasil yang sesuai', async ({ page }) => {
            await performSearch(page, 'Administrator');

            await expect(page).toHaveURL(/search=Administrator/i);

            const tableBody = page.locator('tbody');
            await expect(
                tableBody.getByText(SEED_ADMIN.name, { exact: true }),
            ).toBeVisible();
            await expect(
                tableBody.getByText(SEED_MITRA_1.name, { exact: true }),
            ).not.toBeVisible();
        });

        test('search by mitra name menampilkan hasil yang sesuai', async ({ page }) => {
            await performSearch(page, 'Budi Santoso');

            const tableBody = page.locator('tbody');
            await expect(
                tableBody.getByText(SEED_MITRA_1.name, { exact: true }),
            ).toBeVisible();
        });

        test('search by email menampilkan hasil yang sesuai', async ({ page }) => {
            await performSearch(page, 'budi@ptabc.com');

            const tableBody = page.locator('tbody');
            await expect(
                tableBody.getByText(SEED_MITRA_1.name, { exact: true }),
            ).toBeVisible();
        });

        test('search by username menampilkan hasil yang sesuai', async ({ page }) => {
            await performSearch(page, 'ptabc');

            const tableBody = page.locator('tbody');
            await expect(
                tableBody.getByText(SEED_MITRA_1.name, { exact: true }),
            ).toBeVisible();
        });

        test('search case-insensitive', async ({ page }) => {
            await performSearch(page, 'BUDI');

            const tableBody = page.locator('tbody');
            await expect(
                tableBody.getByText(SEED_MITRA_1.name, { exact: true }),
            ).toBeVisible();
        });

        test('search tanpa hasil menampilkan empty state', async ({ page }) => {
            await performSearch(page, 'tidak-ada-user-xyz-123');

            await expect(
                page.getByText(/Tidak ada hasil ditemukan/i),
            ).toBeVisible();
            await expect(
                page.getByText(/Tidak ditemukan user dengan kata kunci/i),
            ).toBeVisible();
        });

        test('tombol clear search muncul saat ada keyword', async ({ page }) => {
            await performSearch(page, 'Budi');

            await expect(
                page.getByLabel('Hapus pencarian'),
            ).toBeVisible();
        });

        test('klik clear search mengosongkan input', async ({ page }) => {
            await performSearch(page, 'Budi');
            await expect(
                page.locator('input[placeholder*="Cari"]'),
            ).toHaveValue('Budi');

            await page.getByLabel('Hapus pencarian').click();

            await expect(
                page.locator('input[placeholder*="Cari"]'),
            ).toHaveValue('');

            const tableBody = page.locator('tbody');
            await expect(
                tableBody.getByText(SEED_ADMIN.name, { exact: true }),
            ).toBeVisible();
        });

        test('search tersimpan di URL', async ({ page }) => {
            await performSearch(page, 'Budi');

            await expect(page).toHaveURL(/search=Budi/i);

            await page.reload();
            await expect(
                page.locator('input[placeholder*="Cari"]'),
            ).toHaveValue('Budi');
        });

        test('search + tab filter bisa dikombinasikan', async ({ page }) => {
            await performSearch(page, 'Budi');

            await page.getByRole('tab', { name: /^Admin/i }).click();

            const tableBody = page.locator('tbody');
            await expect(
                tableBody.getByText(SEED_MITRA_1.name, { exact: true }),
            ).not.toBeVisible();
        });

        test('empty state punya tombol "Hapus Pencarian"', async ({ page }) => {
            await performSearch(page, 'tidak-ada-user-xyz-123');

            await expect(
                page.getByRole('button', { name: 'Hapus Pencarian', exact: true }),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Action Buttons (per row)
    |--------------------------------------------------------------------------
    */

    test.describe('Action Buttons', () => {
        test.beforeEach(async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/users');
        });

        test('setiap row punya tombol Edit', async ({ page }) => {
            const rowCount = await page.locator('tbody tr').count();
            const editButtons = page.getByLabel('Edit user');
            await expect(editButtons).toHaveCount(rowCount);
        });

        test('tombol Edit admin mengarah ke /admin/users/{id}/edit', async ({
            page,
        }) => {
            const adminRow = page
                .locator('tbody tr')
                .filter({ hasText: SEED_ADMIN.email });

            const editLink = adminRow.getByLabel('Edit user');
            await expect(editLink).toHaveAttribute(
                'href',
                /\/admin\/users\/\d+\/edit$/,
            );
        });

        test('setiap row punya tombol Reset Password', async ({ page }) => {
            const rowCount = await page.locator('tbody tr').count();
            const resetButtons = page.getByLabel('Reset password');
            await expect(resetButtons).toHaveCount(rowCount);
        });

        test('tombol Reset Password membuka modal konfirmasi', async ({ page }) => {
            const adminRow = page
                .locator('tbody tr')
                .filter({ hasText: SEED_ADMIN.email });

            await adminRow.getByLabel('Reset password').click();

            await expect(
                page.getByRole('heading', { name: /Reset Password\?/i }),
            ).toBeVisible();
            await expect(
                page.getByRole('button', { name: /Ya, Reset Password/i }),
            ).toBeVisible();
        });

        test('tombol Hapus muncul untuk user LAIN (bukan diri sendiri)', async ({
            page,
        }) => {
            const mitraRow = page
                .locator('tbody tr')
                .filter({ hasText: SEED_MITRA_1.email });

            await expect(
                mitraRow.getByLabel('Hapus user'),
            ).toBeVisible();
        });

        test('tombol Hapus TIDAK muncul di row diri sendiri', async ({ page }) => {
            const adminRow = page
                .locator('tbody tr')
                .filter({ hasText: SEED_ADMIN.email });

            await expect(
                adminRow.getByLabel('Hapus user'),
            ).not.toBeVisible();
        });

        test('tombol Hapus membuka modal konfirmasi', async ({ page }) => {
            const mitraRow = page
                .locator('tbody tr')
                .filter({ hasText: SEED_MITRA_1.email });

            await mitraRow.getByLabel('Hapus user').click();

            await expect(
                page.getByRole('heading', { name: /Hapus User\?/i }),
            ).toBeVisible();
            await expect(
                page.getByRole('button', { name: /Ya, Hapus/i }),
            ).toBeVisible();
        });

        test('modal Hapus bisa dibatalkan', async ({ page }) => {
            const mitraRow = page
                .locator('tbody tr')
                .filter({ hasText: SEED_MITRA_1.email });

            await mitraRow.getByLabel('Hapus user').click();
            await expect(
                page.getByRole('heading', { name: /Hapus User\?/i }),
            ).toBeVisible();

            await page
                .getByRole('button', { name: /^Batal$/i })
                .click();

            await expect(
                page.getByRole('heading', { name: /Hapus User\?/i }),
            ).not.toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Pagination
    |--------------------------------------------------------------------------
    |
    | CATATAN: Seed cuma punya 3 user (1 admin + 2 mitra).
    | Untuk test pagination, kita butuh >15 user dengan role admin/mitra.
    |
    | MASALAH: endpoint /register hanya bisa buat role=client. Client
    | TIDAK muncul di /admin/users. Jadi kita tidak bisa seeding
    | admin/mitra via endpoint publik.
    |
    | SOLUSI (dipilih): Skip test pagination UI. Pagination sudah
    | di-cover di e2e/admin/clients.spec.ts. Kalau mau test pagination
    | di sini, butuh endpoint test khusus /_test/register-user.
    |--------------------------------------------------------------------------
    */

    test.describe('Pagination', () => {
        test('tidak menampilkan pagination jika user <= per_page', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await page.goto('/admin/users');

            await expect(
                page.getByText(/Menampilkan \d+–\d+ dari \d+ user/i),
            ).not.toBeVisible();
        });

        test.skip('menampilkan pagination jika user > per_page', async ({
            page,
            asAdmin,
        }) => {
            // SKIP: butuh seeding >15 admin/mitra, endpoint publik
            // hanya bisa buat client (yang tidak muncul di sini).
        });

        test('total user di tab "Semua" sesuai dengan data', async ({ page, asAdmin }) => {
            await asAdmin();
            await page.goto('/admin/users');

            const allTab = page.getByRole('tab', { name: /^Semua/i });
            const tabText = await allTab.textContent();
            const count = Number(tabText?.match(/\d+/)?.[0] ?? 0);

            const rows = await page.locator('tbody tr').count();

            expect(count).toBe(rows);
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
        });

        test('tabel menggunakan semantic HTML', async ({ page }) => {
            await expect(page.locator('table')).toBeVisible();
            await expect(page.locator('thead')).toBeVisible();
            await expect(page.locator('tbody')).toBeVisible();
        });

        test('input search punya placeholder yang deskriptif', async ({ page }) => {
            await expect(
                page.locator('input[placeholder*="Cari"]'),
            ).toHaveAttribute('placeholder', /Cari nama, email, atau username/i);
        });

        test('tombol icon punya aria-label', async ({ page }) => {
            await expect(page.getByLabel('Edit user').first()).toBeVisible();
            await expect(page.getByLabel('Reset password').first()).toBeVisible();
            await expect(page.getByLabel('Hapus user').first()).toBeVisible();
        });

        test('tombol clear search punya aria-label', async ({ page }) => {
            await performSearch(page, 'Budi');

            await expect(
                page.getByLabel('Hapus pencarian'),
            ).toBeVisible();
        });

        test('modal konfirmasi hapus punya role button untuk backdrop', async ({
            page,
        }) => {
            const mitraRow = page
                .locator('tbody tr')
                .filter({ hasText: SEED_MITRA_1.email });

            await mitraRow.getByLabel('Hapus user').click();

            await expect(
                page.getByLabel('Tutup modal'),
            ).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Role-Based Data Filter
    |--------------------------------------------------------------------------
    */

    test.describe('Role Filter', () => {
        test('hanya menampilkan user dengan role=admin atau mitra', async ({
            page,
            asAdmin,
        }) => {
            await asAdmin();
            await page.goto('/admin/users');

            const emails = await page
                .locator('tbody tr td p.text-xs')
                .allTextContents();

            for (const email of emails) {
                expect(email.trim()).not.toBe(SEED_USERS.client.email);
            }
        });
    });
});