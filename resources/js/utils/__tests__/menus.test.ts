import { describe, it, expect } from 'vitest';
import { adminMenu, mitraMenu, clientMenu } from '../menus';
import type { MenuItem } from '../menus';

// ============================================================
// HELPER — Validasi Struktur MenuItem
// ============================================================

function expectValidMenuItems(menu: MenuItem[]) {
    expect(menu.length).toBeGreaterThan(0);

    for (const item of menu) {
        expect(item).toHaveProperty('label');
        expect(item).toHaveProperty('href');
        expect(item).toHaveProperty('icon');

        expect(typeof item.label).toBe('string');
        expect(item.label.length).toBeGreaterThan(0);

        expect(typeof item.href).toBe('string');
        expect(item.href).toMatch(/^\//); // harus dimulai dengan "/"

        expect(typeof item.icon).toBe('string');
        expect(item.icon.length).toBeGreaterThan(0);
    }
}

// ============================================================
// KATEGORI 1 — ADMIN MENU
// ============================================================

describe('adminMenu', () => {
    it('memiliki struktur MenuItem yang valid', () => {
        expectValidMenuItems(adminMenu);
    });

    it('memiliki 9 item menu', () => {
        expect(adminMenu).toHaveLength(9);
    });

    it('berisi menu yang diharapkan', () => {
        const labels = adminMenu.map((m) => m.label);
        expect(labels).toContain('Dashboard');
        expect(labels).toContain('Paket Wisata');
        expect(labels).toContain('Booking');
        expect(labels).toContain('Trip');
        expect(labels).toContain('Laporan Harian');
        expect(labels).toContain('Laporan');
        expect(labels).toContain('Payout');
        expect(labels).toContain('Manajemen User');
        expect(labels).toContain('Daftar Client');
    });

    it('semua href mengarah ke /admin/*', () => {
        for (const item of adminMenu) {
            expect(item.href).toMatch(/^\/admin\//);
        }
    });

    it('menu Dashboard mengarah ke /admin/dashboard', () => {
        const dashboard = adminMenu.find((m) => m.label === 'Dashboard');
        expect(dashboard?.href).toBe('/admin/dashboard');
    });

    it('menu Laporan mengarah ke /admin/reports', () => {
        const report = adminMenu.find((m) => m.label === 'Laporan');
        expect(report?.href).toBe('/admin/reports');
    });

    it('menu Laporan Harian mengarah ke /admin/daily-reports', () => {
        const dailyReport = adminMenu.find((m) => m.label === 'Laporan Harian');
        expect(dailyReport?.href).toBe('/admin/daily-reports');
    });
});

// ============================================================
// KATEGORI 2 — MITRA MENU
// ============================================================

describe('mitraMenu', () => {
    it('memiliki struktur MenuItem yang valid', () => {
        expectValidMenuItems(mitraMenu);
    });

    it('memiliki 7 item menu', () => {
        expect(mitraMenu).toHaveLength(7);
    });

    it('berisi menu yang diharapkan', () => {
        const labels = mitraMenu.map((m) => m.label);
        expect(labels).toContain('Dashboard');
        expect(labels).toContain('Trip Saya');
        expect(labels).toContain('Laporan Harian');
        expect(labels).toContain('Wallet');
        expect(labels).toContain('Pencairan');
        expect(labels).toContain('Profile Usaha');
        expect(labels).toContain('Ganti Password');
    });

    it('semua href mengarah ke /mitra/*', () => {
        for (const item of mitraMenu) {
            expect(item.href).toMatch(/^\/mitra\//);
        }
    });

    it('menu Wallet mengarah ke /mitra/wallet', () => {
        const wallet = mitraMenu.find((m) => m.label === 'Wallet');
        expect(wallet?.href).toBe('/mitra/wallet');
    });
});

// ============================================================
// KATEGORI 3 — CLIENT MENU
// ============================================================

describe('clientMenu', () => {
    it('memiliki struktur MenuItem yang valid', () => {
        expectValidMenuItems(clientMenu);
    });

    it('memiliki 4 item menu', () => {
        expect(clientMenu).toHaveLength(4);
    });

    it('berisi menu yang diharapkan', () => {
        const labels = clientMenu.map((m) => m.label);
        expect(labels).toContain('Dashboard');
        expect(labels).toContain('Katalog Paket');
        expect(labels).toContain('Booking Saya');
        expect(labels).toContain('Profile Saya');
    });

    it('semua href mengarah ke /client/*', () => {
        for (const item of clientMenu) {
            expect(item.href).toMatch(/^\/client\//);
        }
    });

    it('menu Katalog Paket mengarah ke /client/catalog', () => {
        const catalog = clientMenu.find((m) => m.label === 'Katalog Paket');
        expect(catalog?.href).toBe('/client/catalog');
    });
});

// ============================================================
// KATEGORI 4 — INTEGRITAS ANTAR MENU
// ============================================================

describe('Integritas Menu', () => {
    it('setiap role memiliki menu Dashboard', () => {
        expect(adminMenu.find((m) => m.label === 'Dashboard')).toBeDefined();
        expect(mitraMenu.find((m) => m.label === 'Dashboard')).toBeDefined();
        expect(clientMenu.find((m) => m.label === 'Dashboard')).toBeDefined();
    });

    it('tidak ada href duplikat dalam satu menu', () => {
        for (const menu of [adminMenu, mitraMenu, clientMenu]) {
            const hrefs = menu.map((m) => m.href);
            expect(new Set(hrefs).size).toBe(hrefs.length);
        }
    });

    it('tidak ada label duplikat dalam satu menu', () => {
        for (const menu of [adminMenu, mitraMenu, clientMenu]) {
            const labels = menu.map((m) => m.label);
            expect(new Set(labels).size).toBe(labels.length);
        }
    });
});