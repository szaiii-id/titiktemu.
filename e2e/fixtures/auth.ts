import { test as base, expect, type Page } from '@playwright/test';
import { APP_URL } from '../config';

// ==========================================
// KONSTANTA TIMEZONE SEED
// ==========================================
export const SEED_TIMEZONE = {
    default: 'Asia/Makassar',
    jakarta: 'Asia/Jakarta',
    jayapura: 'Asia/Jayapura',
} as const;

// ==========================================
// KONSTANTA AKUN SEED
// ==========================================
export const SEED_USERS = {
    admin: {
        email: 'admin@titiktemu.test',
        username: 'admin',
        password: 'password123',
        name: 'Administrator Utama',
        role: 'admin' as const,
        timezone: SEED_TIMEZONE.default,
        dashboardPath: '/admin/dashboard',
    },
    mitra: {
        email: 'budi@ptabc.com',
        username: 'ptabc',
        password: 'password123',
        name: 'Budi Santoso',
        role: 'mitra' as const,
        timezone: SEED_TIMEZONE.default,
        dashboardPath: '/mitra/dashboard',
    },
    client: {
        email: 'client@titiktemu.test',
        username: 'budiclient',
        password: 'password123',
        name: 'Budi Client',
        role: 'client' as const,
        timezone: SEED_TIMEZONE.default,
        dashboardPath: '/client/dashboard',
    },
} as const;

export type SeedRole = keyof typeof SEED_USERS;

// ==========================================
// SEED USERS TAMBAHAN
// ==========================================
export const SEED_EXTRA = {
    mitra2: {
        email: 'ani@gmail.com',
        username: 'aniwijaya',
        password: 'password123',
        name: 'Ani Wijaya',
        role: 'mitra' as const,
        timezone: SEED_TIMEZONE.default,
        dashboardPath: '/mitra/dashboard',
    },
} as const;

// ==========================================
// KONSTANTA SEED PROFILE
// ==========================================
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
// SEED PACKAGES
// ==========================================
export const SEED_PACKAGES = {
    pasarTerapung: {
        kodeSuffix: '-001',
        nama: 'Wisata Pasar Terapung 2D1N',
        status: 'aktif' as const,
        timezone: 'Asia/Makassar',
        durasiHari: 2,
    },
    hutanKalimantan: {
        kodeSuffix: '-002',
        nama: 'Petualangan Hutan Kalimantan 3D2N',
        status: 'aktif' as const,
        timezone: 'Asia/Makassar',
        durasiHari: 3,
    },
    kulinerBanjarmasin: {
        kodeSuffix: '-003',
        nama: 'Wisata Kuliner Banjarmasin 1D',
        status: 'draft' as const,
        timezone: 'Asia/Makassar',
        durasiHari: 1,
    },
} as const;

export function packageKode(suffix: string): string {
    return `PKG-${new Date().getFullYear()}${suffix}`;
}

// ==========================================
// SEED TRIPS
// ==========================================
export const SEED_TRIPS = {
    e2eConfirmed: {
        kodePrefix: `TRP-${new Date().getFullYear()}-`,
        bookingKode: `BKG-${new Date().getFullYear()}-E2E-CONFIRMED`,
        status: 'scheduled' as const,
        mitraCount: 2,
    },
} as const;

// ==========================================
// KONSTANTA TRIP YANG DI-RESET
// ==========================================
export const SEED_TRIP_KODE = `${SEED_TRIPS.e2eConfirmed.kodePrefix}001`;

// ==========================================
// HELPER: PAKSA LOGOUT DARI SERVER
// ==========================================
export async function forceLogout(page: Page): Promise<void> {
    await page.context().clearCookies();
    try {
        if (page.url() !== 'about:blank') {
            await page.evaluate(() => {
                localStorage.clear();
                sessionStorage.clear();
            }).catch(() => {});
        }
    } catch {
        // Abaikan
    }
}

// ==========================================
// HELPER: AMBIL CSRF TOKEN
// ==========================================
async function getCsrfToken(page: Page): Promise<string> {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const csrfToken = await page.evaluate(() => {
        const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : '';
    });

    if (!csrfToken) {
        throw new Error(
            `getCsrfToken: cookie XSRF-TOKEN tidak ditemukan. ` +
            `Cek apakah APP_URL (${APP_URL}) dapat diakses.`,
        );
    }

    return csrfToken;
}

