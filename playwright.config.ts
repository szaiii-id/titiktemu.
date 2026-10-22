// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import {
    isCI,
    SHARD_INDEX,
    TOTAL_SHARDS,          // ✅ BARU: untuk timeout adaptif
    APP_PORT,
    APP_URL,
    E2E_DB_DATABASE,
    E2E_DB_CONNECTION,
    E2E_DB_HOST,
    E2E_DB_PORT,
    E2E_DB_USERNAME,
    E2E_DB_PASSWORD,
    SHARD_STORAGE_PATH,
} from './e2e/config';

// Load .env.testing untuk konfigurasi E2E
loadEnv({
    path: path.resolve(process.cwd(), '.env.testing'),
    override: false,
});

// ==========================================
// WORKERS — SELALU 1 PER PROSES
// ==========================================
const WORKERS = 1;

// ==========================================
// TIMEOUT ADAPTIF — PROPORSIONAL JUMLAH SHARD
// ==========================================
/**
 * Kenapa adaptif?
 *
 * 8 shard paralel di 1 mesin → CPU & RAM terbagi 8 → setiap
 * `php -S` (single-threaded) melayani lebih lambat → jendela
 * race hydration, search debounce, dan navigasi melebar.
 *
 * Timeout statis (10–15 detik) cukup saat 1-per-1, TAPI tidak
 * cukup saat 8 shard paralel. Akibatnya muncul error acak:
 * - `Received: ""` (search input kosong — hydration belum siap)
 * - `page.goto` timeout (landing page berat)
 * - `locator.click` timeout (tab filter belum render)
 *
 * Solusi: naikkan timeout proporsional jumlah shard.
 * - ≤4 shard: timeout normal (mesin masih lega)
 * - >4 shard: timeout naik ~50% (mesin sibuk)
 */
const isHeavyLoad = TOTAL_SHARDS > 4;

const TEST_TIMEOUT = isCI ? 90_000 : 60_000;

const ACTION_TIMEOUT = isCI
    ? (isHeavyLoad ? 30_000 : 20_000)
    : (isHeavyLoad ? 20_000 : 10_000);

const NAV_TIMEOUT = isCI
    ? (isHeavyLoad ? 45_000 : 30_000)
    : (isHeavyLoad ? 30_000 : 15_000);

const EXPECT_TIMEOUT = isCI
    ? (isHeavyLoad ? 30_000 : 20_000)
    : (isHeavyLoad ? 20_000 : 10_000);

// ==========================================
// OUTPUT DIR & REPORT DIR — ISOLASI PER SHARD
// ==========================================
const SHARD_OUTPUT_DIR = `test-results/shard-${SHARD_INDEX}`;
const SHARD_REPORT_DIR = `playwright-report/shard-${SHARD_INDEX}`;

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

    CONTACT_TEST_OVERRIDE:
        process.env.AUTH_THROTTLE_CONTACT_TEST_OVERRIDE ?? '1000',
};

// ==========================================
// KONFIGURASI UTAMA
// ==========================================
export default defineConfig({
    // 1. DIREKTORI & POLA TEST
    testDir: 'e2e',
    testMatch: /(.+\.)?(test|spec)\.[jt]s/,
    testIgnore: ['**/node_modules/**', '**/dist/**', '**/build/**'],

    // 2. GLOBAL SETUP — migrate:fresh + seed + health-check /_test/* per shard
    globalSetup: './e2e/global-setup.ts',

    // 3. TIMEOUT — adaptif per jumlah shard
    timeout: TEST_TIMEOUT,
    globalTimeout: 45 * 60_000,
    expect: { timeout: EXPECT_TIMEOUT },

    // 4. EKSEKUSI — KUNCI: workers 1, fullyParallel false
    fullyParallel: false,
    forbidOnly: isCI,
    retries: isCI ? 1 : 0,
    workers: WORKERS,

    // 5. FAIL FAST
    maxFailures: isCI ? 10 : 0,

    // 6. REPORTER — ✅ ISOLASI PER SHARD
    reporter: isCI
        ? [
              ['github'],
              ['html', { open: 'never', outputFolder: SHARD_REPORT_DIR }],
              ['list'],
          ]
        : [
              ['html', { open: 'on-failure', outputFolder: SHARD_REPORT_DIR }],
              ['list'],
          ],

    // 7. OUTPUT ARTIFACT — ✅ ISOLASI PER SHARD
    outputDir: SHARD_OUTPUT_DIR,

    // 8. PENGATURAN GLOBAL
    use: {
        baseURL: APP_URL,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        actionTimeout: ACTION_TIMEOUT,
        navigationTimeout: NAV_TIMEOUT,
        locale: 'id-ID',
        timezoneId: 'UTC',
        ignoreHTTPSErrors: true,
    },

    // 9. AUTO-START SERVER — port per shard (8000 + SHARD_INDEX)
    webServer: {
        // ✅ `-d variables_order=EGPCS` — pastikan $_ENV terisi
        //    (best practice; Laravel baca $_SERVER jadi tetap aman
        //    meski tanpa ini, tapi ini eksplisit & konsisten).
        command: `php -d variables_order=EGPCS -S 127.0.0.1:${APP_PORT} -t public`,
        port: APP_PORT,
        reuseExistingServer: false,
        gracefulShutdown: {
            signal: 'SIGTERM',
            timeout: 5_000,
        },
        // ✅ Naikkan timeout webServer — 8 shard start bersamaan
        //    butuh waktu lebih lama untuk bind port + siap.
        timeout: 180_000,
        stdout: 'pipe',
        stderr: 'pipe',
        env: {
            ...process.env,
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

            // ✅ FIX RACE: Web server (php -S) pakai storage shard ini.
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

            AUTH_THROTTLE_CONTACT_TEST_OVERRIDE:
                AUTH_THROTTLE.CONTACT_TEST_OVERRIDE,
        },
    },

    // 10. PROJECTS
    projects: isCI
        ? [
              { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
              { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
              { name: 'webkit', use: { ...devices['Desktop Safari'] } },
          ]
        : [
              {
                  name: 'Brave',
                  use: {
                      ...devices['Desktop Chrome'],
                      headless: false,
                      launchOptions: {
                          executablePath: '/usr/bin/brave',
                          args: [
                              '--disable-blink-features=AutomationControlled',
                              '--no-first-run',
                              '--no-default-browser-check',
                              '--disable-infobars',
                              '--disable-notifications',
                              '--disable-popup-blocking',
                          ],
                      },
                  },
              },
          ],
});