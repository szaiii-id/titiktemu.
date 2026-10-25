import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import PayoutReport from '../Payout.svelte';

// ============================================================
// MOCK INERTIA — lengkap
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
            return '/admin/reports/payout';
        },
        get component() {
            return 'Admin/Reports/Payout';
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
    total_dicairkan: 5000000,
    total_pending: 1000000,
    total_saldo_mengendap: 2000000,
    payouts: [
        {
            id: 1,
            kode: 'PAY-2026-001',
            mitra: 'Budi Santoso',
            tanggal: '2026-01-01',
            jumlah: 5000000,
            status: 'paid',
        },
        {
            id: 2,
            kode: 'PAY-2026-002',
            mitra: 'Ani Wijaya',
            tanggal: '2026-01-02',
            jumlah: 1000000,
            status: 'pending',
        },
    ],
    ...overrides,
});

const defaultFilters = { start_date: '2026-01-01', end_date: '2026-01-31' };

const renderPage = (overrides: any = {}) =>
    render(PayoutReport, {
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
describe('Admin Reports Payout — Rendering Dasar', () => {
    it('merender judul halaman laporan payout', () => {
        renderPage();

        const titles = screen.getAllByText(/Laporan.*Payout|Rekap.*Payout|Payout/i);
        expect(titles.length).toBeGreaterThanOrEqual(1);
    });
});

// ============================================================
// KATEGORI 2 — KARTU RINGKASAN
// ============================================================
describe('Admin Reports Payout — Kartu Ringkasan', () => {
    it('menampilkan Total Dicairkan', () => {
        renderPage();

        expect(
            screen.getByText(/Total Dicairkan/i),
        ).toBeInTheDocument();
        // Rp 5.000.000 muncul di kartu ringkasan DAN di baris tabel.
        expect(
            screen.getAllByText(/Rp 5\.000\.000/i).length,
        ).toBeGreaterThanOrEqual(1);
    });

    it('menampilkan Pending / Menunggu', () => {
        renderPage();

        expect(
            screen.getByText(/Pending \/ Menunggu/i),
        ).toBeInTheDocument();
        // Rp 1.000.000 muncul di kartu ringkasan DAN di baris tabel.
        expect(
            screen.getAllByText(/Rp 1\.000\.000/i).length,
        ).toBeGreaterThanOrEqual(1);
    });

    it('menampilkan Saldo Mengendap', () => {
        renderPage();

        expect(
            screen.getByText(/Saldo Mengendap/i),
        ).toBeInTheDocument();
        // Rp 2.000.000 hanya di kartu ringkasan (tidak ada baris tabel dengan nilai ini).
        expect(
            screen.getAllByText(/Rp 2\.000\.000/i).length,
        ).toBeGreaterThanOrEqual(1);
    });
});

// ============================================================
// KATEGORI 3 — TABEL PAYOUT
// ============================================================
describe('Admin Reports Payout — Tabel Payout', () => {
    it('menampilkan kode payout', () => {
        renderPage();

        expect(screen.getByText('PAY-2026-001')).toBeInTheDocument();
        expect(screen.getByText('PAY-2026-002')).toBeInTheDocument();
    });

    it('menampilkan nama mitra', () => {
        renderPage();

        expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
        expect(screen.getByText('Ani Wijaya')).toBeInTheDocument();
    });

    it('menampilkan tanggal', () => {
        renderPage();

        expect(screen.getByText('2026-01-01')).toBeInTheDocument();
        expect(screen.getByText('2026-01-02')).toBeInTheDocument();
    });

    it('menampilkan jumlah terformat', () => {
        renderPage();

        // Nilai sama juga di kartu ringkasan → pakai getAllByText.
        expect(
            screen.getAllByText(/Rp 5\.000\.000/i).length,
        ).toBeGreaterThanOrEqual(1);
        expect(
            screen.getAllByText(/Rp 1\.000\.000/i).length,
        ).toBeGreaterThanOrEqual(1);
    });

    it('menampilkan status "paid" dan "pending"', () => {
        renderPage();

        // Regex ^...$ membatasi match ke teks persis,
        // supaya tidak bentrok dengan substring lain.
        expect(screen.getAllByText(/^paid$/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/^pending$/i).length).toBeGreaterThanOrEqual(1);
    });

    it('menampilkan empty state jika tidak ada payout', () => {
        renderPage({ data: createMockData({ payouts: [] }) });

        expect(
            screen.getByText(/Belum ada data payout/i),
        ).toBeInTheDocument();
    });
});