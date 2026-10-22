import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import ClientDashboard from '../Dashboard.svelte';

// ============================================================
// MOCK INERTIA
// ------------------------------------------------------------
// DashboardLayout asli dirender (bukan di-mock), sehingga
// dependency-nya WAJIB di-mock lengkap:
//   - page.props  → dibaca oleh Dashboard.svelte (user)
//   - page.url    → dibaca oleh DashboardLayout (isActive menu)
//   - page.component → dibaca oleh DashboardLayout (active state)
//   - router.*    → dibaca oleh DashboardLayout (navigasi menu)
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
                    user: { id: 1, name: 'Client Test', role: 'client' },
                },
            };
        },
        get url() {
            return '/client/dashboard';
        },
        get component() {
            return 'Client/Dashboard';
        },
    },
}));

beforeEach(() => {
    vi.clearAllMocks();
});

// ============================================================
// KATEGORI 1 — HEADER & WELCOME
// ============================================================

describe('Client Dashboard — Header', () => {
    it('menampilkan nama user di welcome banner', () => {
        render(ClientDashboard);

        expect(
            screen.getByRole('heading', {
                name: /Selamat Datang, Client Test/i,
            }),
        ).toBeInTheDocument();
    });

    it('menampilkan deskripsi singkat', () => {
        render(ClientDashboard);

        expect(
            screen.getByText(
                /Jelajahi trip dan bundle perjalanan yang tersedia/i,
            ),
        ).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 2 — KARTU AKSES CEPAT
// ------------------------------------------------------------
// Sidebar DashboardLayout JUGA berisi link dengan teks yang
// sama ("Katalog Paket", "Booking Saya", "Profile Saya").
//
// Best practice: scope query ke kartu via data-testid, dan
// verifikasi PERILAKU (href), bukan sekadar keberadaan teks.
// ============================================================

describe('Client Dashboard — Akses Cepat', () => {
    it('merender 3 kartu akses cepat dengan label masing-masing', () => {
        render(ClientDashboard);

        const katalogCard = screen.getByTestId('card-katalog');
        const bookingCard = screen.getByTestId('card-booking');
        const profileCard = screen.getByTestId('card-profile');

        // Label dicek di dalam kartu, bukan di seluruh dokumen,
        // sehingga tidak bertabrakan dengan label sidebar.
        expect(within(katalogCard).getByText('Katalog Paket')).toBeInTheDocument();
        expect(within(bookingCard).getByText('Booking Saya')).toBeInTheDocument();
        expect(within(profileCard).getByText('Profile Saya')).toBeInTheDocument();
    });

    it('kartu Katalog mengarah ke /client/catalog', () => {
        render(ClientDashboard);

        const card = screen.getByTestId('card-katalog');
        // Kartu adalah <a>, jadi bisa diambil langsung via href
        expect(card).toHaveAttribute('href', '/client/catalog');
    });

    it('kartu Booking mengarah ke /client/bookings', () => {
        render(ClientDashboard);

        const card = screen.getByTestId('card-booking');
        expect(card).toHaveAttribute('href', '/client/bookings');
    });

    it('kartu Profile mengarah ke /client/profile', () => {
        render(ClientDashboard);

        const card = screen.getByTestId('card-profile');
        expect(card).toHaveAttribute('href', '/client/profile');
    });
});