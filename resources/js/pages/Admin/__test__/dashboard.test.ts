import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import AdminDashboard from '../Dashboard.svelte';

// ============================================================
// MOCK INERTIA
// ============================================================
vi.mock('@inertiajs/svelte', () => ({
    inertia: () => ({
        update: vi.fn(),
        destroy: vi.fn(),
    }),
    router: {
        visit: vi.fn(),
        post: vi.fn(),
        get: vi.fn(),
        reload: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
    },
    page: {
        get props() {
            return {
                auth: {
                    user: {
                        id: 1,
                        name: 'Admin Test',
                        role: 'admin',
                    },
                },
            };
        },
        get url() {
            return '/admin/dashboard';
        },
        get component() {
            return 'Admin/Dashboard';
        },
    },
}));

// ============================================================
// MOCK FLARECHARTS
// ============================================================
// Karena Flarecharts merender SVG secara dinamis, kita mock
// komponennya agar test tidak error karena SSR/DOM.
vi.mock('@faintshadow/flarecharts', () => ({
    AreaChart: vi.fn(() => ({
        // Mock sederhana: render div kosong
        $$: {},
        $set: vi.fn(),
        $destroy: vi.fn(),
    })),
}));

// ============================================================
// HELPERS
// ============================================================

const createMockStats = (overrides: any = {}) => ({
    totalAdmin: 2,
    totalMitra: 5,
    totalClient: 10,
    packages: { draft: 1, aktif: 3, arsip: 0, total: 4 },
    bookings: {
        pending_payment: 2,
        payment_verified: 1,
        confirmed: 3,
        in_progress: 0,
        completed: 5,
        cancelled: 1,
        total: 12,
        needs_attention: 2,
    },
    trips: {
        scheduled: 2,
        active: 1,
        completed: 3,
        cancelled: 0,
        total: 6,
        needs_mitra: 1,
    },
    daily_reports: {
        submitted: 2,
        verified: 5,
        rejected: 1,
        total: 8,
    },
    payouts: {
        pending: 1,
        approved: 2,
        paid: 3,
        rejected: 0,
        total: 6,
    },
    total_revenue: 15000000,
    total_honor: 5000000,
    ...overrides,
});

const createMockRecentBookings = () => [
    {
        id: 1,
        kode: 'BKG-2026-001',
        client: 'Budi Client',
        paket: 'Wisata Pasar Terapung',
        total: 1500000,
        status: 'confirmed',
        tanggal: '2026-10-20',
    },
    {
        id: 2,
        kode: 'BKG-2026-002',
        client: 'Ani Client',
        paket: 'Hutan Kalimantan',
        total: 3000000,
        status: 'pending_payment',
        tanggal: '2026-10-21',
    },
];

const createMockMonthlyRevenue = () => [
    { bulan: 'Mei', total: 1000000 },
    { bulan: 'Jun', total: 2000000 },
    { bulan: 'Jul', total: 3000000 },
    { bulan: 'Agu', total: 4000000 },
    { bulan: 'Sep', total: 5000000 },
    { bulan: 'Okt', total: 6000000 },
];

const createMockMonthlyBookings = () => [
    { bulan: 'Mei', total: 5 },
    { bulan: 'Jun', total: 10 },
    { bulan: 'Jul', total: 15 },
    { bulan: 'Agu', total: 20 },
    { bulan: 'Sep', total: 25 },
    { bulan: 'Okt', total: 30 },
];

beforeEach(() => {
    vi.clearAllMocks();
});

// ============================================================
// KATEGORI 1 — HEADER & WELCOME
// ============================================================

