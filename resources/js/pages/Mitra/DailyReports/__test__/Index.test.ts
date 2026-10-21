import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import MitraDailyReportsIndex from '../Index.svelte';

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
            return '/mitra/daily-reports';
        },
        get component() {
            return 'Mitra/DailyReports/Index';
        },
    },
}));

// ============================================================
// MOCK UTILS
// ============================================================
vi.mock('@/utils/enums', () => ({
    dailyReportStatusBadge: (s: string) => `badge-${s}`,
    dailyReportStatusLabel: (s: string) => `Label ${s}`,
    dailyReportStatusShort: (s: string) => `Short ${s}`,
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

const createReport = (overrides: any = {}): any => ({
    id: 1,
    status: 'submitted',
    submitted_at: '2026-04-01T10:00:00Z',
    catatan: 'Catatan laporan',
    rejection_reason: null,
    verified_at: null,
    verifier: null,
    mitra: { id: 50, name: 'Mitra A', email: 'mitra@example.com' },
    media: [
        { id: 100, path: 'photos/bukti1.jpg', urutan: 1 },
        { id: 101, path: 'photos/bukti2.jpg', urutan: 2 },
    ],
    trip_day: {
        id: 10,
        hari_ke: 1,
        judul: 'Hari Pertama',
        trip: {
            id: 20,
            kode: 'TRIP-123',
            package: { id: 30, nama: 'Paket Bali', kode: 'PKT-BALI' },
        },
    },
    ...overrides,
});

const defaultFilters = {
    search: '',
    status: '',
    sort: 'submitted_at',
    direction: 'desc',
};

const defaultCounts = { submitted: 1, verified: 0, rejected: 0 };

// ============================================================
// SETUP
// ============================================================

beforeEach(() => {
    vi.clearAllMocks();
});

// ============================================================
// KATEGORI 1 — RENDERING DATA LAPORAN
// ============================================================

describe('Mitra Daily Reports Index — Rendering', () => {
    it('merender info laporan (nama paket, kode trip, hari ke)', () => {
        render(MitraDailyReportsIndex, {
            props: {
                reports: createPaginator([createReport()]),
                filters: defaultFilters,
                statusCounts: defaultCounts,
            },
        });

        expect(screen.getByText('Paket Bali')).toBeInTheDocument();
        expect(screen.getByText('TRIP-123')).toBeInTheDocument();

        // "Hari 1 — Hari Pertama" adalah teks gabungan — pakai matcher function
        const dayText = screen.getByText((_content, element) => {
            const text = element?.textContent ?? '';
            return (
                element?.tagName === 'SPAN' &&
                text.includes('Hari 1') &&
                text.includes('Hari Pertama')
            );
        });
        expect(dayText).toBeInTheDocument();

        // `Label submitted` mungkin muncul >1x (StatusTabs + badge)
        expect(
            screen.getAllByText('Label submitted').length
        ).toBeGreaterThanOrEqual(1);
    });

    it('merender thumbnail foto maksimal 2 gambar', () => {
        render(MitraDailyReportsIndex, {
            props: {
                reports: createPaginator([createReport()]),
                filters: defaultFilters,
                statusCounts: defaultCounts,
            },
        });

        const images = screen.getAllByRole('img', { name: /Foto bukti/i });
        expect(images).toHaveLength(2);
    });

    it('merender placeholder jika tidak ada media', () => {
        render(MitraDailyReportsIndex, {
            props: {
                reports: createPaginator([createReport({ media: [] })]),
                filters: defaultFilters,
                statusCounts: defaultCounts,
            },
        });

        expect(screen.queryByRole('img')).not.toBeInTheDocument();
        // Placeholder SVG dirender
        const svg = document.querySelector('svg');
        expect(svg).toBeInTheDocument();
    });

    it('merender alasan penolakan jika status rejected', () => {
        render(MitraDailyReportsIndex, {
            props: {
                reports: createPaginator([
                    createReport({
                        status: 'rejected',
                        rejection_reason: 'Foto kurang jelas',
                    }),
                ]),
                filters: defaultFilters,
                statusCounts: { ...defaultCounts, submitted: 0, rejected: 1 },
            },
        });

        expect(screen.getByText('Foto kurang jelas')).toBeInTheDocument();
        expect(screen.getByText('Ditolak:')).toBeInTheDocument();
    });

    it('merender info verifikator jika status verified', () => {
        render(MitraDailyReportsIndex, {
            props: {
                reports: createPaginator([
                    createReport({
                        status: 'verified',
                        verified_at: '2026-04-02T10:00:00Z',
                        verifier: {
                            id: 1,
                            name: 'Admin',
                            email: 'admin@example.com',
                        },
                    }),
                ]),
                filters: defaultFilters,
                statusCounts: { ...defaultCounts, submitted: 0, verified: 1 },
            },
        });

        // "Diverifikasi oleh Admin pada ..." — teks gabungan
        const verifierText = screen.getByText((_content, element) => {
            const text = element?.textContent ?? '';
            return (
                element?.tagName === 'P' &&
                text.includes('Diverifikasi oleh') &&
                text.includes('Admin')
            );
        });
        expect(verifierText).toBeInTheDocument();
    });

    it('merender tautan ke detail trip', () => {
        render(MitraDailyReportsIndex, {
            props: {
                reports: createPaginator([createReport()]),
                filters: defaultFilters,
                statusCounts: defaultCounts,
            },
        });

        // Cari link card laporan (bukan link sidebar)
        const link = document.querySelector('a[href="/mitra/trips/20"]');
        expect(link).not.toBeNull();
    });
});

// ============================================================
// KATEGORI 2 — EMPTY STATE
// ============================================================

describe('Mitra Daily Reports Index — Empty State', () => {
    it('merender pesan awal jika data kosong tanpa filter', () => {
        render(MitraDailyReportsIndex, {
            props: {
                reports: createPaginator([]),
                filters: defaultFilters,
                statusCounts: { ...defaultCounts, submitted: 0 },
            },
        });

        // EmptyState asli merender teks langsung
        expect(screen.getByText('Belum ada laporan')).toBeInTheDocument();
        expect(
            screen.getByText(/Laporan akan muncul di sini/i)
        ).toBeInTheDocument();
    });

    it('merender pesan filter jika data kosong tapi ada filter', () => {
        render(MitraDailyReportsIndex, {
            props: {
                reports: createPaginator([]),
                filters: { ...defaultFilters, search: 'xyz' },
                statusCounts: { ...defaultCounts, submitted: 0 },
            },
        });

        expect(
            screen.getByText('Tidak ada laporan ditemukan')
        ).toBeInTheDocument();
        expect(screen.getByText(/Coba ubah filter/i)).toBeInTheDocument();
    });
});