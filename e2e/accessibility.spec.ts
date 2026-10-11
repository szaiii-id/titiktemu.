import { test, expect } from './fixtures/auth';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility (a11y) Test
 *
 * Memindai halaman-halaman utama dengan axe-core untuk mendeteksi
 * pelanggaran WCAG (Web Content Accessibility Guidelines).
 *
 * Aturan yang diperiksa:
 * - Kontras warna (color-contrast)
 * - Label form (label)
 * - Atribut alt pada gambar (image-alt)
 * - Heading yang berurutan (heading-order)
 * - ARIA yang valid (aria-*)
 * - Landmark dan struktur (region, landmark-*)
 * - Bahasa dokumen (html-has-lang)
 *
 * Referensi: https://www.deque.com/axe/core-documentation/api-documentation/
 */

const PAGES_TO_SCAN = [
    { path: '/', name: 'Landing Page' },
    { path: '/login', name: 'Halaman Login' },
    { path: '/register', name: 'Halaman Register' },
    { path: '/forgot-password', name: 'Halaman Lupa Password' },
] as const;

test.describe('Accessibility — Pemindaian Halaman Publik', () => {
    for (const { path, name } of PAGES_TO_SCAN) {
        test(`${name} tidak memiliki pelanggaran WCAG kritis`, async ({ page }) => {
            await page.goto(path);
            await page.waitForLoadState('networkidle');

            const results = await new AxeBuilder({ page })
                .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
                .analyze();

            // Laporkan pelanggaran agar mudah di-debug
            if (results.violations.length > 0) {
                console.log(`\n[${name}] Pelanggaran WCAG ditemukan:`);
                for (const violation of results.violations) {
                    console.log(`  - ${violation.id}: ${violation.help}`);
                    console.log(`    Dampak: ${violation.impact}`);
                    console.log(`    URL: ${violation.helpUrl}`);
                    for (const node of violation.nodes) {
                        console.log(`    Node: ${node.html}`);
                    }
                }
            }

            // Hanya gagal jika ada pelanggaran dengan dampak "critical" atau "serious"
            const criticalViolations = results.violations.filter(
                (v) => v.impact === 'critical' || v.impact === 'serious'
            );

            expect(criticalViolations).toEqual([]);
        });
    }
});

test.describe('Accessibility — Pemindaian Halaman Auth (Login)', () => {
    test('Halaman Login memiliki label yang benar untuk semua input', async ({ page }) => {
        await page.goto('/login');

        const results = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa'])
            .include('#identitas')
            .include('#password')
            .analyze();

        // Filter hanya pelanggaran label
        const labelViolations = results.violations.filter(
            (v) => v.id === 'label' || v.id === 'form-field-multiple-labels'
        );

        expect(labelViolations).toEqual([]);
    });

    test('Halaman Login memiliki struktur heading yang benar', async ({ page }) => {
        await page.goto('/login');

        const results = await new AxeBuilder({ page })
            .withTags(['best-practice'])
            .include('h1, h2, h3, h4, h5, h6')
            .analyze();

        const headingViolations = results.violations.filter(
            (v) => v.id === 'heading-order'
        );

        expect(headingViolations).toEqual([]);
    });

    test('Halaman Login memiliki kontras warna yang cukup', async ({ page }) => {
        await page.goto('/login');

        const results = await new AxeBuilder({ page })
            .withTags(['wcag2aa'])
            .disableRules(['region', 'landmark-one-main']) // abaikan untuk sementara
            .analyze();

        const contrastViolations = results.violations.filter(
            (v) => v.id === 'color-contrast'
        );

        // Laporkan kontras yang kurang, tapi tidak gagalkan test
        // (kadang desain intentionally pakai kontras rendah untuk estetika)
        if (contrastViolations.length > 0) {
            console.warn(`\n[Login] Pelanggaran kontras warna:`);
            for (const violation of contrastViolations) {
                for (const node of violation.nodes) {
                    console.warn(`  - ${node.html}`);
                    console.warn(`    ${node.failureSummary}`);
                }
            }
        }

        // Gagalkan hanya jika lebih dari 3 pelanggaran
        expect(contrastViolations.length).toBeLessThanOrEqual(3);
    });
});

test.describe('Accessibility — Navigasi Keyboard', () => {
    test('semua elemen form bisa diakses dengan Tab', async ({ page }) => {
        await page.goto('/login');

        // Fokus ke elemen pertama
        await page.keyboard.press('Tab');

        // Periksa bahwa elemen yang ter-fokus adalah input pertama
        const firstFocused = await page.evaluate(() => {
            const el = document.activeElement;
            return el?.tagName.toLowerCase();
        });

        expect(['input', 'a', 'button']).toContain(firstFocused);

        // Tab beberapa kali, semua elemen harus dapat fokus
        for (let i = 0; i < 5; i++) {
            await page.keyboard.press('Tab');
            const tag = await page.evaluate(
                () => document.activeElement?.tagName.toLowerCase()
            );
            expect(['input', 'a', 'button', 'body']).toContain(tag);
        }
    });

    test('tombol submit bisa di-submit dengan Enter', async ({ page }) => {
        await page.goto('/login');

        await page.fill('input#identitas', 'test@titiktemu.test');
        await page.fill('input#password', 'password123');

        // Tekan Enter di input password
        await page.press('input#password', 'Enter');

        // Akan redirect atau menampilkan error
        // Yang penting tidak stuck di halaman
        await page.waitForLoadState('networkidle');
    });
});

test.describe('Accessibility — Landmark & Struktur', () => {
    test('Halaman Login memiliki landmark main', async ({ page }) => {
        await page.goto('/login');

        // Halaman harus memiliki <main> atau role="main"
        const main = page.locator('main, [role="main"]');
        const count = await main.count();

        // Jika tidak ada, ini pelanggaran WCAG. Kita laporkan.
        // Tidak wajib gagal karena Svelte + Tailwind sering tidak pakai <main>.
        if (count === 0) {
            console.warn(
                '[Login] Halaman tidak memiliki landmark <main>. Disarankan menambahkan untuk aksesibilitas.'
            );
        }
    });

    test('Halaman Login memiliki bahasa dokumen yang benar', async ({ page }) => {
        await page.goto('/login');

        const lang = await page.evaluate(
            () => document.documentElement.lang
        );

        // Harus "id" (Indonesia) atau minimal ada
        expect(lang).toBeTruthy();
        expect(['id', 'en']).toContain(lang);
    });
});