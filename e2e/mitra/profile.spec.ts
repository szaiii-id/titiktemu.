import { test, expect, SEED_USERS } from '../fixtures/auth';

/**
 * Mitra — Profile Usaha
 *
 * Route:
 * - GET /mitra/profile  → Mitra\ProfileController@edit
 * - PUT /mitra/profile  → Mitra\ProfileController@update (via POST + _method=PUT)
 *
 * Behavior:
 * - Field: nama_penyedia_usaha, nomor_identitas, alamat, telepon,
 *          provinsi, kota, kode_pos, deskripsi, logo (upload)
 * - Submit: FormData + _method=PUT (karena ada file upload)
 * - Sukses: redirect ke /mitra/profile + flash "Profile berhasil diperbarui."
 *
 * Seed user mitra: `budi@ptabc.com` / `ptabc` / "Budi Santoso"
 * Profile seed: nama_penyedia_usaha="PT ABC Travel", kota="Banjarmasin",
 *               provinsi="Kalimantan Selatan", kode_pos="70111"
 *
 * CATATAN PENTING:
 * Test "Form Submit — Happy Path" mengubah data profile mitra di DB.
 * Semua test yang butuh data seed HARUS JALAN SEBELUM section itu.
 * Kita pakai test.describe.serial() di akhir file untuk Happy Path.
 *
 * data-testid yang dipakai (sudah ditambahkan di Mitra/Profile.svelte):
 * - logo-preview-wrapper
 * - logo-preview
 * - logo-remove-button
 * - logo-placeholder
 * - logo-input
 * - logo-upload-button
 * - display-nama-usaha
 *
 * ⚠️ FIX #1: upload logo — waitFor({ state: 'attached' }) sebelum setInputFiles
 *           + naikkan timeout logo-preview dari 5s ke 15s
 *           (ImageUploader $effect async — butuh waktu createImagePreview)
 * ⚠️ FIX #2: upload file > 2MB — waitFor + timeout 15s
 */

// ==========================================
// KONSTANTA — sinkron dengan UserSeeder.php
// ==========================================
const SEED_MITRA = {
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
    deskripsi:
        'Travel agent terpercaya sejak 2010. Melayani paket wisata domestik & internasional.',
};

// ==========================================
// HELPER
// ==========================================

/**
 * Submit form profile mitra dan tunggu response.
 *
 * PENTING: method HTTP aktual = POST (bukan PUT), karena Svelte kirim
 * FormData dengan `_method: 'PUT'` (method spoofing untuk file upload).
 */
async function submitProfileUpdate(page: any): Promise<void> {
    await Promise.all([
        page.waitForResponse(
            (resp: any) =>
                resp.url().includes('/mitra/profile') &&
                resp.request().method() === 'POST',
            { timeout: 15_000 },
        ),
        page.getByRole('button', { name: /^Simpan Perubahan$/i }).click(),
    ]);
}

/**
 * Buat file gambar kecil (PNG 1x1 px) untuk test upload.
 * Tidak butuh file fisik di repo — pakai Buffer inline.
 */
function createTinyPng(): { name: string; mimeType: string; buffer: Buffer } {
    // PNG 1x1 pixel transparan
    const base64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    return {
        name: 'logo-test.png',
        mimeType: 'image/png',
        buffer: Buffer.from(base64, 'base64'),
    };
}

/**
 * ✅ FIX #1: Upload logo — waitFor input attached + naikkan timeout preview.
 *
 * Kenapa perlu:
 * - `ImageUploader.svelte` pakai `$effect` async → `createImagePreview()`
 *   butuh waktu (FileReader + createObjectURL) → `previews[i]` terisi
 *   setelah Promise selesai → `{#if previews[i]}` baru render `logo-preview`
 * - Test menunggu hanya 5 detik → timeout jika Promise selesai >5 detik
 *   (server lambat, 8 shard paralel, FileReader lambat)
 *
 * Solusi:
 * - `waitFor({ state: 'attached' })` — pastikan `logo-input` ada di DOM
 *   sebelum `setInputFiles` (anti hydration race)
 * - Naikkan timeout `logo-preview` dari 5s → 15s
 */