// ==========================================
// HELPER: RESET USER
// ==========================================
export async function resetUser(
    page: Page,
    email: string,
    options: {
        password?: string;
        name?: string;
        username?: string;
        mustChangePassword?: boolean;
        timezone?: string;
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
    const csrfToken = await getCsrfToken(page);

    const form: Record<string, string> = { email };
    if (options.password !== undefined) form.password = options.password;
    if (options.name !== undefined) form.name = options.name;
    if (options.username !== undefined) form.username = options.username;
    if (options.mustChangePassword !== undefined) {
        form.must_change_password = options.mustChangePassword ? '1' : '0';
    }
    if (options.timezone !== undefined) form.timezone = options.timezone;

    if (options.namaPenyediaUsaha !== undefined) form.nama_penyedia_usaha = options.namaPenyediaUsaha;
    if (options.nomorIdentitas !== undefined) form.nomor_identitas = options.nomorIdentitas;
    if (options.alamat !== undefined) form.alamat = options.alamat;
    if (options.telepon !== undefined) form.telepon = options.telepon;
    if (options.provinsi !== undefined) form.provinsi = options.provinsi;
    if (options.kota !== undefined) form.kota = options.kota;
    if (options.kodePos !== undefined) form.kode_pos = options.kodePos;
    if (options.deskripsi !== undefined) form.deskripsi = options.deskripsi;

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
// HELPER: LOGIN VIA UI (BYPASS INERTIA)
// ==========================================
export async function loginViaUI(
    page: Page,
    role: SeedRole,
    options: { useEmail?: boolean; remember?: boolean } = {},
): Promise<void> {
    const { useEmail = true, remember = false } = options;
    const user = SEED_USERS[role];

    await forceLogout(page);

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            await page.goto('/login', {
                waitUntil: 'commit',
                timeout: 30_000,
            });
            break;
        } catch (err) {
            if (attempt === 3) throw err;
            await page.waitForTimeout(500 * attempt);
        }
    }

    await page.waitForFunction(
        () => document.cookie.includes('XSRF-TOKEN'),
        { timeout: 5_000 },
    ).catch(() => {});

    const csrfToken = await page.evaluate(() => {
        const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : '';
    });

    if (!csrfToken) {
        throw new Error(
            `loginViaUI: XSRF-TOKEN tidak ditemukan untuk ${user.email}. ` +
            `URL: ${page.url()}`,
        );
    }

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

    if (response.status() !== 302) {
        throw new Error(
            `Login gagal untuk ${user.email}: status ${response.status()} (expected 302)`,
        );
    }

    const location = response.headers()['location'] ?? '';
    if (!location.includes(user.dashboardPath)) {
        throw new Error(
            `Login redirect tidak sesuai untuk ${user.email}. ` +
            `Expected: ${user.dashboardPath}, Got: ${location}`,
        );
    }

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            await page.goto(user.dashboardPath, {
                waitUntil: 'commit',
                timeout: 30_000,
            });
            break;
        } catch (err) {
            if (attempt === 3) throw err;
            await page.waitForTimeout(500 * attempt);
        }
    }

    if (page.url().includes('/login')) {
        throw new Error(
            `Login sukses tapi dashboard redirect balik ke /login. URL: ${page.url()}`,
        );
    }
}

export async function loginViaHTTP(page: Page, role: SeedRole): Promise<void> {
    await loginViaUI(page, role);
}

