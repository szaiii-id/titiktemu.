// e2e/global-setup.ts
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    ARTISAN_ENV,
    E2E_DB_DATABASE,
    E2E_DB_HOST,
    E2E_DB_PORT,
    E2E_DB_USERNAME,
    E2E_DB_PASSWORD,
} from './config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

/**
 * Global setup untuk Playwright.
 *
 * Dijalankan sekali PER SHARD (karena setiap shard punya proses Playwright sendiri).
 *
 * 1. Pastikan database shard ada (buat jika belum).
 * 2. migrate:fresh
 * 3. db:seed
 * 4. cache:clear & config:clear
 */
export default async function globalSetup() {
    console.log(`\n[E2E] Menyiapkan database: ${E2E_DB_DATABASE}`);

    // 1. Buat database jika belum ada
    createDatabaseIfNotExists();

    const envString = Object.entries(ARTISAN_ENV)
        .map(([key, value]) => `${key}=${shellEscape(value)}`)
        .join(' ');

    // 2. Migrate fresh + seed
    runArtisan('migrate:fresh', envString, 'Migrasi database...', {
        force: true,
    });
    runArtisan('db:seed', envString, 'Mengisi seed data...', { force: true });

    // 3. Clear cache
    runArtisan('cache:clear', envString, 'Membersihkan cache...');
    runArtisan('config:clear', envString, 'Membersihkan config cache...');

    console.log(
        `\n[E2E] Database ${E2E_DB_DATABASE} siap. Semua test dimulai dari kondisi bersih.\n`,
    );
}

/**
 * Buat database jika belum ada (idempotent).
 * Di CI, DB shard belum tentu di-create manual — ini handle otomatis.
 * Di lokal, kalau `psql` tidak tersedia, akan di-skip dengan warning.
 */
function createDatabaseIfNotExists(): void {
    const checkSql = `SELECT 1 FROM pg_database WHERE datname = '${E2E_DB_DATABASE}'`;
    const createSql = `CREATE DATABASE "${E2E_DB_DATABASE}" OWNER "${E2E_DB_USERNAME}"`;

    try {
        const result = execSync(
            `PGPASSWORD="${E2E_DB_PASSWORD}" psql -h ${E2E_DB_HOST} -p ${E2E_DB_PORT} -U ${E2E_DB_USERNAME} -d postgres -tAc "${checkSql}"`,
            { encoding: 'utf-8' },
        ).trim();

        if (result !== '1') {
            console.log(`[E2E] Membuat database ${E2E_DB_DATABASE}...`);
            execSync(
                `PGPASSWORD="${E2E_DB_PASSWORD}" psql -h ${E2E_DB_HOST} -p ${E2E_DB_PORT} -U ${E2E_DB_USERNAME} -d postgres -c "${createSql}"`,
                { stdio: 'inherit' },
            );
        } else {
            console.log(`[E2E] Database ${E2E_DB_DATABASE} sudah ada.`);
        }
    } catch (error) {
        // Kalau psql tidak ada, atau DB sudah ada, skip
        console.warn(
            `[E2E] Skip createDatabaseIfNotExists: ${(error as Error).message}`,
        );
    }
}

/**
 * Menjalankan perintah artisan dengan environment testing.
 */
function runArtisan(
    command: string,
    envString: string,
    message: string,
    options: { force?: boolean } = {},
): void {
    const { force = false } = options;
    const forceFlag = force ? ' --force' : '';

    try {
        console.log(`[E2E] ${message}`);
        execSync(`${envString} php artisan ${command}${forceFlag}`, {
            cwd: PROJECT_ROOT,
            stdio: 'inherit',
            env: { ...process.env, ...ARTISAN_ENV },
        });
    } catch (error) {
        console.error(`[E2E] Gagal menjalankan: php artisan ${command}`);
        console.error(error);
        process.exit(1);
    }
}

/**
 * Escape nilai agar aman dipakai di shell command.
 */
function shellEscape(value: string): string {
    return `"${value.replace(/"/g, '\\"')}"`;
}