async function uploadLogoAndWaitPreview(
    page: any,
    file: { name: string; mimeType: string; buffer: Buffer },
): Promise<void> {
    const logoInput = page.getByTestId('logo-input');

    // ✅ FIX: tunggu file input benar-benar attached
    await logoInput.waitFor({ state: 'attached', timeout: 10_000 });

    await logoInput.setInputFiles({
        name: file.name,
        mimeType: file.mimeType,
        buffer: file.buffer,
    });

    // ✅ FIX: naikkan timeout dari 5s ke 15s
    // ($effect async — butuh waktu createImagePreview)
    await expect(page.getByTestId('logo-preview')).toBeVisible({
        timeout: 15_000,
    });

    await expect(page.getByTestId('logo-remove-button')).toBeVisible({
        timeout: 15_000,
    });
}

// ==========================================
// TEST SUITE
// ==========================================
test.describe('Mitra — Profile Usaha', () => {
    /*
    |--------------------------------------------------------------------------
    | Access Control
    |--------------------------------------------------------------------------
    */

    test('guest tidak bisa akses halaman profile mitra', async ({ page, asGuest }) => {
        await asGuest();
        await page.goto('/mitra/profile');
        await expect(page).toHaveURL('/login');
    });

    test('admin tidak bisa akses halaman profile mitra', async ({ page, asAdmin }) => {
        await asAdmin();
        await page.goto('/mitra/profile');
        await expect(page).toHaveURL('/admin/dashboard');
    });

    test('client tidak bisa akses halaman profile mitra', async ({ page, asClient }) => {
        await asClient();
        await page.goto('/mitra/profile');
        await expect(page).toHaveURL('/client/dashboard');
    });

    test('mitra bisa akses halaman profile usaha', async ({ page, asMitra }) => {
        await asMitra();
        await page.goto('/mitra/profile');
        await expect(page).toHaveURL('/mitra/profile');
    });

    /*
    |--------------------------------------------------------------------------
    | Contract — Elemen Form
    |--------------------------------------------------------------------------
    */

    test.describe('Elemen Form', () => {
        test.beforeEach(async ({ page, asMitra }) => {
            await asMitra();
            await page.goto('/mitra/profile');
        });

        test('menampilkan heading "Profile Usaha"', async ({ page }) => {
            await expect(page.locator('h1.text-2xl')).toHaveText(/Profile Usaha/);
        });

        test('menampilkan field nama_penyedia_usaha', async ({ page }) => {
            await expect(page.locator('input#nama_penyedia_usaha')).toBeVisible();
        });

        test('menampilkan field nomor_identitas', async ({ page }) => {
            await expect(page.locator('input#nomor_identitas')).toBeVisible();
        });

        test('menampilkan field alamat (textarea)', async ({ page }) => {
            await expect(page.locator('textarea#alamat')).toBeVisible();
        });

        test('menampilkan field telepon', async ({ page }) => {
            await expect(page.locator('input#telepon')).toBeVisible();
        });

        test('menampilkan field provinsi', async ({ page }) => {
            await expect(page.locator('input#provinsi')).toBeVisible();
        });

        test('menampilkan field kota', async ({ page }) => {
            await expect(page.locator('input#kota')).toBeVisible();
        });

        test('menampilkan field kode_pos', async ({ page }) => {
            await expect(page.locator('input#kode_pos')).toBeVisible();
        });

        test('menampilkan field deskripsi (textarea)', async ({ page }) => {
            await expect(page.locator('textarea#deskripsi')).toBeVisible();
        });

        test('menampilkan tombol "Simpan Perubahan"', async ({ page }) => {
            await expect(
                page.getByRole('button', { name: /^Simpan Perubahan$/i }),
            ).toBeVisible();
        });

        test('menampilkan link "Batal"', async ({ page }) => {
            await expect(
                page.getByRole('link', { name: /^Batal$/i }),
            ).toBeVisible();
        });

        test('menampilkan badge "MITRA"', async ({ page }) => {
            await expect(page.locator('text=MITRA').first()).toBeVisible();
        });

        test('menampilkan tombol upload logo', async ({ page }) => {
            const uploadButton = page.getByTestId('logo-upload-button');
            await expect(uploadButton).toBeVisible();
            await expect(uploadButton).toContainText(/Upload|Ganti/i);
        });

        test('menampilkan file input untuk logo', async ({ page }) => {
            const fileInput = page.getByTestId('logo-input');
            await expect(fileInput).toHaveAttribute('type', 'file');
            await expect(fileInput).toHaveAttribute(
                'accept',
                /image\/jpeg,image\/png,image\/svg\+xml,image\/webp/,
            );
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Data Initialization — field terisi dari seed
    |--------------------------------------------------------------------------
    */

    test.describe('Data Initialization', () => {
        test.beforeEach(async ({ page, asMitra }) => {
            await asMitra();
            await page.goto('/mitra/profile');
        });

        test('field nama_penyedia_usaha terisi dari profile', async ({ page }) => {
            await expect(page.locator('input#nama_penyedia_usaha')).toHaveValue(
                SEED_MITRA.namaPenyediaUsaha,
            );
        });

        test('field nomor_identitas terisi dari profile', async ({ page }) => {
            await expect(page.locator('input#nomor_identitas')).toHaveValue(
                SEED_MITRA.nomorIdentitas,
            );
        });

        test('field alamat terisi dari profile', async ({ page }) => {
            await expect(page.locator('textarea#alamat')).toHaveValue(
                SEED_MITRA.alamat,
            );
        });

        test('field telepon terisi dari profile', async ({ page }) => {
            await expect(page.locator('input#telepon')).toHaveValue(
                SEED_MITRA.telepon,
            );
        });

        test('field provinsi terisi dari profile', async ({ page }) => {
            await expect(page.locator('input#provinsi')).toHaveValue(
                SEED_MITRA.provinsi,
            );
        });

        test('field kota terisi dari profile', async ({ page }) => {
            await expect(page.locator('input#kota')).toHaveValue(
                SEED_MITRA.kota,
            );
        });

        test('field kode_pos terisi dari profile', async ({ page }) => {
            await expect(page.locator('input#kode_pos')).toHaveValue(
                SEED_MITRA.kodePos,
            );
        });

        test('field deskripsi terisi dari profile', async ({ page }) => {
            await expect(page.locator('textarea#deskripsi')).toHaveValue(
                SEED_MITRA.deskripsi,
            );
        });

        test('card header menampilkan nama usaha dari profile', async ({ page }) => {
            await expect(page.getByTestId('display-nama-usaha')).toHaveText(
                SEED_MITRA.namaPenyediaUsaha,
            );
        });

        test('card header menampilkan email user', async ({ page }) => {
            await expect(page.getByText(SEED_MITRA.email).first()).toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Logo Preview Behavior
    | ✅ FIX #1: upload logo — waitFor + timeout 15s
    |--------------------------------------------------------------------------
    */

    test.describe('Logo Preview', () => {
        test.beforeEach(async ({ page, asMitra }) => {
            await asMitra();
            await page.goto('/mitra/profile');
        });

        test('menampilkan placeholder kalau belum ada logo', async ({ page }) => {
            // Seed tidak punya logo → placeholder harus muncul
            await expect(page.getByTestId('logo-placeholder')).toBeVisible();
        });

        test('upload logo menampilkan preview dan tombol hapus', async ({ page }) => {
            // ✅ FIX #1: pakai helper uploadLogoAndWaitPreview
            // (waitFor input attached + timeout 15s untuk preview)
            await uploadLogoAndWaitPreview(page, createTinyPng());
        });

        test('klik hapus logo menghilangkan preview', async ({ page }) => {
            // ✅ FIX #1: pakai helper
            await uploadLogoAndWaitPreview(page, createTinyPng());

            // Klik hapus
            await page.getByTestId('logo-remove-button').click();

            // Preview hilang
            await expect(page.getByTestId('logo-preview')).not.toBeVisible();
            await expect(page.getByTestId('logo-placeholder')).toBeVisible();
        });

        test('upload file > 2MB ditolak dengan pesan error', async ({ page }) => {
            // Buat buffer 3MB
            const bigBuffer = Buffer.alloc(3 * 1024 * 1024, 0);

            // ✅ FIX #2: waitFor input attached + timeout 15s
            const logoInput = page.getByTestId('logo-input');
            await logoInput.waitFor({ state: 'attached', timeout: 10_000 });

            await logoInput.setInputFiles({
                name: 'big-logo.png',
                mimeType: 'image/png',
                buffer: bigBuffer,
            });

            // Pesan error dari handleFileChange di Svelte
            await expect(
                page.getByText(/Ukuran logo maksimal 2MB/i),
            ).toBeVisible({ timeout: 15_000 });
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
            await page.goto('/mitra/profile');
        });

        test('field nama_penyedia_usaha bertipe text', async ({ page }) => {
            await expect(page.locator('input#nama_penyedia_usaha')).toHaveAttribute(
                'type',
                'text',
            );
        });

        test('field telepon bertipe text', async ({ page }) => {
            await expect(page.locator('input#telepon')).toHaveAttribute(
                'type',
                'text',
            );
        });

        test('field kode_pos bertipe text', async ({ page }) => {
            await expect(page.locator('input#kode_pos')).toHaveAttribute(
                'type',
                'text',
            );
        });

        test('semua field data usaha TIDAK required (opsional)', async ({ page }) => {
            // Semua field nullable di UpdateProfileRequest
            await expect(page.locator('input#nama_penyedia_usaha')).not.toHaveAttribute(
                'required',
                '',
            );
            await expect(page.locator('input#nomor_identitas')).not.toHaveAttribute(
                'required',
                '',
            );
            await expect(page.locator('input#telepon')).not.toHaveAttribute(
                'required',
                '',
            );
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Batal Behavior
    |--------------------------------------------------------------------------
    */

    test.describe('Batal Behavior', () => {
        test.beforeEach(async ({ page, asMitra }) => {
            await asMitra();
            await page.goto('/mitra/profile');
        });

        test('link Batal mengarah ke /mitra/dashboard', async ({ page }) => {
            const batalLink = page.getByRole('link', { name: /^Batal$/i });
            await expect(batalLink).toHaveAttribute(
                'href',
                /\/mitra\/dashboard$/,
            );
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Accessibility (a11y)
    |--------------------------------------------------------------------------
    */

    test.describe('Accessibility', () => {
        test.beforeEach(async ({ page, asMitra }) => {
            await asMitra();
            await page.goto('/mitra/profile');
        });

        test('semua input memiliki label yang terasosiasi', async ({ page }) => {
            await expect(page.locator('label[for="nama_penyedia_usaha"]')).toBeVisible();
            await expect(page.locator('label[for="nomor_identitas"]')).toBeVisible();
            await expect(page.locator('label[for="alamat"]')).toBeVisible();
            await expect(page.locator('label[for="telepon"]')).toBeVisible();
            await expect(page.locator('label[for="provinsi"]')).toBeVisible();
            await expect(page.locator('label[for="kota"]')).toBeVisible();
            await expect(page.locator('label[for="kode_pos"]')).toBeVisible();
            await expect(page.locator('label[for="deskripsi"]')).toBeVisible();
        });

        test('tombol "Simpan Perubahan" bertipe submit', async ({ page }) => {
            await expect(
                page.getByRole('button', { name: /^Simpan Perubahan$/i }),
            ).toHaveAttribute('type', 'submit');
        });

        test('tombol hapus logo punya aria-label', async ({ page }) => {
            // ✅ FIX #1: pakai helper uploadLogoAndWaitPreview
            await uploadLogoAndWaitPreview(page, createTinyPng());

            await expect(page.getByTestId('logo-remove-button')).toHaveAttribute(
                'aria-label',
                'Hapus logo',
            );
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Flash Message
    |--------------------------------------------------------------------------
    */

    test.describe('Flash Message', () => {
        test('tidak menampilkan flash status di halaman normal', async ({ page, asMitra }) => {
            await asMitra();
            await page.goto('/mitra/profile');

            await expect(page.locator('.bg-green-50')).not.toBeVisible();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Form Submit — Happy Path (HARUS DI PALING AKHIR)
    |--------------------------------------------------------------------------
    |
    | PENTING: Test di section ini mengubah data profile mitra di DB.
    | Karena seeder hanya dijalankan SEKALI di globalSetup (bukan per-test),
    | test setelah section ini akan melihat data yang sudah diubah.
    |
    | Kita pakai describe.serial() dan taruh di paling akhir file.
    | Test di atas (Access Control, Elemen Form, dll) yang butuh data seed
    | sudah dijalankan SEBELUM ini.
    |
    | Konsekuensi: Setelah run test ini, DB TIDAK kembali ke seed.
    | Untuk run berikutnya, `globalSetup` akan migrate:fresh + seed.
    |--------------------------------------------------------------------------
    */

    test.describe.serial('Form Submit — Happy Path', () => {
        test('mitra bisa update nama_penyedia_usaha', async ({ page, asMitra }) => {
            await asMitra();
            await page.goto('/mitra/profile');

            const newName = 'PT XYZ Wisata E2E';
            await page.fill('input#nama_penyedia_usaha', newName);
            await submitProfileUpdate(page);

            await expect(page).toHaveURL('/mitra/profile');
            await expect(
                page.getByText(/Profile berhasil diperbarui/i),
            ).toBeVisible({ timeout: 10_000 });
            await expect(page.locator('input#nama_penyedia_usaha')).toHaveValue(
                newName,
            );
        });

        test('mitra bisa update alamat dan kota', async ({ page, asMitra }) => {
            await asMitra();
            await page.goto('/mitra/profile');

            await page.fill('textarea#alamat', 'Jl. Test E2E No. 999');
            await page.fill('input#kota', 'Jakarta Selatan');
            await submitProfileUpdate(page);

            await expect(page).toHaveURL('/mitra/profile');
            await expect(
                page.getByText(/Profile berhasil diperbarui/i),
            ).toBeVisible({ timeout: 10_000 });
            await expect(page.locator('textarea#alamat')).toHaveValue(
                'Jl. Test E2E No. 999',
            );
            await expect(page.locator('input#kota')).toHaveValue('Jakarta Selatan');
        });

        test('mitra bisa update deskripsi usaha', async ({ page, asMitra }) => {
            await asMitra();
            await page.goto('/mitra/profile');

            const newDesc = 'Deskripsi baru hasil test E2E otomatis.';
            await page.fill('textarea#deskripsi', newDesc);
            await submitProfileUpdate(page);

            await expect(page).toHaveURL('/mitra/profile');
            await expect(page.locator('textarea#deskripsi')).toHaveValue(newDesc);
        });

        test('mitra bisa upload logo baru', async ({ page, asMitra }) => {
            await asMitra();
            await page.goto('/mitra/profile');

            // ✅ FIX #1: pakai helper uploadLogoAndWaitPreview
            await uploadLogoAndWaitPreview(page, createTinyPng());

            // Submit
            await submitProfileUpdate(page);

            await expect(page).toHaveURL('/mitra/profile');
            await expect(
                page.getByText(/Profile berhasil diperbarui/i),
            ).toBeVisible({ timeout: 10_000 });

            // Setelah reload, logo tetap ada (dari storage)
            await expect(page.getByTestId('logo-preview')).toBeVisible({
                timeout: 15_000,
            });
        });

        test('mitra bisa hapus logo (setelah ada logo)', async ({ page, asMitra }) => {
            await asMitra();
            await page.goto('/mitra/profile');

            // Pastikan ada logo (dari test sebelumnya), kalau tidak ada, upload dulu
            const hasLogo = await page.getByTestId('logo-preview').count();
            if (hasLogo === 0) {
                // ✅ FIX #1: pakai helper uploadLogoAndWaitPreview
                await uploadLogoAndWaitPreview(page, createTinyPng());
                await submitProfileUpdate(page);
                await page.goto('/mitra/profile');
            }

            // Klik hapus logo
            await page.getByTestId('logo-remove-button').click();

            // Preview hilang (state lokal)
            await expect(page.getByTestId('logo-preview')).not.toBeVisible();
            await expect(page.getByTestId('logo-placeholder')).toBeVisible();
        });
    });
});