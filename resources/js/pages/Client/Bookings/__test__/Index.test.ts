import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ClientBookingsIndex from '../Index.svelte';

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
                        name: 'Client Test',
                        username: 'client',
                        email: 'client@example.com',
                        role: 'client',
                    },
                },
                unread_notifications: 0,
                flash: {},
            };
        },
        get url() {
            return '/client/bookings';
        },
        get component() {
            return 'Client/Bookings/Index';
        },
    },
}));

// ============================================================
// MOCK UTILS
// ============================================================
vi.mock('@/utils/enums', () => ({
    bookingStatusBadge: (s: string) => `badge-${s}`,
    bookingStatusLabel: (s: string) => `Label ${s}`,
    bookingStatusShort: (s: string) => `Short ${s}`,
}));

vi.mock('@/utils/formatCurrency', () => ({
    formatCurrency: (n: number | string) => `Rp ${n}`,
}));

vi.mock('@/utils/formatDate', () => ({
    formatDate: (d: string) => `Tgl: ${d}`,
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

const createBooking = (overrides: any = {}): any => ({
    id: 1,
    kode: 'BK-123',
    tanggal_keberangkatan: '2026-05-01',
    jumlah_peserta: 2,
    total_harga: 1500000,
    status: 'pending_payment',
    expired_at: null,
    created_at: '2026-04-01T10:00:00Z',
    package: { id: 10, nama: 'Paket Bali', kode: 'PKT-BALI', timezone: 'Asia/Jakarta' },
    client: { id: 50, name: 'Budi', email: 'budi@example.com' },
    ...overrides,
});

const defaultFilters = {
    search: '',
    status: '',
    sort: 'created_at',
    direction: 'desc',
};

const defaultCounts = {
    pending_payment: 1,
    payment_verified: 0,
    confirmed: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
};

// ============================================================
// SETUP
// ============================================================

beforeEach(() => {
    vi.clearAllMocks();
});

// ============================================================
// KATEGORI 1 — RENDERING DATA BOOKING
// ============================================================

describe('Client Bookings Index — Rendering', () => {
    it('merender info booking (kode, nama paket, tanggal, peserta)', () => {
        render(ClientBookingsIndex, {
            props: {
                bookings: createPaginator([createBooking()]),
                filters: defaultFilters,
                statusCounts: defaultCounts,
            },
        });

        expect(screen.getByText('BK-123')).toBeInTheDocument();
        expect(screen.getByText('Paket Bali')).toBeInTheDocument();
        expect(screen.getByText('Tgl: 2026-05-01')).toBeInTheDocument();
        expect(screen.getByText('2 orang')).toBeInTheDocument();
        expect(screen.getByText('Rp 1500000')).toBeInTheDocument();
        expect(screen.getByText('Label pending_payment')).toBeInTheDocument();
    });

    it('merender tautan ke detail booking', () => {
        render(ClientBookingsIndex, {
            props: {
                bookings: createPaginator([createBooking()]),
                filters: defaultFilters,
                statusCounts: defaultCounts,
            },
        });

        // Cari link card booking (bukan link di sidebar)
        const link = document.querySelector('a[href="/client/bookings/1"]');
        expect(link).not.toBeNull();
    });
});

// ============================================================
// KATEGORI 2 — COUNTDOWN & STATUS EXPIRY
// ============================================================

describe('Client Bookings Index — Countdown', () => {
    it('menampilkan countdown jika status pending_payment dan ada expired_at', () => {
        const futureDate = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(); // 5 jam lagi
        render(ClientBookingsIndex, {
            props: {
                bookings: createPaginator([createBooking({ expired_at: futureDate })]),
                filters: defaultFilters,
                statusCounts: defaultCounts,
            },
        });

        expect(screen.getByText(/Sisa waktu:/i)).toBeInTheDocument();
    });

    it('TIDAK menampilkan countdown jika status bukan pending_payment', () => {
        const futureDate = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString();
        render(ClientBookingsIndex, {
            props: {
                bookings: createPaginator([createBooking({ status: 'confirmed', expired_at: futureDate })]),
                filters: defaultFilters,
                statusCounts: { ...defaultCounts, pending_payment: 0, confirmed: 1 },
            },
        });

        expect(screen.queryByText(/Sisa waktu:/i)).not.toBeInTheDocument();
    });

    it('menampilkan teks "Expired" jika waktu sudah lewat', () => {
        const pastDate = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1 jam lalu
        render(ClientBookingsIndex, {
            props: {
                bookings: createPaginator([createBooking({ expired_at: pastDate })]),
                filters: defaultFilters,
                statusCounts: defaultCounts,
            },
        });

        expect(screen.getByText(/Sisa waktu: Expired/i)).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 3 — EMPTY STATE
// ============================================================

describe('Client Bookings Index — Empty State', () => {
    it('merender pesan awal jika data kosong tanpa filter', () => {
        render(ClientBookingsIndex, {
            props: {
                bookings: createPaginator([]),
                filters: defaultFilters,
                statusCounts: { ...defaultCounts, pending_payment: 0 },
            },
        });

        // ✅ EmptyState asli merender teks langsung
        expect(screen.getByText('Belum ada booking')).toBeInTheDocument();
        expect(
            screen.getByText(/Mulai jelajahi paket wisata/i),
        ).toBeInTheDocument();
    });

    it('merender pesan filter jika data kosong tapi ada filter', () => {
        render(ClientBookingsIndex, {
            props: {
                bookings: createPaginator([]),
                filters: { ...defaultFilters, search: 'xyz' },
                statusCounts: { ...defaultCounts, pending_payment: 0 },
            },
        });

        expect(screen.getByText('Tidak ada booking ditemukan')).toBeInTheDocument();
        expect(screen.getByText(/Coba ubah filter/i)).toBeInTheDocument();
    });
});