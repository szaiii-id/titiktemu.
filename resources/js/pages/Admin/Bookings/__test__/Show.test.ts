import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import BookingShow from '../Show.svelte';

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
            return '/admin/bookings/1';
        },
        get component() {
            return 'Admin/Bookings/Show';
        },
    },
}));

// ============================================================
// MOCK UTILS
// ============================================================
vi.mock('@/utils/enums', () => ({
    bookingStatusBadge: (s: string) => `badge-${s}`,
    bookingStatusLabel: (s: string) => `Label ${s}`,
    paymentMetodeLabel: (m: string) => `Metode ${m}`,
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

const createBookingDetail = (overrides: any = {}): any => ({
    id: 1,
    kode: 'BK-123',
    status: 'pending_payment',
    jumlah_peserta: 2,
    tanggal_keberangkatan: '2026-05-01',
    total_harga: 1500000,
    created_at: '2026-04-01T10:00:00Z',
    updated_at: '2026-04-02T10:00:00Z',
    expired_at: '2026-04-03T10:00:00Z',
    catatan: 'Tolong sediakan kamar non-smoking',
    package: {
        id: 10,
        nama: 'Trip Bali',
        kode: 'PKT-BALI',
        slug: 'trip-bali',
        timezone: 'Asia/Jakarta',
        harga_per_orang: 750000,
        harga_per_rombongan: null,
        durasi_hari: 3,
        durasi_malam: 2,
        cover_image: null,
    },
    client: {
        id: 100,
        name: 'Budi Santoso',
        email: 'budi@example.com',
        username: 'budisantoso',
    },
    participants: [
        { id: 1, nama: 'Budi', umur: 30, no_hp: '08123', catatan: null },
        {
            id: 2,
            nama: 'Ani',
            umur: 28,
            no_hp: '08987',
            catatan: 'Alergi seafood',
        },
    ],
    payments: [
        {
            id: 50,
            jumlah: 1500000,
            metode: 'transfer',
            bank_pengirim: 'BCA',
            nama_pengirim: 'Budi Santoso',
            bukti_transfer: 'payments/bukti.jpg',
            verified_at: null,
            verifier: null,
            catatan: null,
        },
    ],
    ...overrides,
});

// ============================================================
// SETUP
// ============================================================

beforeEach(() => {
    vi.clearAllMocks();
});

// ============================================================
// KATEGORI 1 — RENDERING DATA UTAMA
// ============================================================

describe('Admin Bookings Show — Rendering Data Utama', () => {
    it('merender info booking (kode, nama paket, status)', () => {
        render(BookingShow, { props: { booking: createBookingDetail() } });

        expect(screen.getByText('BK-123')).toBeInTheDocument();

        // ✅ FIX: "Trip Bali" muncul 2x (h1 header + card Info Paket)
        expect(
            screen.getAllByText('Trip Bali').length
        ).toBeGreaterThanOrEqual(1);

        // `Label pending_payment` muncul 1x (badge status)
        expect(
            screen.getAllByText('Label pending_payment').length
        ).toBeGreaterThanOrEqual(1);
    });

    it('merender info client (nama, email, username)', () => {
        render(BookingShow, { props: { booking: createBookingDetail() } });

        // "Budi Santoso" muncul 2x (client card + nama_pengirim di payment)
        expect(
            screen.getAllByText('Budi Santoso').length
        ).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('budi@example.com')).toBeInTheDocument();
        expect(screen.getByText('@budisantoso')).toBeInTheDocument();
    });

    it('merender daftar peserta beserta detailnya', () => {
        render(BookingShow, { props: { booking: createBookingDetail() } });

        expect(screen.getByText('Budi')).toBeInTheDocument();
        expect(screen.getByText('Ani')).toBeInTheDocument();

        // "30 tahun" adalah teks gabungan
        const umurText = screen.getByText((_content, element) => {
            const text = element?.textContent ?? '';
            return (
                element?.tagName === 'SPAN' &&
                text.includes('30') &&
                text.includes('tahun')
            );
        });
        expect(umurText).toBeInTheDocument();

        expect(screen.getByText('Alergi seafood')).toBeInTheDocument();
    });

    it('merender info paket (durasi, harga per orang)', () => {
        render(BookingShow, { props: { booking: createBookingDetail() } });

        expect(screen.getByText('3 Hari 2 Malam')).toBeInTheDocument();
        expect(screen.getByText('Rp 750000')).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 2 — RENDERING PEMBAYARAN
// ============================================================

describe('Admin Bookings Show — Rendering Pembayaran', () => {
    it('merender detail pembayaran jika ada', () => {
        render(BookingShow, { props: { booking: createBookingDetail() } });

        // `Rp 1500000` muncul 2x (total_harga di header + jumlah pembayaran)
        expect(
            screen.getAllByText('Rp 1500000').length
        ).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(/Metode transfer/i)).toBeInTheDocument();
        expect(screen.getByText(/BCA/)).toBeInTheDocument();
        expect(screen.getByText(/Atas nama:/i)).toBeInTheDocument();
    });

    it('menampilkan status "Menunggu Verifikasi" jika belum diverifikasi', () => {
        render(BookingShow, { props: { booking: createBookingDetail() } });

        expect(
            screen.getByText(/Menunggu Verifikasi/i)
        ).toBeInTheDocument();
    });

    it('menampilkan status "Terverifikasi" jika sudah diverifikasi', () => {
        const booking = createBookingDetail({
            payments: [
                {
                    ...createBookingDetail().payments[0],
                    verified_at: '2026-04-02T12:00:00Z',
                    verifier: {
                        id: 1,
                        name: 'Admin',
                        email: 'admin@example.com',
                    },
                },
            ],
        });
        render(BookingShow, { props: { booking } });

        expect(screen.getByText(/Terverifikasi/i)).toBeInTheDocument();
        expect(
            screen.getByText(/Diverifikasi oleh/i)
        ).toBeInTheDocument();
    });

    it('menampilkan empty state jika belum ada pembayaran', () => {
        const booking = createBookingDetail({ payments: [] });
        render(BookingShow, { props: { booking } });

        expect(
            screen.getByText(/Belum ada pembayaran/i)
        ).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 3 — TOMBOL AKSI BERDASARKAN STATUS
// ============================================================

describe('Admin Bookings Show — Tombol Aksi', () => {
    it('menampilkan tombol "Verifikasi Pembayaran" jika status pending_payment', () => {
        render(BookingShow, {
            props: {
                booking: createBookingDetail({ status: 'pending_payment' }),
            },
        });

        expect(
            screen.getByRole('button', { name: /Verifikasi Pembayaran/i })
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: /Konfirmasi Booking/i })
        ).not.toBeInTheDocument();
    });

    it('menampilkan tombol "Konfirmasi Booking" jika status payment_verified', () => {
        render(BookingShow, {
            props: {
                booking: createBookingDetail({ status: 'payment_verified' }),
            },
        });

        expect(
            screen.getByRole('button', { name: /Konfirmasi Booking/i })
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: /Verifikasi Pembayaran/i })
        ).not.toBeInTheDocument();
    });

    it('menampilkan tombol "Batalkan Booking" jika status bukan completed/cancelled', () => {
        render(BookingShow, {
            props: { booking: createBookingDetail({ status: 'confirmed' }) },
        });

        expect(
            screen.getByRole('button', { name: /Batalkan Booking/i })
        ).toBeInTheDocument();
    });

    it('TIDAK menampilkan tombol "Batalkan Booking" jika status completed', () => {
        render(BookingShow, {
            props: { booking: createBookingDetail({ status: 'completed' }) },
        });

        expect(
            screen.queryByRole('button', { name: /Batalkan Booking/i })
        ).not.toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 4 — MODAL INTERACTION
// ============================================================

describe('Admin Bookings Show — Modal Interaction', () => {
    it('membuka modal verifikasi saat tombol diklik', async () => {
        render(BookingShow, {
            props: {
                booking: createBookingDetail({ status: 'pending_payment' }),
            },
        });

        const verifyBtn = screen.getByRole('button', {
            name: /Verifikasi Pembayaran/i,
        });
        await fireEvent.click(verifyBtn);

        await waitFor(() => {
            const modalTitle = document.querySelector('#confirm-modal-title');
            expect(modalTitle).not.toBeNull();
            expect(modalTitle?.textContent?.trim()).toBe(
                'Verifikasi Pembayaran?'
            );
        });
    });

    it('membuka modal konfirmasi saat tombol diklik', async () => {
        render(BookingShow, {
            props: {
                booking: createBookingDetail({ status: 'payment_verified' }),
            },
        });

        const confirmBtn = screen.getByRole('button', {
            name: /Konfirmasi Booking/i,
        });
        await fireEvent.click(confirmBtn);

        await waitFor(() => {
            const modalTitle = document.querySelector('#confirm-modal-title');
            expect(modalTitle).not.toBeNull();
            expect(modalTitle?.textContent?.trim()).toBe(
                'Konfirmasi Booking?'
            );
        });
    });

    it('membuka modal pembatalan saat tombol diklik', async () => {
        render(BookingShow, {
            props: { booking: createBookingDetail({ status: 'confirmed' }) },
        });

        const cancelBtn = screen.getByRole('button', {
            name: /Batalkan Booking/i,
        });
        await fireEvent.click(cancelBtn);

        await waitFor(() => {
            const modalTitle = document.querySelector('#confirm-modal-title');
            expect(modalTitle).not.toBeNull();
            expect(modalTitle?.textContent?.trim()).toBe(
                'Batalkan Booking?'
            );
        });
    });
});