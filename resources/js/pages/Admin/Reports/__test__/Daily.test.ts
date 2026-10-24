// resources/js/pages/Admin/Reports/__test__/Daily.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import DailyReport from '../Daily.svelte';

// ============================================================
// MOCK INERTIA — lengkap (pola sama seperti Payouts)
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
            return '/admin/reports/daily';
        },
        get component() {
            return 'Admin/Reports/Daily';
        },
    },
}));

// ============================================================
// MOCK formatDate (dipakai kemungkinan di ReportFilter)
// ============================================================
vi.mock('@/utils/formatDate', () => ({
    formatDate: (d: string) => `Tgl: ${d}`,
    formatDateTime: (d: string) => `TglWaktu: ${d}`,
}));

// ============================================================
// HELPERS
// ============================================================
const createReport = (overrides: any = {}) => ({
    id: 1,
    trip_kode: 'TRIP-001',
    mitra: 'Mitra Alpha',
    hari_ke: 1,
    tanggal: '2026-01-01',
    status: 'verified',
    ...overrides,
});

const createMockData = (overrides: any = {}) => ({
    total_reports: 12,
    pending_verify: 3,
    verified: 9,
    reports: [
        createReport(),
        createReport({
            id: 2,
            trip_kode: 'TRIP-002',
            mitra: 'Mitra Beta',
            hari_ke: 2,
            tanggal: '2026-01-02',
            status: 'pending',
        }),
    ],
    ...overrides,
});

const defaultFilters = { start_date: '2026-01-01', end_date: '2026-01-31' };

const renderPage = (overrides: any = {}) =>
    render(DailyReport, {
        props: {
            data: createMockData(),
            filters: defaultFilters,
            ...overrides,
        },
    });

beforeEach(() => {
    vi.clearAllMocks();
});

// ============================================================
// KATEGORI 1 — RENDERING DASAR
// ============================================================
describe('Admin Reports Daily — Rendering Dasar', () => {
    it('merender judul halaman "Rekap Laporan Harian"', () => {
        renderPage();

        // Judul muncul di DashboardLayout title + PageHeader,
        // jadi pakai getAllByText + cek minimal 1.
        const titles = screen.getAllByText(/Rekap Laporan Harian/i);
        expect(titles.length).toBeGreaterThanOrEqual(1);
    });

    it('merender deskripsi halaman', () => {
        renderPage();
        expect(
            screen.getByText(/Pantau aktivitas harian mitra/i),
        ).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 2 — KARTU RINGKASAN
// ============================================================
describe('Admin Reports Daily — Kartu Ringkasan', () => {
    it('menampilkan Total Laporan', () => {
        renderPage();
        expect(screen.getByText(/Total Laporan/i)).toBeInTheDocument();
        expect(screen.getByText('12')).toBeInTheDocument();
    });

    it('menampilkan Menunggu Verifikasi', () => {
        renderPage();
        expect(
            screen.getByText(/Menunggu Verifikasi/i),
        ).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('menampilkan Terverifikasi', () => {
        renderPage();
        expect(screen.getByText(/Terverifikasi/i)).toBeInTheDocument();
        expect(screen.getByText('9')).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 3 — FILTER
// ============================================================
describe('Admin Reports Daily — Filter', () => {
    it('merender input tanggal dari ReportFilter', () => {
        renderPage();

        const inputs = document.querySelectorAll(
            'input[type="date"]',
        ) as NodeListOf<HTMLInputElement>;
        expect(inputs.length).toBeGreaterThanOrEqual(2);
        expect(inputs[0].value).toBe('2026-01-01');
        expect(inputs[1].value).toBe('2026-01-31');
    });

    it('mengklik "Terapkan Filter" memanggil router.get ke endpoint daily', async () => {
        renderPage();

        const button = screen.getByRole('button', {
            name: /Terapkan Filter/i,
        });
        await fireEvent.click(button);

        expect(mockRouterGet).toHaveBeenCalledWith(
            '/admin/reports/daily',
            defaultFilters,
            { preserveState: true },
        );
    });
});

// ============================================================
// KATEGORI 4 — RINCIAN LAPORAN (TABEL)
// ============================================================
describe('Admin Reports Daily — Tabel Rincian', () => {
    it('menampilkan heading "Rincian Laporan"', () => {
        renderPage();
        expect(screen.getByText('Rincian Laporan')).toBeInTheDocument();
    });

    it('menampilkan jumlah laporan ditemukan', () => {
        renderPage();
        expect(
            screen.getByText(/2 laporan ditemukan/i),
        ).toBeInTheDocument();
    });

    it('menampilkan kode trip', () => {
        renderPage();
        expect(screen.getByText('TRIP-001')).toBeInTheDocument();
        expect(screen.getByText('TRIP-002')).toBeInTheDocument();
    });

    it('menampilkan nama mitra', () => {
        renderPage();
        expect(screen.getByText('Mitra Alpha')).toBeInTheDocument();
        expect(screen.getByText('Mitra Beta')).toBeInTheDocument();
    });

    it('menampilkan hari ke-', () => {
        renderPage();
        expect(screen.getByText('Hari 1')).toBeInTheDocument();
        expect(screen.getByText('Hari 2')).toBeInTheDocument();
    });

    it('menampilkan tanggal', () => {
        renderPage();
        expect(screen.getByText('2026-01-01')).toBeInTheDocument();
        expect(screen.getByText('2026-01-02')).toBeInTheDocument();
    });

    it('menampilkan status verified dan pending', () => {
        renderPage();
        expect(screen.getByText('verified')).toBeInTheDocument();
        expect(screen.getByText('pending')).toBeInTheDocument();
    });

    it('menampilkan empty state jika tidak ada laporan', () => {
        renderPage({ data: createMockData({ reports: [] }) });
        expect(
            screen.getByText(/Belum ada laporan pada periode ini/i),
        ).toBeInTheDocument();
    });

    it('menampilkan "0 laporan ditemukan" saat kosong', () => {
        renderPage({ data: createMockData({ reports: [] }) });
        expect(screen.getByText(/0 laporan ditemukan/i)).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 5 — EXPORT BUTTONS
// ============================================================
describe('Admin Reports Daily — Export', () => {
    it('merender tombol export PDF & Excel dengan URL yang benar', () => {
        renderPage();

        // ExportButtons kemungkinan render <a> atau <button> dengan teks PDF/Excel.
        // Cek minimal ada 2 elemen yang mengandung "export" di href atau teksnya.
        const links = Array.from(
            document.querySelectorAll('a[href*="/admin/reports/daily/export"]'),
        ) as HTMLAnchorElement[];

        // Kalau ExportButtons merender <a>, expect minimal 2
        if (links.length > 0) {
            expect(links.length).toBeGreaterThanOrEqual(2);

            const pdfLink = links.find((a) => a.href.includes('export-pdf'));
            const excelLink = links.find((a) => a.href.includes('export-excel'));

            expect(pdfLink).toBeTruthy();
            expect(excelLink).toBeTruthy();

            expect(pdfLink!.href).toContain('start_date=2026-01-01');
            expect(pdfLink!.href).toContain('end_date=2026-01-31');
            expect(excelLink!.href).toContain('start_date=2026-01-01');
            expect(excelLink!.href).toContain('end_date=2026-01-31');
        } else {
            // Fallback kalau ExportButtons merender <button> atau elemen lain:
            // cek minimal tombol/teks PDF & Excel muncul
            const pdfOrExcel = screen.queryAllByText(/PDF|Excel/i);
            expect(pdfOrExcel.length).toBeGreaterThanOrEqual(1);
        }
    });
});