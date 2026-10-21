// e2e/global-setup.ts
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import {
    APP_URL,
    APP_PORT,
    SHARD_INDEX,
    ARTISAN_ENV,
    E2E_DB_DATABASE,
    E2E_DB_HOST,
    E2E_DB_PORT,
    E2E_DB_USERNAME,
    E2E_DB_PASSWORD,
    SHARD_STORAGE_PATH,
} from './config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// ==========================================
// KONFIGURASI HEALTH-CHECK
// ==========================================
const TEST_ROUTE_HEALTHCHECK = {
    path: '/_test/find-package',
    // Kode yang pasti tidak ada — kita hanya peduli status BUKAN 404
    // (200/422/419 semua OK — yang penting route terdaftar)
    body: { kode: '__healthcheck__' },
    maxAttempts: 10,
    intervalMs: 500,
    timeoutMs: 3_000, // per request
} as const;

/**
 * Global setup untuk Playwright.
 *
 * Dijalankan sekali PER SHARD (karena setiap shard punya proses Playwright sendiri).
 *
 * Urutan:
 * 1. ✅ Setup storage shard (`storage/shard-N/`) — isolasi dari shard lain.
 * 2. Pastikan database shard ada (buat jika belum).
 * 3. migrate:fresh
 * 4. db:seed
 * 5. ✅ Health-check `/_test/*` — gagal cepat jika route tidak terdaftar
 *    (APP_ENV salah, port zombie, dll).
 *
 * ⚠️ FIX RACE: Tidak ada `cache:clear` / `config:clear` — itu menulis
 * ke `bootstrap/cache/` yang SHARED antar shard → race.
 * `SESSION_DRIVER=database` → session per-shard DB, tidak perlu
 * clear file session.
 */
export default async function globalSetup() {
    const shardLabel = `shard-${SHARD_INDEX} (port ${APP_PORT})`;

    console.log(`\n[E2E] ═══════════════════════════════════════════════`);
    console.log(`[E2E] Menyiapkan ${shardLabel}`);
    console.log(`[E2E] Storage: ${SHARD_STORAGE_PATH}`);
    console.log(`[E2E] Database: ${E2E_DB_DATABASE}`);
    console.log(`[E2E] ═══════════════════════════════════════════════\n`);

    // ✅ FIX RACE: Setup storage shard DULU sebelum apapun
    ensureShardStorage();

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

    // 3. ✅ Health-check `/_test/*` — gagal cepat jika route tidak terdaftar.
    //
    // Kenapa: `e2e-shard.ts` sudah cek `/up` (server hidup), tapi `/up`
    // SELALU ada — tidak membuktikan `/_test/*` terdaftar. Jika `APP_ENV`
    // bukan `testing`, `bootstrap/app.php` tidak daftarkan `web-testing.php`
    // → `/_test/*` 404 → test gagal acak di tengah.
    //
    // Health-check ini memastikan route `/_test/*` benar-benar siap
    // SEBELUM test jalan. Jika 404 setelah retry → gagal cepat dengan
    // pesan jelas.
    await waitForTestRoutes(shardLabel);

    console.log(
        `\n[E2E] ✅ ${shardLabel} siap ` +
        `(DB + storage + route /_test/*).\n`,
    );
}

// ==========================================
// HEALTH-CHECK: PASTIKAN /_test/* TERDAFTAR
// ==========================================

/**
 * Poll `POST /_test/find-package` sampai status BUKAN 404.
 *
 * Status yang dianggap "route terdaftar":
 * - 200: package ditemukan (tidak mungkin untuk kode healthcheck)
 * - 422: validasi gagal (route terdaftar, tapi body tidak valid)
 * - 419: CSRF token invalid (route terdaftar, tapi CSRF)
 * - 500: error server (route terdaftar, tapi ada bug)
 *
 * Status yang dianggap "route TIDAK terdaftar":
 * - 404 dengan HTML <!DOCTYPE html> — route tidak ada
 *
 * Jika setelah `maxAttempts` masih 404 → throw Error dengan
 * diagnosis lengkap.
 */
