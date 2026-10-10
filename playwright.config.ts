// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import {
    isCI,
    APP_PORT,
    APP_URL,
    E2E_DB_DATABASE,
    E2E_DB_CONNECTION,
    E2E_DB_HOST,
    E2E_DB_PORT,
    E2E_DB_USERNAME,
    E2E_DB_PASSWORD,
} from './e2e/config';

// Load .env.testing untuk konfigurasi E2E
loadEnv({ path: path.resolve(process.cwd(), '.env.testing') });

// ==========================================
// WORKERS & TIMEOUT
// ==========================================
const WORKERS = 1;

const TEST_TIMEOUT = isCI ? 90_000 : 60_000;
const ACTION_TIMEOUT = isCI ? 20_000 : 10_000;
const NAV_TIMEOUT = isCI ? 30_000 : 15_000;
const EXPECT_TIMEOUT = isCI ? 20_000 : 10_000;

// ==========================================
// AUTH THROTTLE — DEFAULT UNTUK TESTING
// ==========================================
// Nilai-nilai ini bisa di-override via env (misal untuk test rate limiting).
// Jika tidak di-set, gunakan default yang "longgar" agar test fungsional
// tidak ter-throttle.
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
// KONFIGURASI UTAMA
// ==========================================
export default defineConfig({
    // 1. DIREKTORI & POLA TEST
    testDir: 'e2e',
    testMatch: /(.+\.)?(test|spec)\.[jt]s/,
    testIgnore: ['**/node_modules/**', '**/dist/**', '**/build/**',],

    // 2. GLOBAL SETUP — migrate:fresh + seed + cache:clear
    // Dijalankan per-shard (setiap shard punya DB sendiri)
    globalSetup: './e2e/global-setup.ts',

    // 3. TIMEOUT
    timeout: TEST_TIMEOUT,
    globalTimeout: 45 * 60_000,
    expect: { timeout: EXPECT_TIMEOUT },

    // 4. EKSEKUSI
    fullyParallel: false,
    forbidOnly: isCI,
    retries: isCI ? 1 : 0,
    workers: WORKERS,

    // 5. FAIL FAST
    // Dinaikkan dari 3 → 10 agar tidak stop terlalu cepat saat debug.
    // Set ke 0 untuk disable fail-fast sepenuhnya.
    maxFailures: isCI ? 10 : 0,

    // 6. REPORTER
    reporter: isCI
        ? [
              ['github'],
              ['html', { open: 'never' }],
              ['list'],
          ]
        : [
              ['html', { open: 'on-failure' }],
              ['list'],
          ],

    // 7. OUTPUT ARTIFACT
    outputDir: 'test-results/',

    // 8. PENGATURAN GLOBAL
    use: {
        baseURL: APP_URL,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        actionTimeout: ACTION_TIMEOUT,
        navigationTimeout: NAV_TIMEOUT,
        locale: 'id-ID',
        timezoneId: 'UTC',
        ignoreHTTPSErrors: true,
    },

    // 9. AUTO-START SERVER
    // Port otomatis: 8000 + SHARD_INDEX (0 → 8000, 1 → 8001, 2 → 8002)
    // DB otomatis: titiktemu_db_testing_w{SHARD_INDEX}
    webServer: {
        command: `php -S 127.0.0.1:${APP_PORT} -t public`,
        port: APP_PORT,
        reuseExistingServer: !isCI,
        timeout: 120_000,
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