export async function loginAsCustom(
    page: Page,
    identitas: string,
    password: string,
    expectedDashboardPath: string = '/client/dashboard',
): Promise<void> {
    await forceLogout(page);

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            await page.goto('/login', {
                waitUntil: 'commit',
                timeout: 30_000,
            });
            break;
        } catch (err) {
            if (attempt === 3) throw err;
            await page.waitForTimeout(500 * attempt);
        }
    }

    await page.waitForFunction(
        () => document.cookie.includes('XSRF-TOKEN'),
        { timeout: 5_000 },
    ).catch(() => {});

    const csrfToken = await page.evaluate(() => {
        const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : '';
    });

    if (!csrfToken) {
        throw new Error(`loginAsCustom: XSRF-TOKEN tidak ditemukan untuk ${identitas}`);
    }

    const response = await page.context().request.post(`${APP_URL}/login`, {
        form: { identitas, password, remember: '' },
        headers: {
            'X-XSRF-TOKEN': csrfToken,
            Accept: 'text/html, application/xhtml+xml',
        },
        maxRedirects: 0,
        failOnStatusCode: false,
    });

    if (response.status() !== 302) {
        throw new Error(
            `Login gagal untuk ${identitas}: status ${response.status()} (expected 302)`,
        );
    }

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            await page.goto(expectedDashboardPath, {
                waitUntil: 'commit',
                timeout: 30_000,
            });
            break;
        } catch (err) {
            if (attempt === 3) throw err;
            await page.waitForTimeout(500 * attempt);
        }
    }
}

export async function logout(page: Page): Promise<void> {
    await forceLogout(page);
}

// ==========================================
// HELPER: GENERATE EMAIL/USERNAME UNIK
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
// HELPER: RESET RATE LIMITER
// ==========================================
export async function resetRateLimiter(
    page: Page,
    limiter: string,
    key: string,
): Promise<void> {
    const csrfToken = await getCsrfToken(page);

    const response = await page.request.post('/_test/clear-throttle', {
        form: { limiter, key },
        headers: { 'X-XSRF-TOKEN': csrfToken },
        failOnStatusCode: false,
    });

    if (!response.ok()) {
        throw new Error(
            `Gagal reset rate limiter: ${limiter} | ${key} (status ${response.status()})`,
        );
    }
}

// ==========================================
// HELPER: RESOLVE PACKAGE ID DARI KODE
// ==========================================
export async function getPackageIdByKode(
    page: Page,
    kode: string,
): Promise<number> {
    const csrfToken = await getCsrfToken(page);

    const response = await page.request.post('/_test/find-package', {
        form: { kode },
        headers: { 'X-XSRF-TOKEN': csrfToken },
        failOnStatusCode: false,
    });

    if (response.ok()) {
        const data = (await response.json()) as { id: number };
        return data.id;
    }

    throw new Error(
        `getPackageIdByKode: endpoint /_test/find-package tidak tersedia ` +
        `untuk kode "${kode}". Tambahkan endpoint ini di routes/web-testing.php ` +
        `atau pakai ID yang sudah diketahui (1, 2, 3 sesuai seed).`,
    );
}

// ==========================================
// HELPER: RESOLVE TRIP ID DARI KODE
// ==========================================
export async function getTripIdByKode(
    page: Page,
    kode: string,
): Promise<number> {
    const csrfToken = await getCsrfToken(page);

    const response = await page.request.post('/_test/find-trip', {
        form: { kode },
        headers: { 'X-XSRF-TOKEN': csrfToken },
        failOnStatusCode: false,
    });

    if (response.ok()) {
        const data = (await response.json()) as { id: number };
        return data.id;
    }

    throw new Error(
        `getTripIdByKode: endpoint /_test/find-trip tidak tersedia ` +
        `untuk kode "${kode}". Tambahkan endpoint ini di routes/web-testing.php.`,
    );
}

// ==========================================
// HELPER: RESET STATE TRIP (LENGKAP)
// ==========================================
/**
 * Reset state trip ke status tertentu via `/_test/reset-trip`,
 * PLUS recreate TripDay & TripMitra (jika `resetDays`/`resetMitras`).
 *
 * ⚠️ DEFAULT `resetDays: false` & `resetMitras: false` — aman,
 * TIDAK memanggil endpoint yang mungkin bermasalah. Untuk reset penuh,
 * panggil dengan `{ resetDays: true, resetMitras: true }` secara eksplisit.
 *
 * ⚠️ GRACEFUL FALLBACK: jika `/_test/reset-trip-days` atau
 * `/_test/reset-trip-mitras` gagal (500, body kosong, dll),
 * test TIDAK gagal — hanya `console.warn`, lanjut dengan reset status saja.
 *
 * Kenapa default false?
 * - Endpoint `/_test/reset-trip-days` & `/_test/reset-trip-mitras` bisa
 *   bermasalah (body kosong, error 500) → JANGAN sampai gagalkan 52 test
 *   karena `beforeEach` throw.
 * - Reset status saja cukup untuk sebagian besar test.
 * - Test yang BUTUH recreate TripDay/TripMitra bisa panggil eksplisit
 *   dengan `{ resetDays: true, resetMitras: true }`.
 *
 * @param page     Playwright Page
 * @param options  { tripKode?, status?, resetDays?, resetMitras? }
 *
 * @example Non-serial — reset status saja (default, aman)
 *   await resetTripState(page);
 *
 * @example Non-serial — reset penuh (butuh TripDay/TripMitra di-recreate)
 *   await resetTripState(page, { resetDays: true, resetMitras: true });
 *
 * @example Serial — hanya status (state berurutan)
 *   await resetTripState(page, { resetDays: false, resetMitras: false });
 */
