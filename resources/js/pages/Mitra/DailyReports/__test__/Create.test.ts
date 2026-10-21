import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import MitraDailyReportCreate from '../Create.svelte';

// ============================================================
// MOCK INERTIA — lengkap dengan page.props
// ============================================================
const mockRouterPost = vi.fn();

vi.mock('@inertiajs/svelte', () => ({
    router: {
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
            return '/mitra/trips/20/days/5/report';
        },
        get component() {
            return 'Mitra/DailyReports/Create';
        },
    },
}));

// ============================================================
// MOCK UTILS
// ============================================================
vi.mock('@/utils/formatDate', () => ({
    formatDate: (d: string) => `Tgl: ${d}`,
}));

// ============================================================
// HELPERS
// ============================================================

const createMockTrip = (overrides: any = {}): any => ({
    id: 20,
    kode: 'TRIP-123',
    tanggal_mulai: '2026-05-01',
    tanggal_selesai: '2026-05-03',
    timezone: 'Asia/Jakarta',
    status: 'active',
    snapshot_package: null,
    package: {
        id: 10,
        nama: 'Paket Bali',
        kode: 'PKT-BALI',
        timezone: 'Asia/Jakarta',
    },
    days: [],
    ...overrides,
});

const createMockTripDay = (overrides: any = {}): any => ({
    id: 5,
    hari_ke: 1,
    tanggal: '2026-05-01',
    judul: 'Hari Pertama',
    deskripsi: 'Kegiatan hari 1',
    status: 'in_progress',
    ...overrides,
});

const getForm = () => {
    const btn = screen.getByRole('button', {
        name: /Kirim Laporan|Mengirim/i,
    });
    return btn.closest('form') as HTMLFormElement;
};

// ============================================================
// SETUP
// ============================================================

beforeEach(() => {
    vi.clearAllMocks();
});

// ============================================================
// KATEGORI 1 — RENDERING & INFO TRIP
// ============================================================

describe('Mitra Daily Report Create — Rendering', () => {
    it('merender info trip dan hari', () => {
        render(MitraDailyReportCreate, {
            props: {
                trip: createMockTrip(),
                tripDay: createMockTripDay(),
                existingReport: null,
            },
        });

        expect(screen.getByText('Paket Bali')).toBeInTheDocument();
        expect(screen.getByText('TRIP-123')).toBeInTheDocument();

        // "Hari 1 — Hari Pertama" adalah teks gabungan
        const dayText = screen.getByText((_content, element) => {
            const text = element?.textContent ?? '';
            return (
                element?.tagName === 'P' &&
                text.includes('Hari 1') &&
                text.includes('Hari Pertama')
            );
        });
        expect(dayText).toBeInTheDocument();

        expect(screen.getByText('Tgl: 2026-05-01')).toBeInTheDocument();
    });

    it('merender form upload dan catatan', () => {
        render(MitraDailyReportCreate, {
            props: {
                trip: createMockTrip(),
                tripDay: createMockTripDay(),
                existingReport: null,
            },
        });

        // ImageUploader asli merender input file (hidden) atau dropzone
        const textarea = screen.getByLabelText(/Catatan/i);
        expect(textarea).toBeInTheDocument();
    });

    it('merender tombol submit dengan label "Kirim Laporan"', () => {
        render(MitraDailyReportCreate, {
            props: {
                trip: createMockTrip(),
                tripDay: createMockTripDay(),
                existingReport: null,
            },
        });

        expect(
            screen.getByRole('button', { name: /Kirim Laporan/i })
        ).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 2 — RESUBMIT (LAPORAN DITOLAK)
// ============================================================

describe('Mitra Daily Report Create — Resubmit', () => {
    it('merender banner penolakan jika existingReport ditolak', () => {
        render(MitraDailyReportCreate, {
            props: {
                trip: createMockTrip(),
                tripDay: createMockTripDay(),
                existingReport: {
                    id: 100,
                    catatan: 'Catatan lama',
                    status: 'rejected',
                    rejection_reason: 'Foto terlalu blur',
                    submitted_at: '2026-05-01T10:00:00Z',
                    media: [],
                },
            },
        });

        expect(screen.getByText('Laporan Ditolak')).toBeInTheDocument();
        expect(screen.getByText('Foto terlalu blur')).toBeInTheDocument();
        expect(
            screen.getByText(/Mohon upload ulang foto bukti/i)
        ).toBeInTheDocument();
        expect(screen.getByText('Upload Ulang Laporan')).toBeInTheDocument();
    });

    it('mengisi catatan awal dari existingReport', () => {
        render(MitraDailyReportCreate, {
            props: {
                trip: createMockTrip(),
                tripDay: createMockTripDay(),
                existingReport: {
                    id: 100,
                    catatan: 'Catatan lama',
                    status: 'rejected',
                    rejection_reason: 'Foto terlalu blur',
                    submitted_at: '2026-05-01T10:00:00Z',
                    media: [],
                },
            },
        });

        const textarea = screen.getByLabelText(
            /Catatan/i
        ) as HTMLTextAreaElement;
        expect(textarea.value).toBe('Catatan lama');
    });
});

// ============================================================
// KATEGORI 3 — VALIDASI & SUBMIT
// ============================================================

describe('Mitra Daily Report Create — Submit', () => {
    it('menampilkan error jika tidak ada file media yang diupload', async () => {
        render(MitraDailyReportCreate, {
            props: {
                trip: createMockTrip(),
                tripDay: createMockTripDay(),
                existingReport: null,
            },
        });

        await fireEvent.submit(getForm());

        expect(mockRouterPost).not.toHaveBeenCalled();
        expect(
            screen.getByText('Minimal 1 foto bukti wajib diupload.')
        ).toBeInTheDocument();
    });

    it('mengirim form jika existingReport punya media (bukan resubmit)', async () => {
        render(MitraDailyReportCreate, {
            props: {
                trip: createMockTrip(),
                tripDay: createMockTripDay(),
                existingReport: {
                    id: 100,
                    catatan: 'Catatan',
                    status: 'submitted',
                    rejection_reason: null,
                    submitted_at: '2026-05-01T10:00:00Z',
                    media: [{ id: 1, path: 'foto.jpg', urutan: 1 }],
                },
            },
        });

        await fireEvent.submit(getForm());

        // existingReport punya media (status submitted, bukan resubmit)
        // → existingCount = 1, totalMedia = 1 → lolos validasi
        expect(mockRouterPost).toHaveBeenCalled();
    });
});