import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import MitraTripShow from '../Show.svelte';

// ============================================================
// MOCK INERTIA — lengkap dengan page.props
// ============================================================
vi.mock('@inertiajs/svelte', () => ({
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
            return '/mitra/trips/1';
        },
        get component() {
            return 'Mitra/Trips/Show';
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
    hitungDurasiHari: () => 3,
}));

vi.mock('@/utils/form', () => ({
    parseRupiah: (val: string) => parseInt(String(val).replace(/\D/g, ''), 10) || 0,
}));

// Mock timezone: hanya 2026-05-01 yang dianggap "hari ini"
vi.mock('@/utils/timezone', () => ({
    isTodayInTimezone: vi.fn((date: string) => date === '2026-05-01'),
    timezoneLabelLong: (tz: string) => `TZ: ${tz}`,
}));

// ============================================================
// HELPERS
// ============================================================

const createMockTrip = (overrides: any = {}): any => ({
    id: 1,
    kode: 'TRIP-123',
    status: 'active',
    tanggal_mulai: '2026-05-01',
    tanggal_selesai: '2026-05-03',
    jumlah_peserta: 5,
    timezone: 'Asia/Jakarta',
    snapshot_package: {
        nama: 'Paket Bali',
        facilities: {
            include: ['Hotel', 'Makan'],
            exclude: ['Tiket Pesawat'],
        },
    },
    package: {
        id: 10,
        nama: 'Paket Bali',
        kode: 'PKT-BALI',
        slug: 'paket-bali',
        timezone: 'Asia/Jakarta',
        cover_image: null,
    },
    booking: {
        id: 100,
        kode: 'BK-001',
        client: { id: 50, name: 'Budi', email: 'budi@example.com' },
    },
    mitras: [
        {
            id: 1,
            role: 'lead',
            honor: '1000000',
            honor_tipe: 'flat',
            instruksi: 'Jaga kebersihan',
            mitra: {
                id: 51,
                name: 'Mitra B',
                email: 'mitraB@example.com',
                username: 'mitraB',
            },
        },
    ],
    days: [
        {
            id: 10,
            hari_ke: 1,
            tanggal: '2026-05-01',
            judul: 'Hari Pertama',
            deskripsi: 'Kegiatan hari 1',
            status: 'in_progress',
            daily_reports: [],
        },
        {
            id: 11,
            hari_ke: 2,
            tanggal: '2026-05-02',
            judul: 'Hari Kedua',
            deskripsi: 'Kegiatan hari 2',
            status: 'pending',
            daily_reports: [],
        },
    ],
    ...overrides,
});

const createMockTripMitra = (overrides: any = {}): any => ({
    id: 1,
    role: 'lead',
    honor: '1000000',
    honor_tipe: 'flat',
    instruksi: 'Jaga kebersihan dan koordinasi dengan tim',
    ...overrides,
});

// ============================================================
// SETUP
// ============================================================

beforeEach(() => {
    vi.clearAllMocks();
});

// ============================================================
// KATEGORI 1 — HEADER & INFO TRIP
// ============================================================

describe('Mitra Trip Show — Header & Info', () => {
    it('merender header trip (nama paket, kode, status, role)', () => {
        render(MitraTripShow, {
            props: {
                trip: createMockTrip(),
                tripMitra: createMockTripMitra(),
            },
        });

        expect(
            screen.getByRole('heading', { level: 1, name: 'Paket Bali' })
        ).toBeInTheDocument();
        // TRIP-123 muncul di header + mungkin di tempat lain — pakai getAllByText
        expect(screen.getAllByText('TRIP-123').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Label Trip active').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(/Anda: Label Role lead/i)).toBeInTheDocument();
    });

    it('merender info tanggal, peserta, timezone', () => {
        render(MitraTripShow, {
            props: {
                trip: createMockTrip(),
                tripMitra: createMockTripMitra(),
            },
        });

        // Tgl: 2026-05-01 muncul di header + hari 1
        expect(screen.getAllByText('Tgl: 2026-05-01').length).toBeGreaterThanOrEqual(1);
        // Tgl: 2026-05-03 hanya di header (tanggal selesai)
        expect(screen.getAllByText('Tgl: 2026-05-03').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('5 orang')).toBeInTheDocument();
        expect(screen.getByText('TZ: Asia/Jakarta')).toBeInTheDocument();
    });

    it('merender info client', () => {
        render(MitraTripShow, {
            props: {
                trip: createMockTrip(),
                tripMitra: createMockTripMitra(),
            },
        });

        expect(screen.getByText('Budi')).toBeInTheDocument();
        expect(screen.getByText('budi@example.com')).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 2 — ITINERARY & TOMBOL LAPOR
// ============================================================

describe('Mitra Trip Show — Itinerary & Lapor', () => {
    it('merender itinerary per hari', () => {
        render(MitraTripShow, {
            props: {
                trip: createMockTrip(),
                tripMitra: createMockTripMitra(),
            },
        });

        expect(screen.getByText('Hari Pertama')).toBeInTheDocument();
        expect(screen.getByText('Hari Kedua')).toBeInTheDocument();
    });

    it('menampilkan tombol "Lapor Hari Ini" hanya di hari yang cocok', () => {
        // isTodayInTimezone mock: true untuk 2026-05-01, false untuk lainnya
        render(MitraTripShow, {
            props: {
                trip: createMockTrip(),
                tripMitra: createMockTripMitra(),
            },
        });

        const laporButtons = screen.getAllByRole('link', {
            name: /Lapor Hari Ini/i,
        });
        // Hanya hari 1 (2026-05-01) yang dapat tombol
        expect(laporButtons.length).toBe(1);
    });

    it('TIDAK menampilkan tombol "Lapor Hari Ini" jika trip tidak aktif', () => {
        render(MitraTripShow, {
            props: {
                trip: createMockTrip({ status: 'scheduled' }),
                tripMitra: createMockTripMitra(),
            },
        });

        expect(
            screen.queryByRole('link', { name: /Lapor Hari Ini/i })
        ).not.toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 3 — TUGAS SAYA
// ============================================================

describe('Mitra Trip Show — Tugas Saya', () => {
    it('merender role, honor, dan instruksi mitra', () => {
        render(MitraTripShow, {
            props: {
                trip: createMockTrip(),
                tripMitra: createMockTripMitra(),
            },
        });

        expect(screen.getByText('Tugas Saya')).toBeInTheDocument();
        // Honor 1000000 muncul 2x (honor + total), pakai getAllByText
        expect(screen.getAllByText('Rp 1000000').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('Flat')).toBeInTheDocument();
        expect(
            screen.getByText('Jaga kebersihan dan koordinasi dengan tim')
        ).toBeInTheDocument();
    });

    it('TIDAK merender card Tugas Saya jika tripMitra null', () => {
        render(MitraTripShow, {
            props: {
                trip: createMockTrip(),
                tripMitra: null,
            },
        });

        expect(screen.queryByText('Tugas Saya')).not.toBeInTheDocument();
    });
});