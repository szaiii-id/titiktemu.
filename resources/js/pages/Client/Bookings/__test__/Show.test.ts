import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import BookingShow from '../Show.svelte';

// ============================================================
// MOCK INERTIA
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
                        name: 'Client Test',
                        username: 'client',
                        email: 'client@example.com',
                        role: 'client',
                    },
                },
                unread_notifications: 0,
                flash: {},
            };
        },
        get url() {
            return '/client/bookings/1';
        },
        get component() {
            return 'Client/Bookings/Show';
        },
    },
}));

// ============================================================
// MOCK KOMPONEN UI — hanya yang tidak kritis
// ============================================================
vi.mock('@/global/ImageUploader.svelte', () => ({
    default: () => null,
}));
vi.mock('@/global/RupiahInput.svelte', () => ({
    default: () => null,
}));

// ============================================================
// MOCK UTILS
// ============================================================
vi.mock('@/utils/enums', () => ({
    bookingStatusBadge: (s: string) => `badge-${s}`,
    bookingStatusLabel: (s: string) => `Label ${s}`,
    paymentMetodeLabel: (s: string) => `Metode ${s}`,
}));

vi.mock('@/utils/formatCurrency', () => ({
    formatCurrency: (n: number | string) => `Rp ${n}`,
}));

vi.mock('@/utils/formatDate', () => ({
    formatDate: (d: string) => `Tgl: ${d}`,
    formatDateTime: (d: string) => `TglWaktu: ${d}`,
}));

vi.mock('@/utils/duration', () => ({
    formatDurasi: (h: number, m: number) => `${h} Hari ${m} Malam`,
}));

// ============================================================
// HELPERS
// ============================================================

const createMockBooking = (overrides: any = {}): any => ({
    id: 1,
    kode: 'BK-123',
    status: 'pending_payment',
    tanggal_keberangkatan: '2026-05-01',
    jumlah_peserta: 2,
    total_harga: '3000000',
    catatan: 'Catatan booking',
    expired_at: null,
    created_at: '2026-04-01T10:00:00Z',
    updated_at: '2026-04-01T10:00:00Z',
    package: {
        id: 10,
        nama: 'Paket Bali',
        kode: 'PKT-BALI',
        slug: 'paket-bali',
        timezone: 'Asia/Jakarta',
        harga_per_orang: '1500000',
        harga_per_rombongan: null,
        durasi_hari: 3,
        durasi_malam: 2,
        cover_image: null,
    },
    participants: [
        { id: 1, nama: 'Budi', umur: 30, no_hp: '08123', catatan: null },
        { id: 2, nama: 'Ani', umur: 28, no_hp: '08987', catatan: 'Alergi seafood' },
    ],
    payments: [],
    ...overrides,
});

// ============================================================
// SETUP
// ============================================================

beforeEach(() => {
    vi.clearAllMocks();
});

// ============================================================
// KATEGORI 1 — RENDERING DATA
// ============================================================

describe('Client Booking Show — Rendering Data', () => {
    it('merender status banner dan info booking', () => {
        render(BookingShow, { props: { booking: createMockBooking() } });

        // `Label pending_payment` muncul 2x (banner + badge)
        expect(screen.getAllByText('Label pending_payment').length).toBeGreaterThanOrEqual(1);

        // ✅ `BK-123` muncul 2x (banner + info card)
        expect(screen.getAllByText('BK-123').length).toBeGreaterThanOrEqual(1);

        expect(screen.getByText(/Silakan transfer sesuai total/i)).toBeInTheDocument();
    });

    it('merender info paket dan peserta', () => {
        render(BookingShow, { props: { booking: createMockBooking() } });

        expect(screen.getByText('Paket Bali')).toBeInTheDocument();
        expect(screen.getByText('3 Hari 2 Malam')).toBeInTheDocument();
        expect(screen.getAllByText('Rp 3000000').length).toBeGreaterThan(0);

        expect(screen.getByText('Budi')).toBeInTheDocument();
        expect(screen.getByText('Ani')).toBeInTheDocument();
        expect(screen.getByText('Alergi seafood')).toBeInTheDocument();
    });

    it('merender empty state pembayaran jika tidak ada payments', () => {
        render(BookingShow, { props: { booking: createMockBooking() } });

        expect(screen.getByText('Belum ada pembayaran')).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 2 — AKSI & MODAL
// ============================================================

describe('Client Booking Show — Aksi & Modal', () => {
    it('menampilkan tombol upload bukti jika status pending_payment', () => {
        render(BookingShow, { props: { booking: createMockBooking() } });

        const uploadBtns = screen.getAllByRole('button', {
            name: /Upload Bukti Transfer|Upload Bukti Bayar/i,
        });
        expect(uploadBtns.length).toBeGreaterThan(0);
    });

    it('membuka modal upload saat tombol diklik', async () => {
        render(BookingShow, { props: { booking: createMockBooking() } });

        const btn = screen.getAllByRole('button', { name: /Upload Bukti/i })[0];
        await fireEvent.click(btn);

        // ✅ Setelah modal terbuka, gunakan ID unik dari FormModal
        await waitFor(() => {
            const modalTitle = document.querySelector('#form-modal-title');
            expect(modalTitle).not.toBeNull();
            expect(modalTitle?.textContent?.trim()).toBe('Upload Bukti Transfer');
        });
    });

    it('membuka modal cancel saat tombol Batalkan diklik', async () => {
        render(BookingShow, { props: { booking: createMockBooking() } });

        const btn = screen.getByRole('button', { name: /Batalkan Booking/i });
        await fireEvent.click(btn);

        // ConfirmModal juga punya #confirm-modal-title
        await waitFor(() => {
            const modalTitle = document.querySelector('#confirm-modal-title');
            expect(modalTitle).not.toBeNull();
            expect(modalTitle?.textContent?.trim()).toBe('Batalkan Booking?');
        });
    });

    it('menampilkan E-Ticket card jika props eticket diberikan', () => {
        const eticket = {
            uuid: '123',
            pdf_url: '/eticket/123.pdf',
            generated_at: '2026-05-02T10:00:00Z',
        };
        render(BookingShow, {
            props: {
                booking: createMockBooking({ status: 'confirmed' }),
                eticket,
            },
        });

        expect(screen.getByText('E-Ticket Siap')).toBeInTheDocument();

        const link = screen.getByRole('link', { name: /Download E-Ticket/i });
        expect(link).toHaveAttribute('href', '/eticket/123.pdf');
    });
});