describe('Admin Dashboard — Header', () => {
    it('menampilkan nama user di welcome banner', () => {
        render(AdminDashboard, {
            props: {
                stats: createMockStats(),
                recent_bookings: [],
                monthly_revenue: [],
                monthly_bookings: [],
            },
        });

        expect(
            screen.getByRole('heading', {
                name: /Halo, Admin Test/i,
            }),
        ).toBeInTheDocument();
    });

    it('menampilkan tombol "Lihat Laporan"', () => {
        render(AdminDashboard, {
            props: {
                stats: createMockStats(),
                recent_bookings: [],
                monthly_revenue: [],
                monthly_bookings: [],
            },
        });

        expect(
            screen.getByRole('link', { name: /Lihat Laporan/i }),
        ).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 2 — KARTU RINGKASAN
// ============================================================

describe('Admin Dashboard — Kartu Ringkasan', () => {
    it('menampilkan Total Pendapatan', () => {
        render(AdminDashboard, {
            props: {
                stats: createMockStats(),
                recent_bookings: [],
                monthly_revenue: [],
                monthly_bookings: [],
            },
        });

        expect(
            screen.getByText(/Total Pendapatan/i),
        ).toBeInTheDocument();
    });

it('menampilkan Trip Sedang Jalan', () => {
    render(AdminDashboard, {
        props: {
            stats: createMockStats(),
            recent_bookings: [],
            monthly_revenue: [],
            monthly_bookings: [],
        },
    });

    expect(
        screen.getByText(/Trip Sedang Jalan/i),
    ).toBeInTheDocument();

    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
});

    it('menampilkan Laporan Menunggu', () => {
        render(AdminDashboard, {
            props: {
                stats: createMockStats(),
                recent_bookings: [],
                monthly_revenue: [],
                monthly_bookings: [],
            },
        });

        expect(
            screen.getByText(/Laporan Menunggu/i),
        ).toBeInTheDocument();
    });

    it('menampilkan Payout Menunggu', () => {
        render(AdminDashboard, {
            props: {
                stats: createMockStats(),
                recent_bookings: [],
                monthly_revenue: [],
                monthly_bookings: [],
            },
        });

        expect(
            screen.getByText(/Payout Menunggu/i),
        ).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 3 — GRAFIK (Flarecharts)
// ============================================================

describe('Admin Dashboard — Grafik', () => {
    it('menampilkan judul "Tren Pendapatan"', () => {
        render(AdminDashboard, {
            props: {
                stats: createMockStats(),
                recent_bookings: [],
                monthly_revenue: createMockMonthlyRevenue(),
                monthly_bookings: createMockMonthlyBookings(),
            },
        });

        expect(
            screen.getByText(/Tren Pendapatan/i),
        ).toBeInTheDocument();
    });

    it('menampilkan judul "Tren Booking"', () => {
        render(AdminDashboard, {
            props: {
                stats: createMockStats(),
                recent_bookings: [],
                monthly_revenue: createMockMonthlyRevenue(),
                monthly_bookings: createMockMonthlyBookings(),
            },
        });

        expect(
            screen.getByText(/Tren Booking/i),
        ).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 4 — BOOKING TERBARU
// ============================================================

describe('Admin Dashboard — Booking Terbaru', () => {
    it('menampilkan kode booking terbaru', () => {
        render(AdminDashboard, {
            props: {
                stats: createMockStats(),
                recent_bookings: createMockRecentBookings(),
                monthly_revenue: [],
                monthly_bookings: [],
            },
        });

        expect(screen.getByText('BKG-2026-001')).toBeInTheDocument();
        expect(screen.getByText('BKG-2026-002')).toBeInTheDocument();
    });

    it('menampilkan nama client booking terbaru', () => {
        render(AdminDashboard, {
            props: {
                stats: createMockStats(),
                recent_bookings: createMockRecentBookings(),
                monthly_revenue: [],
                monthly_bookings: [],
            },
        });

        expect(screen.getByText('Budi Client')).toBeInTheDocument();
        expect(screen.getByText('Ani Client')).toBeInTheDocument();
    });

    it('menampilkan empty state jika tidak ada booking', () => {
        render(AdminDashboard, {
            props: {
                stats: createMockStats(),
                recent_bookings: [],
                monthly_revenue: [],
                monthly_bookings: [],
            },
        });

        expect(
            screen.getByText(/Belum ada booking terbaru/i),
        ).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 5 — WIDGET "PERLU TINDAKAN"
// ============================================================

describe('Admin Dashboard — Perlu Tindakan', () => {
    it('menampilkan widget jika ada laporan menunggu verifikasi', () => {
        const stats = createMockStats();
        stats.daily_reports.submitted = 5;

        render(AdminDashboard, {
            props: {
                stats,
                recent_bookings: [],
                monthly_revenue: [],
                monthly_bookings: [],
            },
        });

        expect(
            screen.getByText(/Perlu Tindakan Anda/i),
        ).toBeInTheDocument();
        expect(
            screen.getByText(/5 laporan harian/i),
        ).toBeInTheDocument();
    });

    it('menampilkan widget jika ada payout pending', () => {
        const stats = createMockStats();
        stats.payouts.pending = 3;

        render(AdminDashboard, {
            props: {
                stats,
                recent_bookings: [],
                monthly_revenue: [],
                monthly_bookings: [],
            },
        });

        expect(
            screen.getByText(/3 pengajuan payout/i),
        ).toBeInTheDocument();
    });

    it('menampilkan widget jika ada trip tanpa mitra', () => {
        const stats = createMockStats();
        stats.trips.needs_mitra = 2;

        render(AdminDashboard, {
            props: {
                stats,
                recent_bookings: [],
                monthly_revenue: [],
                monthly_bookings: [],
            },
        });

        expect(
            screen.getByText(/2 trip/i),
        ).toBeInTheDocument();
    });

    it('TIDAK menampilkan widget jika tidak ada yang perlu tindakan', () => {
        const stats = createMockStats();
        stats.daily_reports.submitted = 0;
        stats.payouts.pending = 0;
        stats.trips.needs_mitra = 0;

        render(AdminDashboard, {
            props: {
                stats,
                recent_bookings: [],
                monthly_revenue: [],
                monthly_bookings: [],
            },
        });

        expect(
            screen.queryByText(/Perlu Tindakan Anda/i),
        ).not.toBeInTheDocument();
    });
});