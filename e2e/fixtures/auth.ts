import { test as base, expect, type Page } from '@playwright/test';
import { APP_URL } from '../config';

// ==========================================
// KONSTANTA AKUN SEED
// ==========================================
/**
 * SEED_USERS — HARUS SINKRON dengan `database/seeders/UserSeeder.php`.
 *
 * Kalau seeder diubah, update fixture ini juga.
 *
 * Current seed (dari UserSeeder.php):
 * - admin@titiktemu.test      / password123  (username: admin,      name: Administrator Utama)
 * - budi@ptabc.com            / password123  (username: ptabc,      name: Budi Santoso)
 * - ani@gmail.com             / password123  (username: aniwijaya,  name: Ani Wijaya)
 * - client@titiktemu.test     / password123  (username: budiclient, name: Budi Client)
 *
 * CATATAN:
 * - Ada 2 user mitra di seeder. Fixture pakai mitra pertama (`budi@ptabc.com`).
 * - `must_change_password = false` untuk semua user.
 */
export const SEED_USERS = {
    admin: {
        email: 'admin@titiktemu.test',
        username: 'admin',
        password: 'password123',
        name: 'Administrator Utama',
        role: 'admin' as const,
        dashboardPath: '/admin/dashboard',
    },
    mitra: {
        email: 'budi@ptabc.com',
        username: 'ptabc',
        password: 'password123',
        name: 'Budi Santoso',
        role: 'mitra' as const,
        dashboardPath: '/mitra/dashboard',
    },
    client: {
        email: 'client@titiktemu.test',
        username: 'budiclient',
        password: 'password123',
        name: 'Budi Client',
        role: 'client' as const,
        dashboardPath: '/client/dashboard',
    },
} as const;

export type SeedRole = keyof typeof SEED_USERS;

// ==========================================
// SEED USERS TAMBAHAN (opsional)
// ==========================================
/**
 * User mitra tambahan dari seeder (kalau butuh test dengan 2 mitra).
 */
export const SEED_EXTRA = {
    mitra2: {
        email: 'ani@gmail.com',
        username: 'aniwijaya',
        password: 'password123',
        name: 'Ani Wijaya',
        role: 'mitra' as const,
        dashboardPath: '/mitra/dashboard',
    },
} as const;

// ==========================================
// KONSTANTA SEED PROFILE (untuk reset mitra)
// ==========================================
/**
 * Nilai seed profile mitra — sinkron dengan UserSeeder.php.
 * Dipakai untuk reset profile mitra di fixture `asMitra`.
 *
 * Semua field ini HARUS SAMA dengan yang ada di UserSeeder.php,
 * karena endpoint `/_test/reset-user` akan menimpa nilai profile
 * dengan nilai ini.
 */
const SEED_MITRA_PROFILE = {
    namaPenyediaUsaha: 'PT ABC Travel',
    nomorIdentitas: '12.345.678.9-012.000',
    alamat: 'Jl. Merdeka No. 123',
    telepon: '+62 811 2233 4455',
    provinsi: 'Kalimantan Selatan',
    kota: 'Banjarmasin',
    kodePos: '70111',
    deskripsi: 'Travel agent terpercaya sejak 2010. Melayani paket wisata domestik & internasional.',
} as const;

// ==========================================
// HELPER: PAKSA LOGOUT DARI SERVER
// ==========================================
export async function forceLogout(page: Page): Promise<void> {
    try {
        await page.goto('/');

        const csrfToken = await page.evaluate(() => {
            const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
            return match ? decodeURIComponent(match[1]) : '';
        });

        await page.request.post(`${APP_URL}/logout`, {
            headers: {
                'X-XSRF-TOKEN': csrfToken,
                Accept: 'text/html, application/xhtml+xml',
            },
            failOnStatusCode: false,
        });
    } catch {
        // Abaikan error
    }

    await page.context().clearCookies();
}

// ==========================================
// HELPER: RESET USER (via endpoint test)
// ==========================================
/**
 * Reset user ke state seed via endpoint `/_test/reset-user`.
 *
 * Dipakai oleh fixture `asAdmin`, `asMitra`, `asClient` supaya setiap
 * test mulai dari state bersih — tidak ada state leak antar test.
 *
 * Endpoint hanya aktif di env testing (lihat `routes/web-testing.php`).
 *
 * PENTING — CSRF Token:
 *   Endpoint `/_test/reset-user` terdaftar di grup `web` middleware,
 *   sehingga tetap butuh CSRF token. Kita navigate ke `/` dulu untuk
 *   mendapat cookie `XSRF-TOKEN`, lalu kirim sebagai header
 *   `X-XSRF-TOKEN` di request POST.
 *
 * @param page     Playwright Page (untuk dapat CSRF token via navigasi)
 * @param email    Email user yang akan di-reset
 * @param options  Field opsional yang mau di-reset (default: seed value)
 */