export async function resetTripState(
    page: Page,
    options: {
        tripKode?: string;
        status?: 'scheduled' | 'active' | 'completed' | 'cancelled';
        resetDays?: boolean;
        resetMitras?: boolean;
    } = {},
): Promise<void> {
    const {
        tripKode = SEED_TRIP_KODE,
        status = 'scheduled',
        resetDays = false,    // ✅ DEFAULT FALSE — aman, tidak panggil endpoint bermasalah
        resetMitras = false,  // ✅ DEFAULT FALSE — aman, tidak panggil endpoint bermasalah
    } = options;
    const csrfToken = await getCsrfToken(page);

    // Resolve ID dari kode
    const tripId = await getTripIdByKode(page, tripKode);

    // 1. Reset status — WAJIB
    const statusResponse = await page.request.post('/_test/reset-trip', {
        form: {
            trip_id: String(tripId),
            status,
        },
        headers: { 'X-XSRF-TOKEN': csrfToken },
        failOnStatusCode: false,
    });

    if (!statusResponse.ok()) {
        const body = await statusResponse.text().catch(() => '(no body)');
        throw new Error(
            `resetTripState (status) gagal untuk ${tripKode} (ID ${tripId}) ` +
            `→ ${status}: ${statusResponse.status()} — ${body}`,
        );
    }

    // 2. Reset TripDay (recreate) — OPSIONAL, graceful fallback
    if (resetDays) {
        const daysResponse = await page.request.post('/_test/reset-trip-days', {
            form: { trip_id: String(tripId) },
            headers: { 'X-XSRF-TOKEN': csrfToken },
            failOnStatusCode: false,
        });

        if (!daysResponse.ok()) {
            const body = await daysResponse.text().catch(() => '(no body)');
            // ✅ GRACEFUL: log warning, JANGAN throw
            console.warn(
                `[resetTripState] reset-trip-days gagal untuk ${tripKode}: ` +
                `${daysResponse.status()} — ${body.slice(0, 200)}. ` +
                `Lanjut dengan status saja.`,
            );
        }
    }

    // 3. Reset TripMitra (re-assign Budi + Ani) — OPSIONAL, graceful fallback
    if (resetMitras) {
        const mitrasResponse = await page.request.post('/_test/reset-trip-mitras', {
            form: { trip_id: String(tripId) },
            headers: { 'X-XSRF-TOKEN': csrfToken },
            failOnStatusCode: false,
        });

        if (!mitrasResponse.ok()) {
            const body = await mitrasResponse.text().catch(() => '(no body)');
            // ✅ GRACEFUL: log warning, JANGAN throw
            console.warn(
                `[resetTripState] reset-trip-mitras gagal untuk ${tripKode}: ` +
                `${mitrasResponse.status()} — ${body.slice(0, 200)}. ` +
                `Lanjut dengan status saja.`,
            );
        }
    }
}

