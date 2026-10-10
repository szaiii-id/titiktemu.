import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';
import { isCI, APP_PORT, APP_URL } from './e2e/config';

// ==========================================
// WORKERS & TIMEOUT
// ==========================================
const WORKERS = 1;

const TEST_TIMEOUT = isCI ? 90_000 : 60_000;
const ACTION_TIMEOUT = isCI ? 20_000 : 10_000;
const NAV_TIMEOUT = isCI ? 30_000 : 15_000;
const EXPECT_TIMEOUT = isCI ? 20_000 : 10_000;

// ==========================================
// KONFIGURASI UTAMA
// ==========================================
export default defineConfig({
    // 1. DIREKTORI & POLA TEST
    testDir: 'e2e',
    testMatch: /(.+\.)?(test|spec)\.[jt]s/,
    testIgnore: ['**/node_modules/**', '**/dist/**', '**/build/**'],

    // 2. GLOBAL SETUP — migrate:fresh + seed + cache:clear
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
    maxFailures: isCI ? 3 : 0,

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
    // Menggunakan `php -S` langsung dengan APP_ENV=testing agar
    // Laravel membaca .env.testing dan semua konfigurasi testing berlaku.
    webServer: {
        command: `APP_ENV=testing php -S 127.0.0.1:${APP_PORT} -t public`,
        port: APP_PORT,
        reuseExistingServer: !isCI,
        timeout: 120_000,
        stdout: 'pipe',
        stderr: 'pipe',
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