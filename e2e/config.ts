// e2e/config.ts
import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// ==========================================
// LOAD ENV — SEBELUM BACA process.env
// ==========================================
loadEnv({
    path: path.resolve(__dirname, '../.env.testing'),
    override: false,
});

// ==========================================
// CI & SHARD
// ==========================================
export const isCI = !!process.env.CI;

/**
 * SHARD_INDEX: 0-based index shard (0, 1, 2, ...)
 * TOTAL_SHARDS: total jumlah shard (1 = tidak sharding)
 */
export const SHARD_INDEX = Number(process.env.SHARD_INDEX ?? 0);
export const TOTAL_SHARDS = Number(process.env.TOTAL_SHARDS ?? 1);

// ==========================================
// ✅ FIX RACE: STORAGE ISOLATION PER SHARD
// ==========================================
/**
 * Setiap shard punya `storage/` sendiri — mencegah race di:
 * - storage/framework/views  → compiled Blade/Svelte
 * - storage/framework/cache  → file cache
 * - storage/framework/sessions → session file
 * - storage/logs             → laravel.log
 *
 * Tanpa ini:
 * - 8 shard compile Blade bersamaan → view corrupt → test error acak
 * - 8 shard tulis log bersamaan → log bercampur
 * - 8 shard tulis session bersamaan → session hilang
 *
 * Root cause "1 file lulus, sharding gagal":
 * - 1 file → 1 proses → tidak ada race → lulus
 * - 8 shard → 8 proses → race di shared storage → gagal
 */
export const SHARD_STORAGE_PATH = path.resolve(
    PROJECT_ROOT,
    `storage/shard-${SHARD_INDEX}`,
);

// ✅ Inject ke process.env — agar web server Playwright
// (php artisan serve) juga pakai storage shard ini.
// Laravel 13 baca dari $_ENV['LARAVEL_STORAGE_PATH']
// (lihat Application::storagePath()).
process.env.LARAVEL_STORAGE_PATH = SHARD_STORAGE_PATH;

// ==========================================
// OUTPUT ARTIFACT & REPORT DIR — ISOLASI PER SHARD
// ==========================================
export const SHARD_OUTPUT_DIR = `test-results/shard-${SHARD_INDEX}`;
export const SHARD_REPORT_DIR = `playwright-report/shard-${SHARD_INDEX}`;

// ==========================================
// APLIKASI
// ==========================================
const BASE_PORT = 8000;

export const APP_PORT =
    SHARD_INDEX > 0
        ? BASE_PORT + SHARD_INDEX
        : Number(process.env.E2E_APP_PORT ?? BASE_PORT);

export const APP_URL = `http://127.0.0.1:${APP_PORT}`;

// ==========================================
// DATABASE TESTING (per shard)
// ==========================================
const BASE_DB_NAME =
    process.env.E2E_DB_DATABASE ?? 'titiktemu_db_testing';

export const E2E_DB_DATABASE =
    TOTAL_SHARDS > 1 ? `${BASE_DB_NAME}_w${SHARD_INDEX}` : BASE_DB_NAME;

export const E2E_DB_CONNECTION = process.env.E2E_DB_CONNECTION ?? 'pgsql';
export const E2E_DB_HOST = process.env.E2E_DB_HOST ?? '127.0.0.1';
export const E2E_DB_PORT = Number(process.env.E2E_DB_PORT ?? 5432);

export const E2E_DB_USERNAME =
    process.env.E2E_DB_USERNAME ?? process.env.DB_USERNAME ?? 'postgres';
export const E2E_DB_PASSWORD =
    process.env.E2E_DB_PASSWORD ?? process.env.DB_PASSWORD ?? '';

