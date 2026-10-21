#!/usr/bin/env bun
/**
 * Runner E2E Sharding — N proses paralel.
 *
 * Setiap shard punya:
 * - Proses Playwright sendiri
 * - Web server sendiri (port 8000 + shardIndex) — dari webServer config
 * - Database sendiri (titiktemu_db_testing_w{shardIndex}) — dari e2e/config.ts
 * - Browser sendiri
 *
 * Hasil: N browser terbuka paralel, N DB terpisah, 0 race condition.
 *
 * Cara pakai:
 *   bun scripts/e2e-shard.ts                     # default 4 shard
 *   TOTAL_SHARDS=8 bun scripts/e2e-shard.ts      # 8 shard
 *   SHARD_FILTER=admin bun scripts/e2e-shard.ts  # filter file
 *   SKIP_CLEANUP=true bun scripts/e2e-shard.ts   # skip cleanup server lama
 *   SKIP_HEALTHCHECK=true bun scripts/e2e-shard.ts # skip health-check
 */

import { spawn, execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

// ==========================================
// KONFIGURASI
// ==========================================
const TOTAL_SHARDS = Number(process.env.TOTAL_SHARDS ?? 4);
const SHARD_FILTER = process.env.SHARD_FILTER ?? '';
const SKIP_CLEANUP = process.env.SKIP_CLEANUP === 'true';
const SKIP_HEALTHCHECK = process.env.SKIP_HEALTHCHECK === 'true';

const BASE_PORT = 8000;
const STARTUP_STAGGER_MS = 300; // jeda antar spawn shard
const PORT_FREE_TIMEOUT_MS = 5_000; // max tunggu port bebas
const HEALTHCHECK_TIMEOUT_MS = 60_000; // max tunggu server siap
const HEALTHCHECK_INTERVAL_MS = 500;

// ==========================================
// VALIDASI
// ==========================================
if (!Number.isInteger(TOTAL_SHARDS) || TOTAL_SHARDS < 1) {
    console.error(`❌ TOTAL_SHARDS harus integer >= 1, dapat: ${TOTAL_SHARDS}`);
    process.exit(1);
}

if (TOTAL_SHARDS > 32) {
    console.warn(
        `⚠️  TOTAL_SHARDS=${TOTAL_SHARDS} sangat besar. ` +
        `Pastikan CPU & RAM cukup (1 shard ≈ 1 browser + 1 php -S).`,
    );
}

// ==========================================
// HELPER: PORT & PROSES
// ==========================================

/**
 * Cek apakah port sedang dipakai. Return PID atau null.
 * Menggunakan `lsof` (Linux/macOS). Fallback ke `ss` jika perlu.
 */
function getPidOnPort(port: number): number | null {
    try {
        const out = execSync(`lsof -ti:${port}`, {
            encoding: 'utf-8',
            stdio: ['ignore', 'pipe', 'ignore'],
        }).trim();

        if (!out) return null;

        // lsof bisa return multiple PID (newline-separated) — ambil yang pertama
        const firstLine = out.split('\n')[0].trim();
        const pid = Number(firstLine);
        return Number.isInteger(pid) && pid > 0 ? pid : null;
    } catch {
        // lsof return exit 1 jika tidak ada proses — bukan error
        return null;
    }
}

/**
 * Kill proses berdasarkan PID. Return true jika berhasil.
 */
function killPid(pid: number, signal: NodeJS.Signals = 'SIGKILL'): boolean {
    try {
        process.kill(pid, signal);
        return true;
    } catch {
        return false;
    }
}

/**
 * Tunggu sampai port bebas (tidak ada proses). Return true jika bebas.
 */
async function waitPortFree(
    port: number,
    timeoutMs: number,
): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        if (getPidOnPort(port) === null) return true;
        await sleep(200);
    }

    return false;
}

/**
 * Health-check: pastikan server di port melayani request.
 * Return true jika server merespons (status apa pun selain 0).
 */
async function waitServerReady(
    port: number,
    timeoutMs: number,
): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    const url = `http://127.0.0.1:${port}/up`; // Laravel health endpoint

    while (Date.now() < deadline) {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 2_000);

            const response = await fetch(url, {
                method: 'GET',
                signal: controller.signal,
            });

            clearTimeout(timer);

            // Server merespons (200/404/500 semua OK — yang penting hidup)
            if (response.status > 0) return true;
        } catch {
            // Server belum siap — retry
        }

        await sleep(HEALTHCHECK_INTERVAL_MS);
    }

    return false;
}

