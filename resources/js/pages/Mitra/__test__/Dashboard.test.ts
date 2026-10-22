import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import MitraDashboard from '../Dashboard.svelte';

// ============================================================
// MOCK INERTIA — WAJIB (satu-satunya mock)
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
                        id: 2,
                        name: 'Mitra Test',
                        role: 'mitra',
                    },
                },
            };
        },
        get url() {
            return '/mitra/dashboard';
        },
        get component() {
            return 'Mitra/Dashboard';
        },
    },
}));

// ============================================================
// HELPERS
// ============================================================

const createStats = (overrides: any = {}) => ({
    trips: { scheduled: 2, active: 1, completed: 3, total: 6 },
    daily_reports: {
        submitted: 2,
        verified: 5,
        rejected: 1,
        total: 8,
    },
    wallet: {
        saldo: 1_500_000,
        total_pendapatan: 5_000_000,
        total_dicairkan: 3_500_000,
    },
    ...overrides,
});

const createTrip = (overrides: any = {}) => ({
    id: 1,
    kode: 'TRP-001',
    status: 'active',
    package: { id: 10, nama: 'Bali Adventure', kode: 'PKG-BALI' },
    trip_mitra: { role: 'leader', honor: '500000', honor_tipe: 'per_day' },
    today_day: {
        id: 100,
        hari_ke: 2,
        tanggal: '2026-04-01',
        judul: 'Snorkeling',
        status: 'active',
        has_report: false,
        report_status: null,
    },
    ...overrides,
});

const createPendingReport = (overrides: any = {}) => ({
    id: 500,
    status: 'submitted',
    submitted_at: '2026-04-01T10:00:00Z',
    trip_day: {
        hari_ke: 2,
        tanggal: '2026-04-01',
        judul: 'Snorkeling',
        trip: {
            id: 1,
            kode: 'TRP-001',
            package: { nama: 'Bali Adventure' },
        },
    },
    ...overrides,
});

/**
 * Ambil section terdekat dari heading berdasarkan nama.
 * `closest()` di TS bertipe Element|null, jadi di-cast ke HTMLElement.
 */
const getSectionByHeading = (name: string): HTMLElement => {
    const heading = screen.getByRole('heading', { level: 2, name });
    return heading.closest('div.mb-6') as HTMLElement;
};

/**
 * Ambil KARTU wallet (bukan link sidebar "Wallet").
 * Sidebar: <a href="/mitra/wallet"><span>Wallet</span></a>
 * Kartu:   <a href="/mitra/wallet">... Saldo Wallet ...</a>
 * Diferensiasi via teks "Saldo Wallet".
 */
const getWalletCard = (): HTMLElement => {
    const link = screen
        .getAllByRole('link')
        .find(
            (a) =>
                a.getAttribute('href') === '/mitra/wallet' &&
                a.textContent?.includes('Saldo Wallet'),
        );
    if (!link) throw new Error('Wallet card tidak ditemukan');
    return link as HTMLElement;
};

beforeEach(() => {
    vi.clearAllMocks();
});

// ============================================================
// KATEGORI 1 — WELCOME & WALLET
// ============================================================