export async function resetUser(
    page: Page,
    email: string,
    options: {
        // User fields
        password?: string;
        name?: string;
        username?: string;
        mustChangePassword?: boolean;
        // Profile fields (hanya dipakai kalau user punya profile)
        namaPenyediaUsaha?: string;
        nomorIdentitas?: string;
        alamat?: string;
        telepon?: string;
        provinsi?: string;
        kota?: string;
        kodePos?: string;
        deskripsi?: string;
    } = {},
): Promise<void> {
    // 1. Navigate ke / supaya browser set cookie XSRF-TOKEN
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // 2. Ambil CSRF token dari cookie
    const csrfToken = await page.evaluate(() => {
        const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : '';
    });

    if (!csrfToken) {
        throw new Error(
            `resetUser: CSRF token tidak ditemukan setelah goto('/'). ` +
            `Cek apakah APP_URL (${APP_URL}) dapat diakses.`,
        );
    }

    // 3. Susun form data
    const form: Record<string, string> = { email };

    // User fields
    if (options.password !== undefined) form.password = options.password;
    if (options.name !== undefined) form.name = options.name;
    if (options.username !== undefined) form.username = options.username;
    if (options.mustChangePassword !== undefined) {
        form.must_change_password = options.mustChangePassword ? '1' : '0';
    }

    // Profile fields — semua field yang dikirim akan di-update di endpoint
    if (options.namaPenyediaUsaha !== undefined) {
        form.nama_penyedia_usaha = options.namaPenyediaUsaha;
    }
    if (options.nomorIdentitas !== undefined) {
        form.nomor_identitas = options.nomorIdentitas;
    }
    if (options.alamat !== undefined) form.alamat = options.alamat;
    if (options.telepon !== undefined) form.telepon = options.telepon;
    if (options.provinsi !== undefined) form.provinsi = options.provinsi;
    if (options.kota !== undefined) form.kota = options.kota;
    if (options.kodePos !== undefined) form.kode_pos = options.kodePos;
    if (options.deskripsi !== undefined) form.deskripsi = options.deskripsi;

    // 4. POST ke endpoint test dengan CSRF token
    const response = await page.request.post('/_test/reset-user', {
        form,
        headers: { 'X-XSRF-TOKEN': csrfToken },
    });

    if (!response.ok()) {
        const body = await response.text().catch(() => '(no body)');
        throw new Error(
            `resetUser gagal untuk ${email}: status ${response.status()} — ${body}`,
        );
    }
}

// ==========================================
// HELPER: LOGIN VIA HTTP (BYPASS INERTIA)
// ==========================================
/**
 * Login dengan mengirim POST /login via `page.request` (HTTP).
 *
 * Kenapa TIDAK via klik form?
 * Karena Inertia meng-intercept form submit sebagai XHR dengan
 * header `X-Inertia: true`. Response 302 di-handle berbeda oleh
 * Inertia, dan Playwright tidak selalu bisa mendeteksi navigasi
 * hasilnya.
 *
 * Dengan mengirim POST langsung via `page.request` (tanpa header
 * `X-Inertia`), server return redirect HTML standar, cookie session
 * di-set dengan benar, dan browser bisa follow redirect.
 */
export async function loginViaUI(
    page: Page,
    role: SeedRole,
    options: {
        useEmail?: boolean;
        remember?: boolean;
    } = {}
): Promise<void> {
    const { useEmail = true, remember = false } = options;
    const user = SEED_USERS[role];

    // 1. Bersihkan state lama
    await forceLogout(page);

    // 2. Buka halaman login untuk dapat CSRF token
    await page.goto('/login');

    const csrfToken = await page.evaluate(() => {
        const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : '';
    });

    // 3. POST /login via page.request (bypass Inertia)
    const response = await page.context().request.post(`${APP_URL}/login`, {
        form: {
            identitas: useEmail ? user.email : user.username,
            password: user.password,
            remember: remember ? '1' : '',
        },
        headers: {
            'X-XSRF-TOKEN': csrfToken,
            Accept: 'text/html, application/xhtml+xml',
        },
        maxRedirects: 0,
        failOnStatusCode: false,
    });

    // 4. Verifikasi status 302
    if (response.status() !== 302) {
        throw new Error(
            `Login gagal untuk ${user.email}: ` +
            `status ${response.status()} (expected 302)`
        );
    }

    const location = response.headers()['location'] ?? '';
    if (!location.includes(user.dashboardPath)) {
        throw new Error(
            `Login redirect tidak sesuai untuk ${user.email}. ` +
            `Expected: ${user.dashboardPath}, Got: ${location}`
        );
    }

    // 5. Navigasi ke dashboard
    await page.goto(user.dashboardPath, {
        waitUntil: 'commit',
        timeout: 15_000,
    });

    // 6. Pastikan tidak redirect balik ke /login
    if (page.url().includes('/login')) {
        throw new Error(
            `Login sukses tapi dashboard redirect balik ke /login. ` +
            `URL: ${page.url()}`
        );
    }
}

// ==========================================
// HELPER: LOGIN VIA HTTP (ALIAS)
// ==========================================
export async function loginViaHTTP(
    page: Page,
    role: SeedRole
): Promise<void> {
    await loginViaUI(page, role);
}

