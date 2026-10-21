import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import ClientBookingCreate from '../Create.svelte';

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
            return '/client/bookings/create/10';
        },
        get component() {
            return 'Client/Bookings/Create';
        },
    },
}));

// ============================================================
// MOCK UTILS
// ============================================================
vi.mock('@/utils/formatCurrency', () => ({
    formatCurrency: (n: number | string) => `Rp ${n}`,
}));

vi.mock('@/utils/duration', () => ({
    formatDurasi: (h: number, m: number) => `${h} Hari ${m} Malam`,
}));

vi.mock('@/utils/timezone', () => ({
    todayInTimezone: vi.fn().mockReturnValue('2026-04-01'),
}));

// ============================================================
// HELPERS
// ============================================================

const createMockPackage = (overrides: any = {}): any => ({
    id: 10,
    kode: 'PKT-BALI',
    nama: 'Paket Bali',
    slug: 'paket-bali',
    deskripsi: 'Deskripsi paket',
    kategori: 'wisata_alam',
    durasi_hari: 3,
    durasi_malam: 2,
    harga_per_orang: '1500000',
    harga_per_rombongan: null,
    min_peserta: 1,
    max_peserta: 10,
    timezone: 'Asia/Makassar',
    facilities: [],
    ...overrides,
});

const getForm = () => {
    const btn = screen.getByRole('button', {
        name: /Lanjut Isi Peserta|Konfirmasi Booking/i,
    });
    return btn.closest('form') as HTMLFormElement;
};

const getInput = (id: string) =>
    document.getElementById(id) as HTMLInputElement;

// ============================================================
// SETUP
// ============================================================

beforeEach(() => {
    vi.clearAllMocks();
});

// ============================================================
// KATEGORI 1 — STEP 1
// ============================================================

describe('Client Booking Create — Step 1: Info Booking', () => {
    it('merender form Step 1 dengan info paket', () => {
        render(ClientBookingCreate, {
            props: { package: createMockPackage() },
        });

        expect(screen.getByText('Paket Bali')).toBeInTheDocument();
        expect(screen.getByText('3 Hari 2 Malam')).toBeInTheDocument();
        expect(screen.getByText(/Rp 1500000\/orang/i)).toBeInTheDocument();
        expect(getInput('tanggal_keberangkatan')).toBeInTheDocument();
        expect(getInput('jumlah_peserta')).toBeInTheDocument();
    });

    it('mengisi default value jumlah_peserta dengan min_peserta', () => {
        render(ClientBookingCreate, {
            props: { package: createMockPackage({ min_peserta: 2 }) },
        });

        expect(getInput('jumlah_peserta').value).toBe('2');
    });

    it('memvalidasi tanggal keberangkatan wajib diisi saat Next diklik', async () => {
        render(ClientBookingCreate, {
            props: { package: createMockPackage() },
        });

        await fireEvent.submit(getForm());

        expect(
            screen.getByText('Tanggal keberangkatan wajib diisi.')
        ).toBeInTheDocument();
    });

    it('berhasil pindah ke Step 2 jika validasi lolos', async () => {
        render(ClientBookingCreate, {
            props: { package: createMockPackage() },
        });

        await fireEvent.input(getInput('tanggal_keberangkatan'), {
            target: { value: '2026-05-01' },
        });
        await fireEvent.submit(getForm());

        // ✅ `Data Peserta` muncul 2x (stepper + card heading)
        expect(
            screen.getAllByText('Data Peserta').length
        ).toBeGreaterThanOrEqual(1);

        // Step 1 hilang
        expect(
            screen.queryByText(/Tentukan tanggal & jumlah peserta/i)
        ).not.toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 2 — STEP 2
// ============================================================

describe('Client Booking Create — Step 2: Data Peserta', () => {
    const goToStep2 = async (jumlahPeserta = 2) => {
        render(ClientBookingCreate, {
            props: {
                package: createMockPackage({ min_peserta: 1 }),
            },
        });

        await fireEvent.input(getInput('tanggal_keberangkatan'), {
            target: { value: '2026-05-01' },
        });
        await fireEvent.input(getInput('jumlah_peserta'), {
            target: { value: String(jumlahPeserta) },
        });
        await fireEvent.submit(getForm());
    };

    it('merender form data peserta sesuai jumlah peserta', async () => {
        await goToStep2(2);

        expect(screen.getByText('Peserta 1')).toBeInTheDocument();
        expect(screen.getByText('Peserta 2')).toBeInTheDocument();
        expect(screen.queryByText('Peserta 3')).not.toBeInTheDocument();
    });

    it('menghitung total harga per orang dengan benar', async () => {
        await goToStep2(2);

        expect(screen.getByText('Rp 3000000')).toBeInTheDocument();
    });

    it('menghitung total harga rombongan jika harga_per_rombongan diisi', async () => {
        render(ClientBookingCreate, {
            props: {
                package: createMockPackage({
                    min_peserta: 1,
                    harga_per_rombongan: '5000000',
                }),
            },
        });

        await fireEvent.input(getInput('tanggal_keberangkatan'), {
            target: { value: '2026-05-01' },
        });
        await fireEvent.input(getInput('jumlah_peserta'), {
            target: { value: '2' },
        });
        await fireEvent.submit(getForm());

        expect(screen.getByText('Rp 5000000')).toBeInTheDocument();
    });

    it('submit memanggil router.post dengan payload yang benar', async () => {
        await goToStep2(2);

        await fireEvent.input(getInput('nama_0'), {
            target: { value: 'Budi' },
        });
        await fireEvent.input(getInput('umur_0'), {
            target: { value: '30' },
        });
        await fireEvent.input(getInput('nama_1'), {
            target: { value: 'Ani' },
        });

        await fireEvent.submit(getForm());

        expect(mockRouterPost).toHaveBeenCalledTimes(1);

        const [url, payload, options] = mockRouterPost.mock.calls[0];
        expect(url).toBe('/client/bookings/10');
        expect(payload).toEqual({
            tanggal_keberangkatan: '2026-05-01',
            jumlah_peserta: 2,
            catatan: null,
            participants: [
                { nama: 'Budi', umur: 30, no_hp: null, catatan: null },
                { nama: 'Ani', umur: null, no_hp: null, catatan: null },
            ],
        });
        expect(options).toHaveProperty('onError');
        expect(options).toHaveProperty('onFinish');
    });

    it('menampilkan error validasi jika nama peserta kosong saat submit', async () => {
        await goToStep2(2);

        await fireEvent.submit(getForm());

        expect(mockRouterPost).not.toHaveBeenCalled();

        // ✅ Error muncul 2x (untuk 2 peserta kosong)
        const errorMessages = screen.getAllByText(
            'Nama peserta minimal 2 karakter.'
        );
        expect(errorMessages.length).toBe(2);
    });
});