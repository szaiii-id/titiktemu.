import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import TripsIndex from '../Index.svelte';

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
            return '/admin/trips';
        },
        get component() {
            return 'Admin/Trips/Index';
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
    tanggal_dari: '',
    tanggal_sampai: '',
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

describe('Admin Trips Index — Rendering', () => {
    it('merender info trip (kode, nama paket, peserta, durasi)', () => {
        render(TripsIndex, {
            props: {
                trips: createPaginator([createTrip()]),
                filters: defaultFilters,
                statusCounts: defaultCounts,
            },
        });

        expect(screen.getByText('TRIP-123')).toBeInTheDocument();
        expect(screen.getByText('Paket Bali')).toBeInTheDocument();
        // "5 peserta · Durasi: ..." adalah teks gabungan — pakai matcher function
        const pesertaText = screen.getByText((_content, element) => {
            const text = element?.textContent ?? '';
            return (
                element?.tagName === 'P' &&
                text.includes('5 peserta') &&
                text.includes('Durasi: 2026-05-01 - 2026-05-03')
            );
        });
        expect(pesertaText).toBeInTheDocument();
        expect(screen.getByText('Label scheduled')).toBeInTheDocument();
    });

    it('merender info client dari booking', () => {
        render(TripsIndex, {
            props: {
                trips: createPaginator([createTrip()]),
                filters: defaultFilters,
                statusCounts: defaultCounts,
            },
        });

        expect(screen.getByText('Budi')).toBeInTheDocument();
        expect(screen.getByText('budi@example.com')).toBeInTheDocument();
    });

    it('merender status mitra (sudah ada vs belum)', () => {
        // Skenario 1: Ada mitra (2)
        const { unmount } = render(TripsIndex, {
            props: {
                trips: createPaginator([createTrip({ mitras_count: 2 })]),
                filters: defaultFilters,
                statusCounts: defaultCounts,
            },
        });
        expect(screen.getByText('2')).toBeInTheDocument();
        unmount();

        // Skenario 2: Belum ada mitra
        render(TripsIndex, {
            props: {
                trips: createPaginator([createTrip({ mitras_count: 0 })]),
                filters: defaultFilters,
                statusCounts: defaultCounts,
            },
        });
        expect(screen.getByText(/Belum ada/i)).toBeInTheDocument();
    });

    it('merender tanggal mulai dan selesai', () => {
        render(TripsIndex, {
            props: {
                trips: createPaginator([createTrip()]),
                filters: defaultFilters,
                statusCounts: defaultCounts,
            },
        });

        expect(screen.getByText('Tgl: 2026-05-01')).toBeInTheDocument();
        // "s/d Tgl: 2026-05-03" adalah teks gabungan
        const endDateText = screen.getByText((_content, element) => {
            const text = element?.textContent ?? '';
            return (
                element?.tagName === 'P' &&
                text.includes('s/d') &&
                text.includes('2026-05-03')
            );
        });
        expect(endDateText).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 2 — INDIKATOR "HARI INI"
// ============================================================

describe('Admin Trips Index — Indikator "Hari Ini"', () => {
    it('TIDAK menampilkan indikator "Hari ini" jika status bukan active', () => {
        render(TripsIndex, {
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
        render(TripsIndex, {
            props: {
                trips: createPaginator([
                    createTrip({
                        status: 'active',
                        tanggal_mulai: '2026-05-01',
                    }),
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

describe('Admin Trips Index — Empty State', () => {
    it('merender pesan awal jika data kosong tanpa filter', () => {
        render(TripsIndex, {
            props: {
                trips: createPaginator([]),
                filters: defaultFilters,
                statusCounts: defaultCounts,
            },
        });

        // EmptyState asli merender teks langsung
        expect(screen.getByText('Belum ada trip')).toBeInTheDocument();
        expect(
            screen.getByText(/Trip akan otomatis dibuat/i)
        ).toBeInTheDocument();
    });

    it('merender pesan filter jika data kosong tapi ada filter', () => {
        render(TripsIndex, {
            props: {
                trips: createPaginator([]),
                filters: { ...defaultFilters, search: 'xyz' },
                statusCounts: defaultCounts,
            },
        });

        expect(
            screen.getByText('Tidak ada trip ditemukan')
        ).toBeInTheDocument();
        expect(screen.getByText(/Coba ubah filter/i)).toBeInTheDocument();
    });
});