// ==========================================
// HELPER: LOGIN SEBAGAI USER KUSTOM
// ==========================================
/**
 * Login dengan email/username & password kustom.
 * Berguna untuk test user yang baru di-register.
 */
export async function loginAsCustom(
    page: Page,
    identitas: string,
    password: string,
    expectedDashboardPath: string = '/client/dashboard',
): Promise<void> {
    await forceLogout(page);

    await page.goto('/login');

    const csrfToken = await page.evaluate(() => {
        const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : '';
    });

    const response = await page.context().request.post(`${APP_URL}/login`, {
        form: {
            identitas,
            password,
            remember: '',
        },
        headers: {
            'X-XSRF-TOKEN': csrfToken,
            Accept: 'text/html, application/xhtml+xml',
        },
        maxRedirects: 0,
        failOnStatusCode: false,
    });

    if (response.status() !== 302) {
        throw new Error(
            `Login gagal untuk ${identitas}: ` +
            `status ${response.status()} (expected 302)`
        );
    }

    await page.goto(expectedDashboardPath, {
        waitUntil: 'commit',
        timeout: 15_000,
    });
}

// ==========================================
// HELPER: LOGOUT
// ==========================================
export async function logout(page: Page): Promise<void> {
    await forceLogout(page);
}

// ==========================================
// HELPER: GENERATE EMAIL UNIK
// ==========================================
export function uniqueEmail(prefix = 'e2e'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    return `${prefix}-${timestamp}-${random}@titiktemu.test`;
}

export function uniqueUsername(prefix = 'e2e'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 6);
    return `${prefix}${timestamp}${random}`.toLowerCase();
}

// ==========================================
// HELPER: RESET RATE LIMITER (dari test lama)
// ==========================================
/**
 * Reset rate limiter via endpoint `/_test/clear-throttle`.
 *
 * Key harus SAMA dengan `AuthThrottleResponse::resolveKey()`:
 * - login: `strtolower(identitas)|ip`
 * - register: `strtolower(email)|ip`
 * - forgot-password: `strtolower(email)|ip`
 * - reset-password: `strtolower(email)|ip`
 */
export async function resetRateLimiter(
    page: Page,
    limiter: string,
    key: string,
): Promise<void> {
    await page.goto('/');

    const csrfToken = await page.evaluate(() => {
        const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : '';
    });

    const response = await page.request.post('/_test/clear-throttle', {
        form: { limiter, key },
        headers: { 'X-XSRF-TOKEN': csrfToken },
        failOnStatusCode: false,
    });

    if (!response.ok()) {
        throw new Error(
            `Gagal reset rate limiter: ${limiter} | ${key} ` +
            `(status ${response.status()})`
        );
    }
}

// ==========================================
// CUSTOM TEST FIXTURE
// ==========================================
type AuthFixtures = {
    asAdmin: () => Promise<void>;
    asMitra: () => Promise<void>;
    asClient: () => Promise<void>;
    asGuest: () => Promise<void>;
};

export const test = base.extend<AuthFixtures>({
    asAdmin: async ({ page }, use) => {
        // Reset admin seed ke state bersih SEBELUM test
        await resetUser(page, SEED_USERS.admin.email, {
            password: SEED_USERS.admin.password,
            name: SEED_USERS.admin.name,
            username: SEED_USERS.admin.username,
        });

        await use(async () => {
            await loginViaUI(page, 'admin');
        });
    },

    asMitra: async ({ page }, use) => {
        // Reset mitra seed + SEMUA field profile ke state bersih SEBELUM test
        await resetUser(page, SEED_USERS.mitra.email, {
            // User fields
            password: SEED_USERS.mitra.password,
            name: SEED_USERS.mitra.name,
            username: SEED_USERS.mitra.username,
            // Profile fields — semua
            namaPenyediaUsaha: SEED_MITRA_PROFILE.namaPenyediaUsaha,
            nomorIdentitas: SEED_MITRA_PROFILE.nomorIdentitas,
            alamat: SEED_MITRA_PROFILE.alamat,
            telepon: SEED_MITRA_PROFILE.telepon,
            provinsi: SEED_MITRA_PROFILE.provinsi,
            kota: SEED_MITRA_PROFILE.kota,
            kodePos: SEED_MITRA_PROFILE.kodePos,
            deskripsi: SEED_MITRA_PROFILE.deskripsi,
        });

        await use(async () => {
            await loginViaUI(page, 'mitra');
        });
    },

    asClient: async ({ page }, use) => {
        // Reset client seed ke state bersih SEBELUM test
        await resetUser(page, SEED_USERS.client.email, {
            password: SEED_USERS.client.password,
            name: SEED_USERS.client.name,
            username: SEED_USERS.client.username,
        });

        await use(async () => {
            await loginViaUI(page, 'client');
        });
    },

    asGuest: async ({ page }, use) => {
        await use(async () => {
            await forceLogout(page);
        });
    },
});

export { expect };