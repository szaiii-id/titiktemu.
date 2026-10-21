import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import AdminDashboard from '../Dashboard.svelte';

// ============================================================
// MOCK INERTIA — WAJIB (satu-satunya mock)
// DashboardLayout asli dirender → butuh page.props, page.url,
// page.component, dan router.* agar tidak crash.
// ============================================================
vi.mock('@inertiajs/svelte', () => ({
    inertia: () => ({
        update: vi.fn(),
        destroy: vi.fn(),
    }),
    router: {
        visit: vi.fn(),
        post: vi.fn(),
        get: vi.fn(),
        reload: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
    },
    page: {
        get props() {
            return {
                auth: {
                    user: {
                        id: 1,
                        name: 'Admin Test',
                        role: 'admin',
                    },
                },
            };
        },
        get url() {
            return '/admin/dashboard';
        },
        get component() {
            return 'Admin/Dashboard';
        },
    },
}));

// ============================================================
// HELPERS
// ============================================================

const createMockStats = (overrides: any = {}) => ({
    totalAdmin: 2,
    totalMitra: 5,
    totalClient: 10,
    packages: { draft: 1, aktif: 3, arsip: 0, total: 4 },
    bookings: {
        pending_payment: 2,
        payment_verified: 1,
        confirmed: 3,
        in_progress: 0,
        completed: 5,
        cancelled: 1,
        total: 12,
        needs_attention: 2,
    },
    trips: {
        scheduled: 2,
        active: 1,
        completed: 3,
        cancelled: 0,
        total: 6,
        needs_mitra: 1,
    },
    daily_reports: {
        submitted: 2,
        verified: 5,
        rejected: 1,
        total: 8,
    },
    payouts: {
        pending: 1,
        approved: 2,
        paid: 3,
        rejected: 0,
        total: 6,
    },
    ...overrides,
});

/**
 * Ambil section div.mb-6 terdekat dari heading level 2.
 */
const getSectionByHeading = (name: string | RegExp): HTMLElement => {
    const heading = screen.getByRole('heading', { level: 2, name });
    return heading.closest('div.mb-6') as HTMLElement;
};

beforeEach(() => {
    vi.clearAllMocks();
});

// ============================================================
// KATEGORI 1 — HEADER & WELCOME
// ============================================================

describe('Admin Dashboard — Header', () => {
    it('menampilkan nama user di welcome banner', () => {
        render(AdminDashboard, { props: { stats: createMockStats() } });

        expect(
            screen.getByRole('heading', {
                name: /Selamat Datang, Admin Test/i,
            }),
        ).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 2 — BADGE PERINGATAN
// ============================================================

describe('Admin Dashboard — Badge Peringatan', () => {
    it('menampilkan badge "butuh perhatian" jika bookings.needs_attention > 0', () => {
        const stats = createMockStats();
        stats.bookings.needs_attention = 5;
        render(AdminDashboard, { props: { stats } });

        expect(
            screen.getByText(/5 butuh perhatian/i),
        ).toBeInTheDocument();
    });

    it('TIDAK menampilkan badge "butuh perhatian" jika bookings.needs_attention = 0', () => {
        const stats = createMockStats();
        stats.bookings.needs_attention = 0;
        render(AdminDashboard, { props: { stats } });

        expect(
            screen.queryByText(/butuh perhatian/i),
        ).not.toBeInTheDocument();
    });

    it('menampilkan badge "belum punya mitra" jika trips.needs_mitra > 0', () => {
        const stats = createMockStats();
        stats.trips.needs_mitra = 3;
        render(AdminDashboard, { props: { stats } });

        expect(
            screen.getByText(/3 belum punya mitra/i),
        ).toBeInTheDocument();
    });

    it('menampilkan badge "menunggu verifikasi" jika daily_reports.submitted > 0', () => {
        const stats = createMockStats();
        stats.daily_reports.submitted = 4;
        render(AdminDashboard, { props: { stats } });

        expect(
            screen.getByText(/4 menunggu verifikasi/i),
        ).toBeInTheDocument();
    });

    it('menampilkan badge "menunggu review" jika payouts.pending > 0', () => {
        const stats = createMockStats();
        stats.payouts.pending = 2;
        render(AdminDashboard, { props: { stats } });

        expect(
            screen.getByText(/2 menunggu review/i),
        ).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 3 — STAT CARD (render StatCard asli)
// ------------------------------------------------------------
// StatCard asli merender:
//   <p class="uppercase ...">{label}</p>
//   <p class="text-2xl ...">{value}</p>
// Wrapper <a href> jika href ada, <div> jika tidak.
// ============================================================

describe('Admin Dashboard — StatCard', () => {
    it('merender kartu Booking: Total=12, Pending=2', () => {
        render(AdminDashboard, {
            props: { stats: createMockStats() },
        });

        const section = getSectionByHeading('Booking');

        expect(
            within(section).getByText('Total'),
        ).toBeInTheDocument();
        expect(
            within(section).getByText('Pending'),
        ).toBeInTheDocument();
        expect(within(section).getByText('12')).toBeInTheDocument();
        expect(within(section).getByText('2')).toBeInTheDocument();
    });

    it('merender kartu Trip: Berjalan=1, href benar', () => {
        render(AdminDashboard, {
            props: { stats: createMockStats() },
        });

        const section = getSectionByHeading('Trip');

        expect(
            within(section).getByText('Berjalan'),
        ).toBeInTheDocument();
        expect(within(section).getByText('1')).toBeInTheDocument();

        // StatCard dengan href dirender sebagai <a>
        const activeTripLink = within(section)
            .getAllByRole('link')
            .find(
                (a) =>
                    a.getAttribute('href') ===
                    '/admin/trips?status=active',
            );
        expect(activeTripLink).toBeDefined();
    });

    it('merender kartu Pengguna: Admin=2, Mitra=5, Client=10 (tanpa href)', () => {
        render(AdminDashboard, {
            props: { stats: createMockStats() },
        });

        const section = getSectionByHeading('Pengguna');

        expect(
            within(section).getByText('Admin'),
        ).toBeInTheDocument();
        expect(
            within(section).getByText('Mitra'),
        ).toBeInTheDocument();
        expect(
            within(section).getByText('Client'),
        ).toBeInTheDocument();

        expect(within(section).getByText('2')).toBeInTheDocument();
        expect(within(section).getByText('5')).toBeInTheDocument();
        expect(within(section).getByText('10')).toBeInTheDocument();
    });
});