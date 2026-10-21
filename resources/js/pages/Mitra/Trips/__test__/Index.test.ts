import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import MitraTripsIndex from '../Index.svelte';

// ============================================================
// MOCK INERTIA — lengkap dengan page.props
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
                        name: 'Mitra Test',
                        username: 'mitra',
                        email: 'mitra@example.com',
                        role: 'mitra',
                    },
                },
                unread_notifications: 0,
                flash: {},
            };
        },
        get url() {
            return '/mitra/trips';
        },
        get component() {
            return 'Mitra/Trips/Index';
        },
    },
}));

// ============================================================
// MOCK UTILS
// ============================================================
vi.mock('@/utils/enums', () => ({
    tripStatusBadge: (s: string) => `badge-${s}`,
    tripStatusLabel: (s: string) => `Label ${s}`,
    tripStatusShort: (s: string) => `Short ${s}`,
}));

vi.mock('@/utils/formatDate', () => ({
    formatDate: (d: string) => `Tgl: ${d}`,
}));

vi.mock('@/utils/duration', () => ({
    formatDurasiFromRange: (start: string, end: string) =>
        `Durasi: ${start} - ${end}`,
}));

// Mock timezone: kontrol isTripToday
vi.mock('@/utils/timezone', () => ({
    todayInTimezone: vi.fn().mockReturnValue('2026-05-01'),
    isDateInRange: vi.fn(
        (date: string, start: string, _end: string) => date === start
    ),
}));

// ============================================================
// HELPERS
// ============================================================

const createPaginator = (data: any[] = []): any => ({
    data,
    current_page: 1,
    last_page: 1,
    total: data.length,
    from: data.length > 0 ? 1 : 0,
    to: data.length,
    links: [],
    path: '',
    per_page: 10,
    first_page_url: '',
    last_page_url: '',
    next_page_url: null,
    prev_page_url: null,
});

const createTrip = (overrides: any = {}): any => ({
    id: 1,
    kode: 'TRIP-123',
    status: 'scheduled',
    jumlah_peserta: 5,
    tanggal_mulai: '2026-05-01',
    tanggal_selesai: '2026-05-03',
    timezone: 'Asia/Jakarta',
    mitras_count: 2,
    package: {
        id: 10,
        nama: 'Paket Bali',
        kode: 'PKT-BALI',
        timezone: 'Asia/Jakarta',
    },
    booking: {
        id: 100,
        kode: 'BK-001',
        client: { id: 50, name: 'Budi', email: 'budi@example.com' },
    },
    ...overrides,
});

const defaultFilters = {
    search: '',
    status: '',
    sort: 'tanggal_mulai',
    direction: 'desc',
};

const defaultCounts = { scheduled: 1, active: 0, completed: 0, cancelled: 0 };

// ============================================================
// SETUP
// ============================================================

beforeEach(() => {
    vi.clearAllMocks();
});

// ============================================================
// KATEGORI 1 — RENDERING DATA TRIP
// ============================================================

describe('Mitra Trips Index — Rendering', () => {
    it('merender info trip (kode, nama paket, peserta, durasi)', () => {
        render(MitraTripsIndex, {
            props: {
                trips: createPaginator([createTrip()]),
                filters: defaultFilters,
                statusCounts: defaultCounts,
            },
        });

        expect(screen.getByText('TRIP-123')).toBeInTheDocument();
        expect(screen.getByText('Paket Bali')).toBeInTheDocument();
        expect(screen.getByText('5 peserta')).toBeInTheDocument();
        expect(
            screen.getByText('Durasi: 2026-05-01 - 2026-05-03')
        ).toBeInTheDocument();
        expect(screen.getByText('Label scheduled')).toBeInTheDocument();
    });

    it('merender tanggal mulai', () => {
        render(MitraTripsIndex, {
            props: {
                trips: createPaginator([createTrip()]),
                filters: defaultFilters,
                statusCounts: defaultCounts,
            },
        });

        expect(screen.getByText('Tgl: 2026-05-01')).toBeInTheDocument();
    });

    it('merender tautan ke detail trip', () => {
        render(MitraTripsIndex, {
            props: {
                trips: createPaginator([createTrip()]),
                filters: defaultFilters,
                statusCounts: defaultCounts,
            },
        });

        // Cari link card trip (bukan link di sidebar)
        const link = document.querySelector('a[href="/mitra/trips/1"]');
        expect(link).not.toBeNull();
    });
});

// ============================================================
// KATEGORI 2 — INDIKATOR "HARI INI"
// ============================================================

describe('Mitra Trips Index — Indikator "Hari Ini"', () => {
    it('TIDAK menampilkan indikator "Hari ini" jika status bukan active', () => {
        render(MitraTripsIndex, {
            props: {
                trips: createPaginator([
                    createTrip({ status: 'scheduled', tanggal_mulai: '2026-05-01' }),
                ]),
                filters: defaultFilters,
                statusCounts: defaultCounts,
            },
        });

        expect(screen.queryByText(/Hari ini/i)).not.toBeInTheDocument();
    });

    it('menampilkan indikator "Hari ini" jika status active dan tanggal cocok', () => {
        render(MitraTripsIndex, {
            props: {
                trips: createPaginator([
                    createTrip({ status: 'active', tanggal_mulai: '2026-05-01' }),
                ]),
                filters: defaultFilters,
                statusCounts: { ...defaultCounts, scheduled: 0, active: 1 },
            },
        });

        expect(screen.getByText(/Hari ini/i)).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 3 — EMPTY STATE
// ============================================================

describe('Mitra Trips Index — Empty State', () => {
    it('merender pesan awal jika data kosong tanpa filter', () => {
        render(MitraTripsIndex, {
            props: {
                trips: createPaginator([]),
                filters: defaultFilters,
                statusCounts: { ...defaultCounts, scheduled: 0 },
            },
        });

        // EmptyState asli merender teks langsung
        expect(screen.getByText('Belum ada trip')).toBeInTheDocument();
        expect(
            screen.getByText(/Trip yang Anda ikuti akan muncul/i)
        ).toBeInTheDocument();
    });

    it('merender pesan filter jika data kosong tapi ada filter', () => {
        render(MitraTripsIndex, {
            props: {
                trips: createPaginator([]),
                filters: { ...defaultFilters, search: 'xyz' },
                statusCounts: { ...defaultCounts, scheduled: 0 },
            },
        });

        expect(screen.getByText('Tidak ada trip ditemukan')).toBeInTheDocument();
        expect(screen.getByText(/Coba ubah filter/i)).toBeInTheDocument();
    });
});