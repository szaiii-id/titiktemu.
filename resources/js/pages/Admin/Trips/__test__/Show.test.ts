import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import TripShow from '../Show.svelte';
import type {
    DailyReport,
    Package,
    Trip,
    TripDay,
    TripMitra,
    UserMini,
} from '@/types';

// ============================================================
// TIPE PROPS KOMPONEN (mirror `TripDetail` internal Show.svelte)
// ------------------------------------------------------------
// Identik dengan definisi di `Admin/Trips/Show.svelte`.
// `mitra` wajib `& { timezone: string }`, `media` intersection
// dengan `DailyReportMedia` (wajib `daily_report_id` + `created_at`).
// ============================================================
type TripDetail = Omit<Trip, 'package' | 'booking' | 'mitras' | 'days'> & {
    package:
        | Pick<
              Package,
              'id' | 'nama' | 'kode' | 'slug' | 'timezone' | 'cover_image'
          >
        | null;
    booking:
        | {
              id: number;
              kode: string;
              tanggal_keberangkatan: string;
              jumlah_peserta: number;
              total_harga: string;
              status: string;
              client: Pick<
                  UserMini,
                  'id' | 'name' | 'email' | 'username'
              > | null;
          }
        | null;
    mitras: Array<
        Omit<TripMitra, 'mitra' | 'assigner'> & {
            mitra:
                | (Pick<UserMini, 'id' | 'name' | 'email' | 'username'> & {
                      timezone: string;
                  })
                | null;
            assigner: Pick<UserMini, 'id' | 'name' | 'email'> | null;
        }
    >;
    days: Array<
        TripDay & {
            daily_reports: Array<
                DailyReport & {
                    mitra: Pick<
                        UserMini,
                        'id' | 'name' | 'email' | 'username'
                    > | null;
                    verifier: Pick<UserMini, 'id' | 'name' | 'email'> | null;
                    media: Array<{
                        id: number;
                        daily_report_id: number;
                        path: string;
                        urutan: number;
                        created_at: string;
                    }>;
                }
            >;
        }
    >;
};

// Props lengkap komponen TripShow
type TripShowData = {
    trip: TripDetail;
    totalHonor: number;
    unverifiedDays: Array<{
        id: number;
        hari_ke: number;
        tanggal: string;
        judul: string;
    }>;
    submittedReports: Array<{
        id: number;
        catatan: string | null;
        status: string;
        submitted_at: string;
        mitra: Pick<UserMini, 'id' | 'name' | 'email'> | null;
        media: Array<{ id: number; path: string; urutan: number }>;
        trip_day: {
            id: number;
            hari_ke: number;
            tanggal: string;
            judul: string;
        } | null;
    }>;
    canComplete: boolean;
    allMitras: Array<Pick<UserMini, 'id' | 'name' | 'email' | 'username'>>;
};

// ============================================================
// MOCK INERTIA
// ============================================================
const mockRouterPost = vi.fn();
const mockRouterPut = vi.fn();
const mockRouterDelete = vi.fn();

vi.mock('@inertiajs/svelte', () => ({
    router: {
        post: (...args: any[]) => mockRouterPost(...args),
        put: (...args: any[]) => mockRouterPut(...args),
        delete: (...args: any[]) => mockRouterDelete(...args),
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
            return '/admin/trips/1';
        },
        get component() {
            return 'Admin/Trips/Show';
        },
    },
}));

// ============================================================
// MOCK UTILS
// ============================================================
vi.mock('@/utils/enums', () => ({
    dailyReportStatusBadge: (s: string) => `badge-report-${s}`,
    dailyReportStatusLabel: (s: string) => `Label Report ${s}`,
    tripMitraRoleBadge: (s: string) => `badge-role-${s}`,
    tripMitraRoleLabel: (s: string) => `Label Role ${s}`,
    tripStatusBadge: (s: string) => `badge-trip-${s}`,
    tripStatusLabel: (s: string) => `Label Trip ${s}`,
}));

vi.mock('@/utils/formatCurrency', () => ({
    formatCurrency: (n: number | string) => `Rp ${n}`,
}));

vi.mock('@/utils/formatDate', () => ({
    formatDate: (d: string) => `Tgl: ${d}`,
    formatDateTime: (d: string) => `TglWaktu: ${d}`,
}));

