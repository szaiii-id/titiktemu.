import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import BookingsIndex from '../Index.svelte';

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
            return '/admin/bookings';
        },
        get component() {
            return 'Admin/Bookings/Index';
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
    formatDateTime: (d: string) => `TglWaktu: ${d}`,
}));

// ============================================================
// HELPERS
// ============================================================

const createBooking = (overrides: any = {}): any => ({
    id: 1,
    kode: 'BK-123',
    jumlah_peserta: 2,
    status: 'pending_payment',
    tanggal_keberangkatan: '2026-05-01',
    total_harga: 1500000,
    created_at: '2026-04-01T10:00:00Z',
    expired_at: null,
    package: {
        id: 10,
        nama: 'Trip Bali',
        kode: 'PKT-BALI',
        timezone: 'Asia/Jakarta',
    },
    client: {
        id: 100,
        name: 'Budi',
        email: 'budi@example.com',
    },
    ...overrides,
});

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

const defaultFilters = {
    search: '',
    status: '',
    package_id: '',
    tanggal_dari: '',
    tanggal_sampai: '',
    sort: 'created_at',
    direction: 'desc',
};

const defaultCounts = {
    pending_payment: 1,
    payment_verified: 0,
    confirmed: 2,
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

describe('Admin Bookings Index — Rendering Data', () => {
    it('merender tabel jika ada data booking', () => {
        render(BookingsIndex, {
            props: {
                bookings: createPaginator([createBooking()]),
                filters: defaultFilters,
                statusCounts: defaultCounts,
            },
        });

        const table = document.querySelector('table');
        expect(table).toBeInTheDocument();
    });

    it('menampilkan info booking (kode, nama paket, jumlah peserta)', () => {
        render(BookingsIndex, {
            props: {
                bookings: createPaginator([createBooking()]),
                filters: defaultFilters,
                statusCounts: defaultCounts,
            },
        });

        expect(screen.getByText('BK-123')).toBeInTheDocument();
        expect(screen.getByText('Trip Bali')).toBeInTheDocument();
        // "2 peserta" adalah teks gabungan dari `{jumlah_peserta} peserta`
        expect(
            screen.getByText((_content, element) => {
                const text = element?.textContent ?? '';
                return (
                    element?.tagName === 'P' &&
                    text.includes('2') &&
                    text.includes('peserta')
                );
            })
        ).toBeInTheDocument();
    });

    it('menampilkan info client', () => {
        render(BookingsIndex, {
            props: {
                bookings: createPaginator([createBooking()]),
                filters: defaultFilters,
                statusCounts: defaultCounts,
            },
        });

        expect(screen.getByText('Budi')).toBeInTheDocument();
        expect(screen.getByText('budi@example.com')).toBeInTheDocument();
    });

    it('menampilkan total harga yang sudah diformat', () => {
        render(BookingsIndex, {
            props: {
                bookings: createPaginator([createBooking()]),
                filters: defaultFilters,
                statusCounts: defaultCounts,
            },
        });

        expect(screen.getByText('Rp 1500000')).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 2 — BADGE STATUS & URGENT/OVERDUE
// ============================================================

describe('Admin Bookings Index — Badge & Urgency', () => {
    it('merender badge status sesuai util (Label & Class)', () => {
        render(BookingsIndex, {
            props: {
                bookings: createPaginator([
                    createBooking({ status: 'confirmed' }),
                ]),
                filters: defaultFilters,
                statusCounts: defaultCounts,
            },
        });

        // `Label confirmed` muncul 1x (badge)
        expect(screen.getByText('Label confirmed')).toHaveClass(
            'badge-confirmed'
        );
    });

    it('menampilkan badge "Hampir expired" jika expired < 6 jam', () => {
        const nearFuture = new Date(
            Date.now() + 3 * 60 * 60 * 1000
        ).toISOString(); // 3 jam lagi
        render(BookingsIndex, {
            props: {
                bookings: createPaginator([
                    createBooking({
                        status: 'pending_payment',
                        expired_at: nearFuture,
                    }),
                ]),
                filters: defaultFilters,
                statusCounts: defaultCounts,
            },
        });

        expect(screen.getByText(/Hampir expired/i)).toBeInTheDocument();
    });

    it('menampilkan badge "Overdue" jika expired_at sudah lewat', () => {
        const past = new Date(Date.now() - 1000).toISOString(); // 1 detik lalu
        render(BookingsIndex, {
            props: {
                bookings: createPaginator([
                    createBooking({
                        status: 'pending_payment',
                        expired_at: past,
                    }),
                ]),
                filters: defaultFilters,
                statusCounts: defaultCounts,
            },
        });

        expect(screen.getByText(/Overdue/i)).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 3 — EMPTY STATE
// ============================================================

describe('Admin Bookings Index — Empty State', () => {
    it('merender EmptyState dengan pesan awal jika tidak ada data & tidak ada filter', () => {
        render(BookingsIndex, {
            props: {
                bookings: createPaginator([]),
                filters: defaultFilters,
                statusCounts: defaultCounts,
            },
        });

        // EmptyState asli merender teks langsung
        expect(screen.getByText('Belum ada booking')).toBeInTheDocument();
        expect(
            screen.getByText(/Booking dari client akan muncul/i)
        ).toBeInTheDocument();
    });

    it('merender EmptyState dengan pesan filter jika ada filter aktif tapi data kosong', () => {
        render(BookingsIndex, {
            props: {
                bookings: createPaginator([]),
                filters: { ...defaultFilters, search: 'xyz' },
                statusCounts: defaultCounts,
            },
        });

        expect(
            screen.getByText('Tidak ada booking ditemukan')
        ).toBeInTheDocument();
        expect(screen.getByText(/Coba ubah filter/i)).toBeInTheDocument();
    });
});