async function waitForTestRoutes(shardLabel: string): Promise<void> {
    const url = `${APP_URL}${TEST_ROUTE_HEALTHCHECK.path}`;
    const { maxAttempts, intervalMs, timeoutMs } = TEST_ROUTE_HEALTHCHECK;

    console.log(`[E2E] Health-check route /_test/*...`);
    console.log(`[E2E]   URL: POST ${url}`);

    let lastStatus: number | null = null;
    let lastBody: string = '';

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(TEST_ROUTE_HEALTHCHECK.body),
                signal: controller.signal,
            });

            clearTimeout(timer);

            lastStatus = response.status;

            // ✅ Route terdaftar jika status BUKAN 404.
            //   404 = route tidak ada (APP_ENV salah, web-testing.php
            //   tidak di-load, atau port zombie).
            if (response.status !== 404) {
                console.log(
                    `[E2E]   ✅ Route /_test/* terdaftar ` +
                    `(HTTP ${response.status}, attempt ${attempt}/${maxAttempts})`,
                );
                return;
            }

            // 404 — cek body: HTML generik = route tidak ada
            lastBody = await response.text().catch(() => '');

            if (attempt < maxAttempts) {
                console.log(
                    `[E2E]   ⏳ 404 (attempt ${attempt}/${maxAttempts}), ` +
                    `retry dalam ${intervalMs}ms...`,
                );
                await sleep(intervalMs);
            }
        } catch (error) {
            // Network error (server belum siap / port belum bind)
            const err = error as Error;
            lastStatus = null;

            if (err.name === 'AbortError') {
                console.log(
                    `[E2E]   ⏳ Timeout ${timeoutMs}ms ` +
                    `(attempt ${attempt}/${maxAttempts}), retry...`,
                );
            } else {
                console.log(
                    `[E2E]   ⏳ Network error: ${err.message} ` +
                    `(attempt ${attempt}/${maxAttempts}), retry...`,
                );
            }

            if (attempt < maxAttempts) {
                await sleep(intervalMs);
            }
        }
    }

    // ❌ Gagal setelah semua retry — diagnosis lengkap
    const isHtml404 = lastBody.includes('<!DOCTYPE html>') || lastBody.includes('<html');

    throw new Error(
        `\n` +
        `═══════════════════════════════════════════════════════════\n` +
        `❌ HEALTH-CHECK GAGAL: /_test/* tidak terdaftar di ${shardLabel}\n` +
        `═══════════════════════════════════════════════════════════\n` +
        `\n` +
        `URL: POST ${url}\n` +
        `Status terakhir: ${lastStatus ?? 'network error'}\n` +
        `Body: ${isHtml404 ? 'HTML 404 generik (route tidak terdaftar)' : lastBody.slice(0, 200)}\n` +
        `\n` +
        `Kemungkinan penyebab:\n` +
        `  1. APP_ENV bukan 'testing' di server shard ini\n` +
        `     → bootstrap/app.php tidak load routes/web-testing.php\n` +
        `     → cek webServer.env di playwright.config.ts\n` +
        `\n` +
        `  2. Port ${APP_PORT} dipakai proses lain (zombie php -S)\n` +
        `     → cek: lsof -i:${APP_PORT}\n` +
        `     → kill: kill -9 <pid>\n` +
        `\n` +
        `  3. Storage shard tidak writable\n` +
        `     → cek: ls -la ${SHARD_STORAGE_PATH}\n` +
        `\n` +
        `  4. Route cache basi (jarang — sudah di-clear di global-setup)\n` +
        `     → cek: ls bootstrap/cache/routes-*.php\n` +
        `\n` +
        `Debug manual:\n` +
        `  curl -i -X POST ${url} \\\n` +
        `    -H "Content-Type: application/json" \\\n` +
        `    -d '${JSON.stringify(TEST_ROUTE_HEALTHCHECK.body)}'\n` +
        `═══════════════════════════════════════════════════════════\n`,
    );
}

// ==========================================
// STORAGE SHARD
// ==========================================

/**
 * ✅ FIX RACE: Buat struktur folder `storage/shard-N/`.
 *
 * Ini penting supaya Laravel 13 (via `LARAVEL_STORAGE_PATH`) bisa
 * menulis:
 * - storage/shard-N/framework/views/    → compiled Blade
 * - storage/shard-N/framework/cache/    → file cache
 * - storage/shard-N/framework/sessions/ → session file (kalau pakai file)
 * - storage/shard-N/logs/               → laravel.log
 *
 * Tanpa ini, `storage_path()` di Laravel akan return path yang belum
 * ada → error "file_put_contents(): failed to open stream".
 */
function ensureShardStorage(): void {
    const dirs = [
        'app',
        'framework/cache',
        'framework/cache/data',
        'framework/sessions',
        'framework/views',
        'logs',
    ];

    for (const dir of dirs) {
        const fullPath = path.join(SHARD_STORAGE_PATH, dir);
        fs.mkdirSync(fullPath, { recursive: true });
    }

    console.log(`[E2E] Storage shard dibuat: ${SHARD_STORAGE_PATH}`);
}

// ==========================================
// DATABASE
// ==========================================

/**
 * Buat database jika belum ada (idempotent).
 *
 * ✅ Best practice: throw error jika gagal, jangan silent skip.
 * Silent skip → migrate:fresh jalan di DB yang tidak ada → error
 * membingungkan jauh di bawah.
 */
function createDatabaseIfNotExists(): void {
    const checkSql = `SELECT 1 FROM pg_database WHERE datname = '${E2E_DB_DATABASE}'`;
    const createSql = `CREATE DATABASE "${E2E_DB_DATABASE}" OWNER "${E2E_DB_USERNAME}"`;

    try {
        const result = execSync(
            `PGPASSWORD="${E2E_DB_PASSWORD}" psql -h ${E2E_DB_HOST} -p ${E2E_DB_PORT} -U ${E2E_DB_USERNAME} -d postgres -tAc "${checkSql}"`,
            { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] },
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
        // ✅ FIX: throw, bukan warn — agar gagal cepat dengan pesan jelas
        throw new Error(
            `[E2E] Gagal cek/buat database ${E2E_DB_DATABASE}: ` +
            `${(error as Error).message}\n` +
            `Pastikan PostgreSQL berjalan di ${E2E_DB_HOST}:${E2E_DB_PORT} ` +
            `dan user "${E2E_DB_USERNAME}" punya izin CREATEDB.`,
        );
    }
}

// ==========================================
// ARTISAN
// ==========================================

/**
 * Menjalankan perintah artisan dengan environment testing.
 *
 * ✅ Best practice: throw error (bukan process.exit) — agar Playwright
 * bisa cleanup dan menampilkan error yang rapi.
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
        // ✅ FIX: throw, bukan process.exit — biarkan Playwright handle
        throw new Error(
            `[E2E] Gagal menjalankan: php artisan ${command}\n` +
            `Error: ${(error as Error).message}\n` +
            `Cek log di atas untuk detail.`,
        );
    }
}

// ==========================================
// SHELL HELPER
// ==========================================

/**
 * Escape nilai agar aman dipakai di shell command.
 */
function shellEscape(value: string): string {
    return `"${value.replace(/"/g, '\\"')}"`;
}