vi.mock('@/utils/duration', () => ({
    formatDurasiFromRange: () => '3 Hari',
    hitungDurasiHari: () => 3,
}));

vi.mock('@/utils/form', () => ({
    parseRupiah: (val: string) =>
        parseInt(String(val).replace(/\D/g, ''), 10) || 0,
    formatRupiahInput: (n: number | null | undefined) => {
        if (n === null || n === undefined || Number.isNaN(n)) return '';
        return new Intl.NumberFormat('id-ID', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(n);
    },
}));

vi.mock('@/utils/timezone', () => ({
    timezoneLabelLong: (tz: string) => `TZ: ${tz}`,
}));

// ============================================================
// HELPERS
// ============================================================

const createMockData = (): TripShowData => {
    const pkg: TripDetail['package'] = {
        id: 10,
        nama: 'Paket Bali',
        kode: 'PKT-BALI',
        slug: 'paket-bali',
        timezone: 'Asia/Jakarta',
        cover_image: null,
    };

    const booking: TripDetail['booking'] = {
        id: 100,
        kode: 'BK-001',
        tanggal_keberangkatan: '2026-05-01',
        jumlah_peserta: 5,
        total_harga: '5000000',
        status: 'confirmed',
        client: {
            id: 50,
            name: 'Budi',
            email: 'budi@example.com',
            username: 'budi',
        },
    };

    const mitras: TripDetail['mitras'] = [
        {
            id: 1,
            trip_id: 1,
            mitra_id: 50,
            role: 'lead',
            honor: '1000000',
            honor_tipe: 'flat',
            instruksi: 'Jaga kebersihan',
            assigned_by: null,
            assigned_at: null,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
            mitra: {
                id: 50,
                name: 'Mitra A',
                email: 'mitra@example.com',
                username: 'mitra',
                timezone: 'Asia/Jakarta',
            },
            assigner: null,
        },
    ];

    const days: TripDetail['days'] = [
        {
            id: 10,
            trip_id: 1,
            hari_ke: 1,
            tanggal: '2026-05-01',
            judul: 'Hari Pertama',
            deskripsi: 'Kegiatan hari 1',
            status: 'pending',
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
            daily_reports: [],
        },
        {
            id: 11,
            trip_id: 1,
            hari_ke: 2,
            tanggal: '2026-05-02',
            judul: 'Hari Kedua',
            deskripsi: 'Kegiatan hari 2',
            status: 'in_progress',
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
            daily_reports: [
                {
                    id: 20,
                    trip_day_id: 11,
                    mitra_id: 50,
                    catatan: 'Laporan hari 2',
                    status: 'submitted',
                    submitted_at: '2026-05-02T10:00:00Z',
                    verified_by: null,
                    verified_at: null,
                    rejection_reason: null,
                    created_at: '2026-05-02T10:00:00Z',
                    updated_at: '2026-05-02T10:00:00Z',
                    mitra: {
                        id: 50,
                        name: 'Mitra A',
                        email: 'mitra@example.com',
                        username: 'mitra',
                    },
                    verifier: null,
                    media: [
                        {
                            id: 100,
                            daily_report_id: 20,
                            path: 'photos/bukti.jpg',
                            urutan: 1,
                            created_at: '2026-05-02T10:00:00Z',
                        },
                    ],
                },
            ],
        },
    ];

    const trip: TripDetail = {
        id: 1,
        kode: 'TRIP-123',
        status: 'scheduled',
        jumlah_peserta: 5,
        tanggal_mulai: '2026-05-01',
        tanggal_selesai: '2026-05-03',
        timezone: 'Asia/Jakarta',
        created_at: '2026-04-01T10:00:00Z',
        updated_at: '2026-04-02T10:00:00Z',
        package_id: 10,
        booking_id: 100,
        snapshot_package: {
            nama: 'Paket Bali',
            facilities: {
                include: ['Hotel', 'Makan'],
                exclude: ['Tiket Pesawat'],
            },
        },
        package: pkg,
        booking,
        mitras,
        days,
    };

    return {
        trip,
        totalHonor: 1000000,
        unverifiedDays: [
            {
                id: 11,
                hari_ke: 2,
                tanggal: '2026-05-02',
                judul: 'Hari Kedua',
            },
        ],
        submittedReports: [],
        canComplete: false,
        allMitras: [
            {
                id: 50,
                name: 'Mitra A',
                email: 'mitra@example.com',
                username: 'mitra',
            },
            {
                id: 51,
                name: 'Mitra B',
                email: 'mitraB@example.com',
                username: 'mitraB',
            },
        ],
    };
};

// ============================================================
// SETUP
// ============================================================

beforeEach(() => {
    vi.clearAllMocks();
});

// ============================================================
// KATEGORI 1 — RENDERING HEADER & DATA TRIP
// ============================================================

describe('Admin Trip Show — Rendering Data', () => {
    it('merender header trip (nama paket, kode, status)', () => {
        const data = createMockData();
        render(TripShow, { props: data });

        expect(
            screen.getByRole('heading', { level: 1, name: 'Paket Bali' })
        ).toBeInTheDocument();

        expect(
            screen.getAllByText('TRIP-123').length
        ).toBeGreaterThanOrEqual(1);

        expect(
            screen.getAllByText('Label Trip scheduled').length
        ).toBeGreaterThanOrEqual(1);
    });

    it('merender info tanggal, peserta, timezone', () => {
        const data = createMockData();
        render(TripShow, { props: data });

        expect(
            screen.getAllByText('Tgl: 2026-05-01').length
        ).toBeGreaterThanOrEqual(1);

        expect(
            screen.getAllByText('Tgl: 2026-05-03').length
        ).toBeGreaterThanOrEqual(1);

        expect(screen.getByText('5 orang')).toBeInTheDocument();
        expect(screen.getByText('TZ: Asia/Jakarta')).toBeInTheDocument();
    });

    it('merender data mitra', () => {
        const data = createMockData();
        render(TripShow, { props: data });

        expect(
            screen.getAllByText('Mitra A').length
        ).toBeGreaterThanOrEqual(1);

        expect(screen.getByText('Label Role lead')).toBeInTheDocument();
        expect(
            screen.getAllByText('Rp 1000000').length
        ).toBeGreaterThanOrEqual(1);
    });

    it('merender itinerary dan laporan', () => {
        const data = createMockData();
        render(TripShow, { props: data });

        expect(screen.getByText('Hari Pertama')).toBeInTheDocument();
        expect(screen.getByText('Hari Kedua')).toBeInTheDocument();
        expect(screen.getByText('Laporan hari 2')).toBeInTheDocument();
        expect(
            screen.getAllByText('Label Report submitted').length
        ).toBeGreaterThanOrEqual(1);
    });
});

// ============================================================
// KATEGORI 2 — AKSI & MODAL
// ============================================================

describe('Admin Trip Show — Aksi & Modal', () => {
    it('menampilkan tombol "Aktifkan Trip" jika status scheduled & sudah ada mitra', () => {
        const data = createMockData();
        render(TripShow, { props: data });

        expect(
            screen.getByRole('button', { name: /Aktifkan Trip/i })
        ).toBeInTheDocument();
    });

    it('membuka modal Aktivasi saat tombol diklik', async () => {
        const data = createMockData();
        render(TripShow, { props: data });

        const btn = screen.getByRole('button', { name: /Aktifkan Trip/i });
        await fireEvent.click(btn);

        await waitFor(() => {
            expect(screen.getByText('Aktifkan Trip?')).toBeInTheDocument();
        });
    });

    it('membuka modal Assign Mitra saat tombol diklik', async () => {
        const data = createMockData();
        render(TripShow, { props: data });

        const btn = screen.getByRole('button', {
            name: /^Assign Mitra$/i,
        });
        await fireEvent.click(btn);

        await waitFor(() => {
            const modalTitle = document.querySelector('#form-modal-title');
            expect(modalTitle).not.toBeNull();
            expect(modalTitle?.textContent?.trim()).toBe('Assign Mitra');
        });

        const mitraLabel = document.querySelector('#assign-mitra-label');
        expect(mitraLabel).not.toBeNull();
        expect(mitraLabel?.textContent?.trim()).toMatch(/Mitra/);
    });

    it('membuka modal Batal saat tombol diklik', async () => {
        const data = createMockData();
        render(TripShow, { props: data });

        const btn = screen.getByRole('button', { name: /Batalkan/i });
        await fireEvent.click(btn);

        await waitFor(() => {
            expect(screen.getByText('Batalkan Trip?')).toBeInTheDocument();
        });
    });
});