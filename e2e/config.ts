// e2e/config.ts
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// CI & SHARD
// ==========================================
export const isCI = !!process.env.CI;

/**
 * SHARD_INDEX: 0-based index shard (0, 1, 2, ...)
 * TOTAL_SHARDS: total jumlah shard (1 = tidak sharding)
 *
 * Di CI (Tests.yml), nilai ini di-set via env:
 *   SHARD_INDEX=${{ matrix.shard }}  (0, 1, 2)
 *   TOTAL_SHARDS=3
 *
 * Di lokal, biarkan default (0 & 1) → tidak sharding.
 */
const SHARD_INDEX = Number(process.env.SHARD_INDEX ?? 0);
const TOTAL_SHARDS = Number(process.env.TOTAL_SHARDS ?? 1);

// ==========================================
// APLIKASI
// ==========================================
/**
 * Port unik per shard:
 *   shard 0 / single  → 8000
 *   shard 1           → 8001
 *   shard 2           → 8002
 *
 * Bisa di-override dengan E2E_APP_PORT (misal di CI env).
 */
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

/**
 * Setiap shard punya database sendiri untuk isolasi total:
 *   total_shards = 1 → titiktemu_db_testing
 *   total_shards = 3 → titiktemu_db_testing_w0, _w1, _w2
 *
 * Ini mencegah tabrakan `migrate:fresh` antar shard paralel.
 */
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
    // ✅ AUTH THROTTLE — OVERRIDE UNTUK TESTING
    AUTH_THROTTLE_LOGIN_MAX: '5',
    AUTH_THROTTLE_LOGIN_DECAY: '60',
    AUTH_THROTTLE_LOGIN_TEST_OVERRIDE: '1000',
    AUTH_THROTTLE_REGISTER_MAX: '3',
    AUTH_THROTTLE_REGISTER_DECAY: '60',
    AUTH_THROTTLE_REGISTER_TEST_OVERRIDE: '1000',
    AUTH_THROTTLE_FORGOT_MAX: '3',
    AUTH_THROTTLE_FORGOT_DECAY: '60',
    AUTH_THROTTLE_FORGOT_PASSWORD_TEST_OVERRIDE: '1000',
    AUTH_THROTTLE_RESET_MAX: '5',
    AUTH_THROTTLE_RESET_DECAY: '60',
    AUTH_THROTTLE_RESET_PASSWORD_TEST_OVERRIDE: '1000',
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