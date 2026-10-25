import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ReportIndex from '../Index.svelte';

// ============================================================
// MOCK INERTIA — lengkap (mengikuti pola Payouts yang lulus)
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
            return '/admin/reports';
        },
        get component() {
            return 'Admin/Reports/Index';
        },
    },
}));

// ============================================================
// MOCK formatCurrency
// ============================================================
vi.mock('@/utils/formatCurrency', () => ({
    formatCurrency: (val: number) => `Rp ${val.toLocaleString('id-ID')}`,
}));

// ============================================================
// MOCK flarecharts (leaf library, aman di-mock)
// ============================================================
vi.mock('@faintshadow/flarecharts', () => ({
    AreaChart: vi.fn(() => null),
}));

// ❌ TIDAK ADA mock DashboardLayout — biarkan render asli
// ❌ TIDAK ADA mock PageHeader — biarkan render asli

// ============================================================
// HELPERS
// ============================================================
const createMockData = (overrides: any = {}) => ({
    total_revenue: 15000000,
    total_honor: 5000000,
    gross_profit: 10000000,
    transactions: [
        {
            kode: 'BKG-001',
            tanggal: '2026-01-01',
            client: 'Budi',
            paket: 'Pasar Terapung',
            total: 1500000,
            status: 'confirmed',
        },
        {
            kode: 'BKG-002',
            tanggal: '2026-01-02',
            client: 'Ani',
            paket: 'Hutan Kalimantan',
            total: 3000000,
            status: 'pending_payment',
        },
    ],
    ...overrides,
});

const createMockMonthlyRevenue = () => [
    { bulan: 'Jan', total: 1000000 },
    { bulan: 'Feb', total: 2000000 },
    { bulan: 'Mar', total: 3000000 },
    { bulan: 'Apr', total: 4000000 },
    { bulan: 'Mei', total: 5000000 },
    { bulan: 'Jun', total: 6000000 },
];

const defaultFilters = { start_date: '2026-01-01', end_date: '2026-01-31' };

const renderPage = (overrides: any = {}) =>
    render(ReportIndex, {
        props: {
            data: createMockData(),
            monthly_revenue: createMockMonthlyRevenue(),
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
describe('Admin Reports Index — Rendering Dasar', () => {
    it('merender judul "Laporan Pendapatan"', () => {
        renderPage();
        const headings = screen.getAllByRole('heading', {
            name: /Laporan Pendapatan/i,
            level: 1,
        });
        expect(headings.length).toBeGreaterThanOrEqual(1);
    });
});

// ============================================================
// KATEGORI 2 — KARTU RINGKASAN
// ============================================================
describe('Admin Reports Index — Kartu Ringkasan', () => {
    it('menampilkan Total Pendapatan', () => {
        renderPage();
        expect(screen.getByText(/Total Pendapatan/i)).toBeInTheDocument();
        expect(screen.getByText(/Rp 15\.000\.000/i)).toBeInTheDocument();
    });

    it('menampilkan Honor Mitra', () => {
        renderPage();
        expect(screen.getByText(/Honor Mitra/i)).toBeInTheDocument();
        expect(screen.getByText(/Rp 5\.000\.000/i)).toBeInTheDocument();
    });

    it('menampilkan Laba Kotor', () => {
        renderPage();
        expect(screen.getByText(/Laba Kotor/i)).toBeInTheDocument();
        expect(screen.getByText(/Rp 10\.000\.000/i)).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 3 — FILTER
// ============================================================
describe('Admin Reports Index — Filter', () => {
    it('merender input start_date dan end_date', () => {
        renderPage();

        const inputs = document.querySelectorAll(
            'input[type="date"]',
        ) as NodeListOf<HTMLInputElement>;
        expect(inputs).toHaveLength(2);
        expect(inputs[0].value).toBe('2026-01-01');
        expect(inputs[1].value).toBe('2026-01-31');
    });

    it('mengklik "Terapkan Filter" memanggil router.get', async () => {
        renderPage();

        const button = screen.getByRole('button', {
            name: /Terapkan Filter/i,
        });
        await fireEvent.click(button);

        expect(mockRouterGet).toHaveBeenCalledWith(
            '/admin/reports',
            defaultFilters,
            { preserveState: true },
        );
    });
});

// ============================================================
// KATEGORI 4 — TABEL TRANSAKSI
// ============================================================
describe('Admin Reports Index — Tabel Transaksi', () => {
    it('menampilkan kode transaksi', () => {
        renderPage();
        expect(screen.getByText('BKG-001')).toBeInTheDocument();
        expect(screen.getByText('BKG-002')).toBeInTheDocument();
    });

    it('menampilkan nama client', () => {
        renderPage();
        expect(screen.getByText('Budi')).toBeInTheDocument();
        expect(screen.getByText('Ani')).toBeInTheDocument();
    });

    it('menampilkan empty state jika tidak ada transaksi', () => {
        renderPage({ data: createMockData({ transactions: [] }) });
        expect(screen.getByText(/Belum ada transaksi/i)).toBeInTheDocument();
    });
});