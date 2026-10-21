import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import DailyReportsIndex from '../Index.svelte';

// ============================================================
// MOCK INERTIA — lengkap dengan page.props
// ============================================================
const mockRouterGet = vi.fn();
const mockRouterPost = vi.fn();

vi.mock('@inertiajs/svelte', () => ({
    router: {
        get: (...args: any[]) => mockRouterGet(...args),
        post: (...args: any[]) => mockRouterPost(...args),
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
            return '/admin/daily-reports';
        },
        get component() {
            return 'Admin/DailyReports/Index';
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

const createReportItem = (overrides: any = {}): any => ({
    id: 1,
    status: 'submitted',
    submitted_at: '2026-04-01T10:00:00Z',
    catatan: 'Catatan laporan',
    rejection_reason: null,
    verified_at: null,
    verifier: null,
    trip_day: {
        id: 5,
        hari_ke: 1,
        judul: 'Hari Pertama',
        trip: {
            id: 10,
            kode: 'TRIP-123',
            package: { id: 100, nama: 'Trip Bali', kode: 'PKT-BALI' },
        },
    },
    mitra: { id: 50, name: 'Mitra A', email: 'mitra@example.com' },
    media: [
        { id: 201, path: 'photos/bukti1.jpg' },
        { id: 202, path: 'photos/bukti2.jpg' },
        { id: 203, path: 'photos/bukti3.jpg' },
    ],
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
// KATEGORI 1 — RENDERING DAFTAR LAPORAN
// ============================================================

describe('Admin Daily Reports Index — Rendering', () => {
    it('merender info laporan (nama paket, hari ke, nama mitra)', () => {
        render(DailyReportsIndex, {
            props: {
                reports: createPaginator([createReportItem()]),
                filters: defaultFilters,
                statusCounts: defaultCounts,
            },
        });

        expect(screen.getByText('Trip Bali')).toBeInTheDocument();

        // ✅ "Hari 1 — Hari Pertama" adalah teks gabungan
        const dayText = screen.getByText((_content, element) => {
            const text = element?.textContent ?? '';
            return (
                element?.tagName === 'SPAN' &&
                text.includes('Hari 1') &&
                text.includes('Hari Pertama')
            );
        });
        expect(dayText).toBeInTheDocument();

        // "Oleh Mitra A" — teks gabungan dengan <strong>
        expect(screen.getAllByText(/Mitra A/i).length).toBeGreaterThanOrEqual(1);

        // `Label submitted` muncul 2x (tab + badge)
        expect(
            screen.getAllByText('Label submitted').length
        ).toBeGreaterThanOrEqual(1);
    });

    it('merender thumbnail foto maksimal 2 gambar', () => {
        render(DailyReportsIndex, {
            props: {
                reports: createPaginator([createReportItem()]),
                filters: defaultFilters,
                statusCounts: defaultCounts,
            },
        });

        // Hanya 2 pertama dari 3 media
        const images = screen.getAllByRole('img', { name: /Foto bukti/i });
        expect(images).toHaveLength(2);
    });

    it('merender status "submitted" dengan tombol aksi Verifikasi & Tolak', () => {
        render(DailyReportsIndex, {
            props: {
                reports: createPaginator([createReportItem({ status: 'submitted' })]),
                filters: defaultFilters,
                statusCounts: defaultCounts,
            },
        });

        expect(
            screen.getByRole('button', { name: /^Verifikasi$/i })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /^Tolak$/i })
        ).toBeInTheDocument();
    });

    it('TIDAK merender tombol aksi jika status bukan submitted (misal verified)', () => {
        render(DailyReportsIndex, {
            props: {
                reports: createPaginator([createReportItem({ status: 'verified' })]),
                filters: defaultFilters,
                statusCounts: { ...defaultCounts, submitted: 0, verified: 1 },
            },
        });

        expect(
            screen.queryByRole('button', { name: /^Verifikasi$/i })
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: /^Tolak$/i })
        ).not.toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 2 — EMPTY STATE
// ============================================================

describe('Admin Daily Reports Index — Empty State', () => {
    it('merender pesan awal jika data kosong tanpa filter', () => {
        render(DailyReportsIndex, {
            props: {
                reports: createPaginator([]),
                filters: defaultFilters,
                statusCounts: { ...defaultCounts, submitted: 0 },
            },
        });

        // EmptyState asli merender teks langsung
        expect(screen.getByText('Belum ada laporan')).toBeInTheDocument();
        expect(
            screen.getByText(/Laporan harian dari mitra akan muncul/i)
        ).toBeInTheDocument();
    });

    it('merender pesan filter jika data kosong tapi ada filter', () => {
        render(DailyReportsIndex, {
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

// ============================================================
// KATEGORI 3 — INTERAKSI MODAL VERIFIKASI & PENOLAKAN
// ============================================================

describe('Admin Daily Reports Index — Interaksi Modal', () => {
    it('membuka modal verifikasi saat tombol "Verifikasi" diklik', async () => {
        render(DailyReportsIndex, {
            props: {
                reports: createPaginator([createReportItem()]),
                filters: defaultFilters,
                statusCounts: defaultCounts,
            },
        });

        const verifyBtn = screen.getByRole('button', { name: /^Verifikasi$/i });
        await fireEvent.click(verifyBtn);

        // ✅ Cari judul modal via ID unik dari ConfirmModal asli
        await waitFor(() => {
            const modalTitle = document.querySelector('#confirm-modal-title');
            expect(modalTitle).not.toBeNull();
            expect(modalTitle?.textContent?.trim()).toBe('Verifikasi Laporan?');
        });
    });

    it('membuka modal tolak saat tombol "Tolak" diklik', async () => {
        render(DailyReportsIndex, {
            props: {
                reports: createPaginator([createReportItem()]),
                filters: defaultFilters,
                statusCounts: defaultCounts,
            },
        });

        const rejectBtn = screen.getByRole('button', { name: /^Tolak$/i });
        await fireEvent.click(rejectBtn);

        await waitFor(() => {
            const modalTitle = document.querySelector('#confirm-modal-title');
            expect(modalTitle).not.toBeNull();
            expect(modalTitle?.textContent?.trim()).toBe('Tolak Laporan?');
        });
    });
});

// ============================================================
// KATEGORI 4 — INTERAKSI MODAL FOTO (VIEW PHOTO)
// ============================================================

describe('Admin Daily Reports Index — Modal Foto', () => {
    it('membuka modal foto saat thumbnail diklik', async () => {
        render(DailyReportsIndex, {
            props: {
                reports: createPaginator([createReportItem()]),
                filters: defaultFilters,
                statusCounts: defaultCounts,
            },
        });

        const thumbnails = screen.getAllByRole('button', { name: /Lihat foto bukti/i });
        await fireEvent.click(thumbnails[0]);

        // Dialog foto muncul
        const dialog = screen.getByRole('dialog', { name: /Pratinjau foto bukti/i });
        expect(dialog).toBeInTheDocument();

        // Gambar di dalam modal
        const modalImg = dialog.querySelector('img');
        expect(modalImg).toHaveAttribute('src', '/storage/photos/bukti1.jpg');
    });

    it('menutup modal foto saat tombol tutup diklik', async () => {
        render(DailyReportsIndex, {
            props: {
                reports: createPaginator([createReportItem()]),
                filters: defaultFilters,
                statusCounts: defaultCounts,
            },
        });

        const thumbnails = screen.getAllByRole('button', { name: /Lihat foto bukti/i });
        await fireEvent.click(thumbnails[0]);

        const closeBtn = screen.getByRole('button', { name: /^Tutup$/i });
        await fireEvent.click(closeBtn);

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('menutup modal foto saat tombol "Tutup pratinjau foto" (overlay) diklik', async () => {
        render(DailyReportsIndex, {
            props: {
                reports: createPaginator([createReportItem()]),
                filters: defaultFilters,
                statusCounts: defaultCounts,
            },
        });

        const thumbnails = screen.getAllByRole('button', { name: /Lihat foto bukti/i });
        await fireEvent.click(thumbnails[0]);

        const overlay = screen.getByRole('button', { name: /Tutup pratinjau foto/i });
        await fireEvent.click(overlay);

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('menutup modal foto saat tombol Escape ditekan', async () => {
        render(DailyReportsIndex, {
            props: {
                reports: createPaginator([createReportItem()]),
                filters: defaultFilters,
                statusCounts: defaultCounts,
            },
        });

        const thumbnails = screen.getAllByRole('button', { name: /Lihat foto bukti/i });
        await fireEvent.click(thumbnails[0]);

        const dialog = screen.getByRole('dialog', { name: /Pratinjau foto bukti/i });

        // Tunggu requestAnimationFrame fokus ke dialog
        await waitFor(() => {
            expect(document.activeElement).toBe(dialog);
        });

        await fireEvent.keyDown(dialog, { key: 'Escape' });

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
});