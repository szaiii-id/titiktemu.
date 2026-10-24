import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import MitraReport from '../Mitra.svelte';

// ============================================================
// MOCK INERTIA — lengkap (pola sama seperti Payouts yang lulus)
// ============================================================
const mockRouterGet = vi.fn();

vi.mock('@inertiajs/svelte', () => ({
    router: {
        get: (...args: any[]) => mockRouterGet(...args),
    },
    inertia: () => ({
        update: vi.fn(),
        destroy: vi.fn(),
    }),
    page: {
        get props() {
            return {
                auth: {
                    user: {
                        id: 1,
                        name: 'Admin Test',
                        username: 'admin',
                        email: 'admin@example.com',
                        role: 'admin',
                    },
                },
                unread_notifications: 0,
                flash: {},
            };
        },
        get url() {
            return '/admin/reports/mitra';
        },
        get component() {
            return 'Admin/Reports/Mitra';
        },
    },
}));

// ============================================================
// MOCK formatCurrency
// ============================================================
vi.mock('@/utils/formatCurrency', () => ({
    formatCurrency: (val: number) => `Rp ${val.toLocaleString('id-ID')}`,
}));

// ❌ TIDAK ADA mock DashboardLayout / PageHeader / ReportTabs /
//    ReportFilter / ExportButtons — semua dirender asli.

// ============================================================
// HELPERS
// ============================================================
const createMockData = (overrides: any = {}) => ({
    total_mitra: 10,
    total_trip_completed: 25,
    mitras: [
        {
            id: 1,
            name: 'Budi Santoso',
            email: 'budi@ptabc.com',
            total_trip: 15,
            total_honor: 15000000,
        },
        {
            id: 2,
            name: 'Ani Wijaya',
            email: 'ani@gmail.com',
            total_trip: 10,
            total_honor: 10000000,
        },
    ],
    ...overrides,
});

const defaultFilters = { start_date: '2026-01-01', end_date: '2026-01-31' };

const renderPage = (overrides: any = {}) =>
    render(MitraReport, {
        props: {
            data: createMockData(),
            filters: defaultFilters,
            ...overrides,
        },
    });

beforeEach(() => {
    vi.clearAllMocks();
});

// ============================================================
// KATEGORI 1 — RENDERING DASAR
// ============================================================
describe('Admin Reports Mitra — Rendering Dasar', () => {
    it('merender judul halaman laporan mitra', () => {
        renderPage();

        // Judul muncul di DashboardLayout (topbar) + PageHeader.
        const titles = screen.getAllByText(/Laporan.*Mitra|Kinerja Mitra|Rekap.*Mitra/i);
        expect(titles.length).toBeGreaterThanOrEqual(1);
    });
});

// ============================================================
// KATEGORI 2 — KARTU RINGKASAN
// ============================================================
describe('Admin Reports Mitra — Kartu Ringkasan', () => {
    it('menampilkan Total Mitra Aktif', () => {
        renderPage();

        expect(
            screen.getByText(/Total Mitra Aktif/i),
        ).toBeInTheDocument();
        // Nilai "10" muncul di kartu ringkasan DAN di tabel (total_trip Ani).
        expect(screen.getAllByText('10').length).toBeGreaterThanOrEqual(1);
    });

    it('menampilkan Total Trip Diselesaikan', () => {
        renderPage();

        expect(
            screen.getByText(/Total Trip Diselesaikan/i),
        ).toBeInTheDocument();
        expect(screen.getAllByText('25').length).toBeGreaterThanOrEqual(1);
    });
});

// ============================================================
// KATEGORI 3 — TABEL KINERJA MITRA
// ============================================================
describe('Admin Reports Mitra — Tabel Kinerja', () => {
    it('menampilkan nama mitra', () => {
        renderPage();

        expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
        expect(screen.getByText('Ani Wijaya')).toBeInTheDocument();
    });

    it('menampilkan email mitra', () => {
        renderPage();

        expect(screen.getByText('budi@ptabc.com')).toBeInTheDocument();
        expect(screen.getByText('ani@gmail.com')).toBeInTheDocument();
    });

    it('menampilkan total trip per mitra', () => {
        renderPage();

        // "15" unik (hanya total_trip Budi).
        expect(screen.getAllByText('15').length).toBeGreaterThanOrEqual(1);
        // "10" muncul juga di kartu ringkasan → pakai getAllByText.
        expect(screen.getAllByText('10').length).toBeGreaterThanOrEqual(1);
    });

    it('menampilkan total honor terformat', () => {
        renderPage();

        expect(screen.getAllByText(/Rp 15\.000\.000/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/Rp 10\.000\.000/i).length).toBeGreaterThanOrEqual(1);
    });

    it('menampilkan empty state jika tidak ada mitra', () => {
        renderPage({ data: createMockData({ mitras: [] }) });

        expect(
            screen.getByText(/Belum ada data mitra/i),
        ).toBeInTheDocument();
    });
});