// ==========================================
// CLEANUP SERVER LAMA (PER PORT)
// ==========================================
/**
 * Best practice: kill PER PORT yang akan dipakai, bukan pkill luas.
 *
 * Kenapa:
 * - `pkill -f "php -S 127.0.0.1:80"` cocok dengan 8000–8099 — bisa
 *   membunuh server shard lain yang sedang jalan (jika ada).
 * - Kill per port presisi: hanya port yang akan kita pakai.
 * - Verifikasi port bebas setelah kill — gagal cepat jika masih dipakai.
 */
if (!SKIP_CLEANUP) {
    console.log(`🧹 Membersihkan server lama di port ${BASE_PORT}-${BASE_PORT + TOTAL_SHARDS - 1}...`);

    let killedCount = 0;

    for (let i = 0; i < TOTAL_SHARDS; i++) {
        const port = BASE_PORT + i;
        const pid = getPidOnPort(port);

        if (pid !== null) {
            console.log(`  [port ${port}] Kill PID ${pid}`);
            if (killPid(pid, 'SIGKILL')) {
                killedCount++;
            } else {
                console.warn(`  [port ${port}] ⚠️  Gagal kill PID ${pid} (permission?)`);
            }
        }
    }

    // Tunggu semua port bebas (dengan timeout)
    console.log('  Menunggu port bebas...');

    for (let i = 0; i < TOTAL_SHARDS; i++) {
        const port = BASE_PORT + i;
        const free = await waitPortFree(port, PORT_FREE_TIMEOUT_MS);

        if (!free) {
            const pid = getPidOnPort(port);
            console.error(
                `❌ Port ${port} masih dipakai (PID ${pid ?? '?'}) setelah ${PORT_FREE_TIMEOUT_MS}ms.`,
            );
            console.error(
                `   Cek manual: lsof -i:${port}\n` +
                `   Atau kill manual: kill -9 ${pid ?? '<pid>'}`,
            );
            process.exit(1);
        }
    }

    console.log(`✅ Cleanup selesai (${killedCount} proses di-kill, semua port bebas).\n`);
} else {
    console.log('⏭️  SKIP_CLEANUP=true — lewati cleanup.\n');
}

// ==========================================
// HEADER
// ==========================================
console.log('');
console.log('='.repeat(60));
console.log(`🚀 E2E Sharding — ${TOTAL_SHARDS} shard paralel`);
console.log(`   Filter: ${SHARD_FILTER || '(semua file)'}`);
console.log(`   Base port: ${BASE_PORT} - ${BASE_PORT + TOTAL_SHARDS - 1}`);
console.log('='.repeat(60));
console.log('');

// Debug: konfirmasi TOTAL_SHARDS terbaca di parent
console.log(`[parent] TOTAL_SHARDS=${TOTAL_SHARDS}, PID=${process.pid}`);
console.log('');

// ==========================================
// SPAWN SHARDS (DENGAN STAGGER)
// ==========================================
/**
 * Best practice: stagger spawn — jangan 8 proses sekaligus.
 *
 * Kenapa:
 * - 8 `php -S` bind port bersamaan → CPU spike → binding lambat
 * - 8 browser spawn bersamaan → RAM spike → OOM
 * - Stagger 300ms → beban merata → start lebih stabil
 */
type ShardProc = {
    index: number;
    port: number;
    startedAt: number;
    proc: ReturnType<typeof spawn>;
};

const procs: ShardProc[] = [];