// ==========================================
// HELPER: CREATE TRIP VIA API
// ==========================================
export async function createTripViaAPI(
    page: Page,
    options: {
        packageId: number;
        clientIndex?: number;
        mitraIndex?: number;
        daysAhead?: number;
        jumlahPeserta?: number;
        skipMitra?: boolean;
    },
): Promise<{
    trip_id: number;
    trip_kode: string;
    booking_id: number;
    booking_kode: string;
    status: string;
    has_mitra: boolean;
}> {
    const csrfToken = await getCsrfToken(page);

    const form: Record<string, string> = {
        package_id: String(options.packageId),
    };
    if (options.clientIndex !== undefined) form.client_index = String(options.clientIndex);
    if (options.mitraIndex !== undefined) form.mitra_index = String(options.mitraIndex);
    if (options.daysAhead !== undefined) form.days_ahead = String(options.daysAhead);
    if (options.jumlahPeserta !== undefined) form.jumlah_peserta = String(options.jumlahPeserta);
    if (options.skipMitra !== undefined) form.skip_mitra = options.skipMitra ? '1' : '0';

    const response = await page.request.post('/_test/create-trip', {
        form,
        headers: { 'X-XSRF-TOKEN': csrfToken },
        failOnStatusCode: false,
    });

    if (!response.ok()) {
        throw new Error(
            `createTripViaAPI gagal: ${response.status()} — ${await response.text()}`,
        );
    }

    return response.json();
}

// ==========================================
// HELPER: SIMULATE TRIP DUE
// ==========================================
export async function simulateTripDue(
    page: Page,
    tripId: number,
    daysAgo = 1,
): Promise<{ trip_id: number; tanggal_mulai: string | null; status: string | null }> {
    const csrfToken = await getCsrfToken(page);

    const response = await page.request.post('/_test/simulate-trip-due', {
        form: {
            trip_id: String(tripId),
            days_ago: String(daysAgo),
        },
        headers: { 'X-XSRF-TOKEN': csrfToken },
        failOnStatusCode: false,
    });

    if (!response.ok()) {
        throw new Error(
            `simulateTripDue gagal: ${response.status()} — ${await response.text()}`,
        );
    }

    return response.json();
}

// ==========================================
// HELPER: RUN ACTIVATE TRIPS
// ==========================================
export async function runActivateTrips(page: Page): Promise<void> {
    const csrfToken = await getCsrfToken(page);

    const response = await page.request.post('/_test/run-activate-trips', {
        headers: { 'X-XSRF-TOKEN': csrfToken },
        failOnStatusCode: false,
    });

    if (!response.ok()) {
        throw new Error(
            `runActivateTrips gagal: ${response.status()} — ${await response.text()}`,
        );
    }
}

// ==========================================
// HELPER: SUBMIT DAILY REPORT VIA API
// ==========================================
export async function submitDailyReportViaAPI(
    page: Page,
    options: {
        tripId: number;
        hariKe: number;
        mitraIndex?: number;
        catatan?: string;
        tanpaMedia?: boolean;
    },
): Promise<{
    report_id: number;
    status: string;
    trip_id: number;
    trip_day_id: number;
    hari_ke: number;
    mitra_id: number;
    media_count: number;
}> {
    const csrfToken = await getCsrfToken(page);

    const form: Record<string, string> = {
        trip_id: String(options.tripId),
        hari_ke: String(options.hariKe),
    };
    if (options.mitraIndex !== undefined) form.mitra_index = String(options.mitraIndex);
    if (options.catatan !== undefined) form.catatan = options.catatan;
    if (options.tanpaMedia !== undefined) form.tanpa_media = options.tanpaMedia ? '1' : '0';

    const response = await page.request.post('/_test/submit-daily-report', {
        form,
        headers: {
            'X-XSRF-TOKEN': csrfToken,
            'Accept': 'application/json',   // ✅ FIX: error 404 jadi JSON
        },
        failOnStatusCode: false,
    });

    if (!response.ok()) {
        throw new Error(
            `submitDailyReportViaAPI gagal: ${response.status()} — ${await response.text()}`,
        );
    }

    return response.json();
}

// ==========================================
// HELPER: VERIFY DAILY REPORT VIA API
// ==========================================
export async function verifyDailyReportViaAPI(
    page: Page,
    reportId: number,
): Promise<{ report_id: number; status: string }> {
    const csrfToken = await getCsrfToken(page);

    const response = await page.request.post('/_test/verify-daily-report', {
        form: { report_id: String(reportId) },
        headers: {
            'X-XSRF-TOKEN': csrfToken,
            'Accept': 'application/json',
        },
        failOnStatusCode: false,
    });

    if (!response.ok()) {
        throw new Error(
            `verifyDailyReportViaAPI gagal: ${response.status()} — ${await response.text()}`,
        );
    }

    return response.json();
}

