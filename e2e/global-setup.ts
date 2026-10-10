import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARTISAN_ENV, E2E_DB_DATABASE } from './config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

/**
 * Global setup untuk Playwright.
 *
 * Dijalankan sekali sebelum semua test, untuk:
 * 1. Memastikan database testing ada dan bersih.
 * 2. Menjalankan migrasi terbaru.
 * 3. Mengisi seed user (admin, mitra, client).
 * 4. Membersihkan cache (rate limiter, session, dll).
 *
 * Dengan begitu, setiap kali E2E dijalankan, kondisi awal selalu konsisten.
 */
export default async function globalSetup() {
    console.log('\n[E2E] Menyiapkan database testing...');
    console.log(`[E2E] Database: ${E2E_DB_DATABASE}`);
    console.log(`[E2E] Cache: dibersihkan setelah migrasi\n`);

    const envString = Object.entries(ARTISAN_ENV)
        .map(([key, value]) => `${key}=${shellEscape(value)}`)
        .join(' ');

    // 1. migrate:fresh — butuh --force karena destruktif
    runArtisan('migrate:fresh', envString, 'Migrasi database...', {
        force: true,
    });

    // 2. db:seed — butuh --force agar tidak minta konfirmasi di production env
    runArtisan('db:seed', envString, 'Mengisi seed data...', {
        force: true,
    });

    // 3. cache:clear — tidak butuh --force
    runArtisan('cache:clear', envString, 'Membersihkan cache...');

    // 4. config:clear — tidak butuh --force
    runArtisan('config:clear', envString, 'Membersihkan config cache...');

    console.log('\n[E2E] Database testing siap. Semua test akan dimulai dari kondisi bersih.\n');
}

/**
 * Menjalankan perintah artisan dengan environment testing.
 *
 * @param command  Perintah artisan, misalnya "migrate:fresh"
 * @param envString  String environment yang akan di-prefix
 * @param message  Pesan yang ditampilkan sebelum menjalankan
 * @param options  Opsi tambahan:
 *                 - force: tambahkan flag --force (untuk perintah destruktif)
 */
function runArtisan(
    command: string,
    envString: string,
    message: string,
    options: { force?: boolean } = {}
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