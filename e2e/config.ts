// e2e/config.ts
import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// LOAD ENV — SEBELUM BACA process.env
// ==========================================
// Muat .env.testing DULU agar process.env.DB_USERNAME dan
// process.env.DB_PASSWORD ter-set sebelum dibaca di bawah.
//
// Ini penting karena `e2e/config.ts` di-import SEBELUM
// `loadEnv()` di `playwright.config.ts`. Tanpa ini,
// `E2E_DB_USERNAME` akan fallback ke 'postgres' dan
// `E2E_DB_PASSWORD` akan kosong, menyebabkan `psql` minta password.
loadEnv({ path: path.resolve(__dirname, '../.env.testing') });

// ==========================================
// CI & SHARD
// ==========================================
export const isCI = !!process.env.CI;

/**
 * SHARD_INDEX: 0-based index shard (0, 1, 2, ...)
 * TOTAL_SHARDS: total jumlah shard (1 = tidak sharding)
 */
const SHARD_INDEX = Number(process.env.SHARD_INDEX ?? 0);
const TOTAL_SHARDS = Number(process.env.TOTAL_SHARDS ?? 1);

// ==========================================
// APLIKASI
// ==========================================
const BASE_PORT = 8000;
export const APP_PORT = Number(
    process.env.E2E_APP_PORT ?? BASE_PORT + SHARD_INDEX,
);

export const APP_URL =
    process.env.E2E_APP_URL ?? `http://127.0.0.1:${APP_PORT}`;

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

// ✅ process.env.DB_USERNAME dan DB_PASSWORD sudah ter-set dari loadEnv
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

    // ✅ AUTH THROTTLE — GUNAKAN ENV JIKA DI-SET, DEFAULT KE 1000
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

/**
 * Helper untuk menyusun perintah artisan dengan env testing.
 */
export function artisan(command: string): string {
    const envVars = Object.entries(ARTISAN_ENV)
        .map(([key, value]) => `${key}="${value}"`)
        .join(' ');

    return `${envVars} php artisan ${command}`;
}