for (let i = 0; i < TOTAL_SHARDS; i++) {
    const port = BASE_PORT + i;

    const args = [
        'playwright',
        'test',
        `--shard=${i + 1}/${TOTAL_SHARDS}`,
        '--reporter=list',
    ];

    if (SHARD_FILTER) {
        args.push(SHARD_FILTER);
    }

    console.log(
        `[shard-${i}] SHARD_INDEX=${i}, port=${port}`,
    );

    // ✅ Pakai `bun x` langsung (bukan `bunx`) — env PASTI diteruskan
    const proc = spawn('bun', ['x', ...args], {
        env: {
            ...process.env,
            SHARD_INDEX: String(i),
            TOTAL_SHARDS: String(TOTAL_SHARDS),
        },
        stdio: 'inherit',
        // ❌ shell: true DIHAPUS — ini yang menyebabkan SHARD_INDEX hilang
    });

    // Tangani error spawn (misal bun tidak ada di PATH)
    proc.on('error', (err) => {
        console.error(`[shard-${i}] ❌ Gagal spawn: ${err.message}`);
    });

    procs.push({
        index: i,
        port,
        startedAt: Date.now(),
        proc,
    });

    // Stagger — beri jeda antar spawn
    if (i < TOTAL_SHARDS - 1) {
        await sleep(STARTUP_STAGGER_MS);
    }
}

// ==========================================
// HEALTH-CHECK (OPSIONAL)
// ==========================================
/**
 * Best practice: health-check per shard sebelum menunggu hasil.
 *
 * Kenapa:
 * - Mendeteksi shard yang web server-nya gagal start (port zombie, dll)
 * - Gagal cepat dengan pesan jelas, bukan menunggu 30 menit lalu gagal acak
 *
 * Health endpoint: `/up` (Laravel default) — ringan, tidak butuh auth.
 */
if (!SKIP_HEALTHCHECK) {
    console.log('\n🏥 Health-check per shard...\n');

    const healthResults = await Promise.all(
        procs.map(async ({ index, port }) => {
            const ready = await waitServerReady(port, HEALTHCHECK_TIMEOUT_MS);
            return { index, port, ready };
        }),
    );

    const unhealthy = healthResults.filter((r) => !r.ready);

    if (unhealthy.length > 0) {
        console.error('❌ Shard berikut web server-nya tidak siap:');
        for (const { index, port } of unhealthy) {
            const pid = getPidOnPort(port);
            console.error(
                `   Shard ${index} (port ${port}): ` +
                `PID=${pid ?? 'tidak ada'} — cek log di atas.`,
            );
        }
        console.error(
            '\n💡 Kemungkinan penyebab:\n' +
            '   - Port dipakai proses lain (zombie)\n' +
            '   - php -S gagal start (cek permission storage)\n' +
            '   - APP_ENV salah (route /_test/* tidak terdaftar)\n',
        );
        // Jangan exit — biarkan proses lain selesai, lalu ringkasan
    } else {
        console.log('✅ Semua shard siap.\n');
    }
} else {
    console.log('⏭️  SKIP_HEALTHCHECK=true — lewati health-check.\n');
}

// ==========================================
// TUNGGU HASIL
// ==========================================
const results = await Promise.all(
    procs.map(
        ({ index, startedAt, proc }) =>
            new Promise<{ index: number; code: number | null; duration: number }>(
                (resolve) => {
                    proc.on('exit', (code) => {
                        resolve({
                            index,
                            code,
                            duration: Date.now() - startedAt,
                        });
                    });
                },
            ),
    ),
);

// ==========================================
// RINGKASAN
// ==========================================
console.log('');
console.log('='.repeat(60));
console.log('📊 Ringkasan Hasil Sharding');
console.log('='.repeat(60));

let failed = 0;
let totalDuration = 0;

for (const { index, code, duration } of results) {
    const status = code === 0 ? '✅ PASSED' : '❌ FAILED';
    const seconds = (duration / 1000).toFixed(1);
    console.log(
        `  Shard ${index}: ${status.padEnd(10)} exit=${code}  (${seconds}s)`,
    );
    totalDuration += duration;
    if (code !== 0) failed++;
}

const avgDuration = (totalDuration / results.length / 1000).toFixed(1);

console.log('='.repeat(60));
console.log(`  Total: ${results.length - failed} passed, ${failed} failed`);
console.log(`  Rata-rata durasi per shard: ${avgDuration}s`);
console.log(`  Wall-clock (perkiraan): ~${avgDuration}s`);
console.log('='.repeat(60));

if (failed === 0) {
    console.log('🎉 Semua shard lulus!\n');
} else {
    console.log(`⚠️  ${failed} shard gagal.\n`);
}

process.exit(failed > 0 ? 1 : 0);