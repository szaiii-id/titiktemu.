import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import MitraPayoutsIndex from '../Index.svelte';

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
            return '/mitra/payouts';
        },
        get component() {
            return 'Mitra/Payouts/Index';
        },
    },
}));

// ============================================================
// MOCK UTILS
// ============================================================
vi.mock('@/utils/enums', () => ({
    payoutStatusBadge: (s: string) => `badge-${s}`,
    payoutStatusLabel: (s: string) => `Label ${s}`,
}));

vi.mock('@/utils/formatCurrency', () => ({
    formatCurrency: (n: number | string) => `Rp ${n}`,
}));

vi.mock('@/utils/formatDate', () => ({
    formatDateTime: (d: string) => `TglWaktu: ${d}`,
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

const createPayout = (overrides: any = {}): any => ({
    id: 1,
    kode: 'PAY-123',
    jumlah: 500000,
    bank_tujuan: 'BCA',
    no_rekening: '1234567890',
    nama_pemilik: 'Budi',
    status: 'pending',
    requested_at: '2026-04-01T10:00:00Z',
    reviewed_at: null,
    paid_at: null,
    rejection_reason: null,
    reviewer: null,
    ...overrides,
});

const defaultFilters = { search: '', status: '' };
const defaultCounts = { pending: 1, approved: 0, paid: 0, rejected: 0 };

// ============================================================
// SETUP
// ============================================================

beforeEach(() => {
    vi.clearAllMocks();
});

// ============================================================
// KATEGORI 1 — RENDERING DATA PENCAIRAN
// ============================================================

describe('Mitra Payouts Index — Rendering', () => {
    it('merender info pencairan (kode, jumlah, rekening)', () => {
        render(MitraPayoutsIndex, {
            props: {
                payouts: createPaginator([createPayout()]),
                filters: defaultFilters,
                statusCounts: defaultCounts,
            },
        });

        expect(screen.getByText('PAY-123')).toBeInTheDocument();
        expect(screen.getByText('Rp 500000')).toBeInTheDocument();

        // Teks rekening gabungan — gunakan matcher function
        const rekeningText = screen.getByText((_content, element) => {
            const text = element?.textContent ?? '';
            return (
                element?.tagName === 'P' &&
                text.includes('Ke:') &&
                text.includes('BCA') &&
                text.includes('1234567890') &&
                text.includes('Budi')
            );
        });
        expect(rekeningText).toBeInTheDocument();

        // ✅ FIX: `Label pending` muncul 2x (di StatusTabs + di badge)
        expect(
            screen.getAllByText('Label pending').length
        ).toBeGreaterThanOrEqual(1);
    });

    it('merender alasan penolakan jika status rejected', () => {
        render(MitraPayoutsIndex, {
            props: {
                payouts: createPaginator([
                    createPayout({
                        status: 'rejected',
                        rejection_reason: 'Rekening tidak valid',
                    }),
                ]),
                filters: defaultFilters,
                statusCounts: { ...defaultCounts, pending: 0, rejected: 1 },
            },
        });

        expect(screen.getByText('Rekening tidak valid')).toBeInTheDocument();
        expect(screen.getByText('Ditolak:')).toBeInTheDocument();
    });

    it('merender waktu transfer jika status paid', () => {
        render(MitraPayoutsIndex, {
            props: {
                payouts: createPaginator([
                    createPayout({
                        status: 'paid',
                        paid_at: '2026-04-02T10:00:00Z',
                    }),
                ]),
                filters: defaultFilters,
                statusCounts: { ...defaultCounts, pending: 0, paid: 1 },
            },
        });

        const transferText = screen.getByText((_content, element) => {
            const text = element?.textContent ?? '';
            return (
                element?.tagName === 'P' &&
                text.includes('Ditransfer') &&
                text.includes('2026-04-02')
            );
        });
        expect(transferText).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 2 — EMPTY STATE
// ============================================================

describe('Mitra Payouts Index — Empty State', () => {
    it('merender pesan awal jika data kosong tanpa filter', () => {
        render(MitraPayoutsIndex, {
            props: {
                payouts: createPaginator([]),
                filters: defaultFilters,
                statusCounts: { ...defaultCounts, pending: 0 },
            },
        });

        expect(screen.getByText('Belum ada pengajuan')).toBeInTheDocument();
        expect(
            screen.getByText(/Anda belum pernah mengajukan pencairan/i)
        ).toBeInTheDocument();
    });

    it('merender pesan filter jika data kosong tapi ada filter', () => {
        render(MitraPayoutsIndex, {
            props: {
                payouts: createPaginator([]),
                filters: { ...defaultFilters, search: 'xyz' },
                statusCounts: { ...defaultCounts, pending: 0 },
            },
        });

        expect(
            screen.getByText('Tidak ada pengajuan ditemukan')
        ).toBeInTheDocument();
        expect(screen.getByText(/Coba ubah filter/i)).toBeInTheDocument();
    });
});