describe('Mitra Dashboard — Welcome & Wallet', () => {
    it('menampilkan nama user di welcome banner', () => {
        render(MitraDashboard, {
            props: {
                stats: createStats(),
                todayTrips: [],
                pendingReports: [],
            },
        });

        expect(
            screen.getByRole('heading', {
                name: /Selamat Datang, Mitra Test/i,
            }),
        ).toBeInTheDocument();
    });

    it('menampilkan saldo wallet terformat', () => {
        render(MitraDashboard, {
            props: {
                stats: createStats(),
                todayTrips: [],
                pendingReports: [],
            },
        });

        const walletEl = getWalletCard();

        expect(
            within(walletEl).getByText(/1\.500\.000|1,500,000/),
        ).toBeInTheDocument();
        expect(
            within(walletEl).getByText(/5\.000\.000|5,000,000/),
        ).toBeInTheDocument();
        expect(
            within(walletEl).getByText(/3\.500\.000|3,500,000/),
        ).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 2 — WARNING LAPORAN
// ============================================================

describe('Mitra Dashboard — Warning Laporan', () => {
    it('menampilkan warning jika ada trip yang belum lapor hari ini', () => {
        render(MitraDashboard, {
            props: {
                stats: createStats(),
                todayTrips: [createTrip()],
                pendingReports: [],
            },
        });

        expect(
            screen.getByRole('heading', { name: 'Laporan Menunggu' }),
        ).toBeInTheDocument();
        expect(
            screen.getByText(/1 trip perlu laporan hari ini/i),
        ).toBeInTheDocument();
    });

    it('TIDAK menampilkan warning jika semua trip sudah lapor', () => {
        render(MitraDashboard, {
            props: {
                stats: createStats(),
                todayTrips: [
                    createTrip({
                        today_day: {
                            id: 100,
                            hari_ke: 2,
                            tanggal: '2026-04-01',
                            judul: 'Snorkeling',
                            status: 'active',
                            has_report: true,
                            report_status: 'verified',
                        },
                    }),
                ],
                pendingReports: [],
            },
        });

        expect(
            screen.queryByRole('heading', { name: 'Laporan Menunggu' }),
        ).not.toBeInTheDocument();
    });

    it('TIDAK menampilkan warning jika tidak ada trip hari ini', () => {
        render(MitraDashboard, {
            props: {
                stats: createStats(),
                todayTrips: [],
                pendingReports: [],
            },
        });

        expect(
            screen.queryByRole('heading', { name: 'Laporan Menunggu' }),
        ).not.toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 3 — TRIP HARI INI
// ============================================================

describe('Mitra Dashboard — Trip Hari Ini', () => {
    it('merender trip hari ini jika ada', () => {
        render(MitraDashboard, {
            props: {
                stats: createStats(),
                todayTrips: [createTrip()],
                pendingReports: [],
            },
        });

        const section = getSectionByHeading('Trip Hari Ini');
        expect(
            within(section).getByText('Bali Adventure'),
        ).toBeInTheDocument();
        expect(
            within(section).getByText('TRP-001'),
        ).toBeInTheDocument();
    });

    it('TIDAK merender section Trip Hari Ini jika kosong', () => {
        render(MitraDashboard, {
            props: {
                stats: createStats(),
                todayTrips: [],
                pendingReports: [],
            },
        });

        expect(
            screen.queryByRole('heading', {
                level: 2,
                name: 'Trip Hari Ini',
            }),
        ).not.toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 4 — STATISTIK
// ============================================================

describe('Mitra Dashboard — Statistik', () => {
    it('merender 4 label Statistik Trip dengan nilai benar', () => {
        render(MitraDashboard, {
            props: {
                stats: createStats(),
                todayTrips: [],
                pendingReports: [],
            },
        });

        const section = getSectionByHeading('Statistik Trip');

        expect(
            within(section).getByText('Total Trip'),
        ).toBeInTheDocument();
        expect(
            within(section).getByText('Terjadwal'),
        ).toBeInTheDocument();
        expect(
            within(section).getByText('Berjalan'),
        ).toBeInTheDocument();
        expect(
            within(section).getByText('Selesai'),
        ).toBeInTheDocument();

        expect(within(section).getByText('6')).toBeInTheDocument();
    });

    it('merender 4 label Statistik Laporan dengan nilai benar', () => {
        render(MitraDashboard, {
            props: {
                stats: createStats(),
                todayTrips: [],
                pendingReports: [],
            },
        });

        const section = getSectionByHeading('Statistik Laporan');

        expect(
            within(section).getByText('Total Laporan'),
        ).toBeInTheDocument();
        expect(
            within(section).getByText('Pending'),
        ).toBeInTheDocument();
        expect(
            within(section).getByText('Terverifikasi'),
        ).toBeInTheDocument();
        expect(
            within(section).getByText('Ditolak'),
        ).toBeInTheDocument();

        expect(within(section).getByText('5')).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 5 — LAPORAN PENDING
// ============================================================

describe('Mitra Dashboard — Laporan Pending', () => {
    it('merender laporan pending jika ada', () => {
        render(MitraDashboard, {
            props: {
                stats: createStats(),
                todayTrips: [],
                pendingReports: [createPendingReport()],
            },
        });

        const section = getSectionByHeading(
            'Laporan Menunggu Verifikasi',
        );
        expect(
            within(section).getByText('Bali Adventure'),
        ).toBeInTheDocument();
    });

    it('TIDAK merender section jika pendingReports kosong', () => {
        render(MitraDashboard, {
            props: {
                stats: createStats(),
                todayTrips: [],
                pendingReports: [],
            },
        });

        expect(
            screen.queryByRole('heading', {
                level: 2,
                name: 'Laporan Menunggu Verifikasi',
            }),
        ).not.toBeInTheDocument();
    });
});