// ==========================================
// AUTH THROTTLE — DEFAULT UNTUK TESTING
// ==========================================
const AUTH_THROTTLE = {
    LOGIN_MAX: process.env.AUTH_THROTTLE_LOGIN_MAX ?? '5',
    LOGIN_DECAY: process.env.AUTH_THROTTLE_LOGIN_DECAY ?? '60',
    LOGIN_TEST_OVERRIDE:
        process.env.AUTH_THROTTLE_LOGIN_TEST_OVERRIDE ?? '1000',

    REGISTER_MAX: process.env.AUTH_THROTTLE_REGISTER_MAX ?? '3',
    REGISTER_DECAY: process.env.AUTH_THROTTLE_REGISTER_DECAY ?? '60',
    REGISTER_TEST_OVERRIDE:
        process.env.AUTH_THROTTLE_REGISTER_TEST_OVERRIDE ?? '1000',

    FORGOT_MAX: process.env.AUTH_THROTTLE_FORGOT_MAX ?? '3',
    FORGOT_DECAY: process.env.AUTH_THROTTLE_FORGOT_DECAY ?? '60',
    FORGOT_TEST_OVERRIDE:
        process.env.AUTH_THROTTLE_FORGOT_PASSWORD_TEST_OVERRIDE ?? '1000',

    RESET_MAX: process.env.AUTH_THROTTLE_RESET_MAX ?? '5',
    RESET_DECAY: process.env.AUTH_THROTTLE_RESET_DECAY ?? '60',
    RESET_TEST_OVERRIDE:
        process.env.AUTH_THROTTLE_RESET_PASSWORD_TEST_OVERRIDE ?? '1000',
};

// ==========================================
// ENV UNTUK ARTISAN COMMAND
// ==========================================
export const ARTISAN_ENV: Record<string, string> = {
    APP_ENV: 'testing',
    APP_DEBUG: 'true',
    APP_URL: APP_URL,
    DB_CONNECTION: E2E_DB_CONNECTION,
    DB_HOST: E2E_DB_HOST,
    DB_PORT: String(E2E_DB_PORT),
    DB_DATABASE: E2E_DB_DATABASE,
    DB_USERNAME: E2E_DB_USERNAME,
    DB_PASSWORD: E2E_DB_PASSWORD,
    SESSION_DRIVER: 'database',
    CACHE_STORE: 'database',
    QUEUE_CONNECTION: 'sync',
    MAIL_MAILER: 'log',

    // ✅ FIX RACE: Storage isolation — artisan & web server
    // pakai `storage/shard-N/`, bukan `storage/` shared.
    LARAVEL_STORAGE_PATH: SHARD_STORAGE_PATH,

    AUTH_THROTTLE_LOGIN_MAX: AUTH_THROTTLE.LOGIN_MAX,
    AUTH_THROTTLE_LOGIN_DECAY: AUTH_THROTTLE.LOGIN_DECAY,
    AUTH_THROTTLE_LOGIN_TEST_OVERRIDE: AUTH_THROTTLE.LOGIN_TEST_OVERRIDE,

    AUTH_THROTTLE_REGISTER_MAX: AUTH_THROTTLE.REGISTER_MAX,
    AUTH_THROTTLE_REGISTER_DECAY: AUTH_THROTTLE.REGISTER_DECAY,
    AUTH_THROTTLE_REGISTER_TEST_OVERRIDE:
        AUTH_THROTTLE.REGISTER_TEST_OVERRIDE,

    AUTH_THROTTLE_FORGOT_MAX: AUTH_THROTTLE.FORGOT_MAX,
    AUTH_THROTTLE_FORGOT_DECAY: AUTH_THROTTLE.FORGOT_DECAY,
    AUTH_THROTTLE_FORGOT_PASSWORD_TEST_OVERRIDE:
        AUTH_THROTTLE.FORGOT_TEST_OVERRIDE,

    AUTH_THROTTLE_RESET_MAX: AUTH_THROTTLE.RESET_MAX,
    AUTH_THROTTLE_RESET_DECAY: AUTH_THROTTLE.RESET_DECAY,
    AUTH_THROTTLE_RESET_PASSWORD_TEST_OVERRIDE:
        AUTH_THROTTLE.RESET_TEST_OVERRIDE,
};

export function artisan(command: string): string {
    const envVars = Object.entries(ARTISAN_ENV)
        .map(([key, value]) => `${key}="${value}"`)
        .join(' ');

    return `${envVars} php artisan ${command}`;
}