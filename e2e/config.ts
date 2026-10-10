import { config } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Muat .env untuk mendapatkan E2E_* dan variabel lain
config({ path: path.resolve(__dirname, '../.env') });

export const isCI = !!process.env.CI;

// ==========================================
// APLIKASI
// ==========================================
export const APP_PORT = Number(process.env.E2E_APP_PORT ?? 8000);
export const APP_URL = process.env.E2E_APP_URL ?? `http://127.0.0.1:${APP_PORT}`;

// ==========================================
// DATABASE TESTING
// ==========================================
// Dipakai oleh global-setup.ts untuk menjalankan migrate:fresh & seed
// di database testing yang terpisah dari development.
export const E2E_DB_CONNECTION = process.env.E2E_DB_CONNECTION ?? 'pgsql';
export const E2E_DB_HOST = process.env.E2E_DB_HOST ?? '127.0.0.1';
export const E2E_DB_PORT = Number(process.env.E2E_DB_PORT ?? 5432);
export const E2E_DB_DATABASE = process.env.E2E_DB_DATABASE ?? 'titiktemu_testing';
export const E2E_DB_USERNAME =
    process.env.E2E_DB_USERNAME ?? process.env.DB_USERNAME ?? 'postgres';
export const E2E_DB_PASSWORD =
    process.env.E2E_DB_PASSWORD ?? process.env.DB_PASSWORD ?? '';

// ==========================================
// ENV UNTUK ARTISAN COMMAND
// ==========================================
// Dipakai oleh global-setup.ts untuk menjalankan migrate:fresh, seed, dll.
// Tidak perlu AUTH_THROTTLE_* di sini karena rate limit sudah
// ditangani lewat .env.testing yang dibaca oleh server.
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
};

/**
 * Helper untuk menyusun perintah artisan dengan env testing.
 * Dipakai di global-setup.ts jika diperlukan.
 */
export function artisan(command: string): string {
    const envVars = Object.entries(ARTISAN_ENV)
        .map(([key, value]) => `${key}="${value}"`)
        .join(' ');

    return `${envVars} php artisan ${command}`;
}