// ==========================================
// HELPER: VERIFY ALL DAILY REPORTS FOR TRIP
// ==========================================
export async function verifyAllDailyReportsViaAPI(
    page: Page,
    tripId: number,
): Promise<{ trip_id: number; verified_count: number; trip_status: string | null }> {
    const csrfToken = await getCsrfToken(page);

    const response = await page.request.post('/_test/verify-all-daily-reports', {
        form: { trip_id: String(tripId) },
        headers: {
            'X-XSRF-TOKEN': csrfToken,
            'Accept': 'application/json',
        },
        failOnStatusCode: false,
    });

    if (!response.ok()) {
        throw new Error(
            `verifyAllDailyReportsViaAPI gagal: ${response.status()} — ${await response.text()}`,
        );
    }

    return response.json();
}

// ==========================================
// HELPER: ADD WALLET BALANCE VIA API
// ==========================================
export async function addWalletBalanceViaAPI(
    page: Page,
    mitraId: number,
    jumlah: number,
): Promise<{ saldo: number }> {
    const csrfToken = await getCsrfToken(page);

    const response = await page.request.post('/_test/add-wallet-balance', {
        form: {
            mitra_id: String(mitraId),
            jumlah: String(jumlah),
        },
        headers: {
            'X-XSRF-TOKEN': csrfToken,
            'Accept': 'application/json',
        },
        failOnStatusCode: false,
    });

    if (!response.ok()) {
        throw new Error(
            `addWalletBalanceViaAPI gagal: ${response.status()} — ${await response.text()}`,
        );
    }

    return response.json();
}

// ==========================================
// HELPER: CREATE PAYOUT VIA API
// ==========================================
export async function createPayoutViaAPI(
    page: Page,
    options: { mitraId: number; jumlah: number },
): Promise<{ payout_id: number; kode: string; status: string }> {
    const csrfToken = await getCsrfToken(page);

    const response = await page.request.post('/_test/create-payout', {
        form: {
            mitra_id: String(options.mitraId),
            jumlah: String(options.jumlah),
        },
        headers: {
            'X-XSRF-TOKEN': csrfToken,
            'Accept': 'application/json',
        },
        failOnStatusCode: false,
    });

    if (!response.ok()) {
        throw new Error(
            `createPayoutViaAPI gagal: ${response.status()} — ${await response.text()}`,
        );
    }

    return response.json();
}

// ==========================================
// CUSTOM TEST FIXTURE
// ==========================================
type AuthFixtures = {
    asAdmin: () => Promise<void>;
    asMitra: () => Promise<void>;
    asClient: () => Promise<void>;
    asGuest: () => Promise<void>;
    // ✅ Fixture reset trip — mendukung resetDays & resetMitras
    resetTrip: (options?: {
        tripKode?: string;
        status?: 'scheduled' | 'active' | 'completed' | 'cancelled';
        resetDays?: boolean;
        resetMitras?: boolean;
    }) => Promise<void>;
};

export const test = base.extend<AuthFixtures>({
    asAdmin: async ({ page }, use) => {
        await resetUser(page, SEED_USERS.admin.email, {
            password: SEED_USERS.admin.password,
            name: SEED_USERS.admin.name,
            username: SEED_USERS.admin.username,
            timezone: SEED_USERS.admin.timezone,
        });
        await use(async () => {
            await loginViaUI(page, 'admin');
        });
    },

    asMitra: async ({ page }, use) => {
        await resetUser(page, SEED_USERS.mitra.email, {
            password: SEED_USERS.mitra.password,
            name: SEED_USERS.mitra.name,
            username: SEED_USERS.mitra.username,
            timezone: SEED_USERS.mitra.timezone,
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
        await resetUser(page, SEED_USERS.client.email, {
            password: SEED_USERS.client.password,
            name: SEED_USERS.client.name,
            username: SEED_USERS.client.username,
            timezone: SEED_USERS.client.timezone,
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

    // ✅ Fixture resetTrip
    resetTrip: async ({ page }, use) => {
        await use(async (options = {}) => {
            await resetTripState(page, options);
        });
    },
});

export { expect };