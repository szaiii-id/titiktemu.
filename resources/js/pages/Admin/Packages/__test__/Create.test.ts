import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import PackagesCreate from '../Create.svelte';

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
            return '/admin/packages/create';
        },
        get component() {
            return 'Admin/Packages/Create';
        },
    },
}));

// ============================================================
// HELPERS
// ============================================================

const getForm = () => {
    const btn = screen.getByRole('button', {
        name: /Lanjut ke Harga|Buat Paket/i,
    });
    return btn.closest('form') as HTMLFormElement;
};

const getInput = (id: string) =>
    document.getElementById(id) as HTMLInputElement;
const getSelect = (id: string) =>
    document.getElementById(id) as HTMLSelectElement;
const getTextarea = (id: string) =>
    document.getElementById(id) as HTMLTextAreaElement;

// ============================================================
// SETUP
// ============================================================

beforeEach(() => {
    vi.clearAllMocks();
});

// ============================================================
// KATEGORI 1 — RENDERING & STEP 1
// ============================================================

describe('Admin Packages Create — Step 1: Info Dasar', () => {
    it('merender form Step 1 dengan input yang sesuai', () => {
        render(PackagesCreate);

        expect(
            screen.getByText(/Informasi Dasar Paket/i)
        ).toBeInTheDocument();
        expect(getInput('nama')).toBeInTheDocument();
        expect(getTextarea('deskripsi')).toBeInTheDocument();
        expect(getSelect('kategori')).toBeInTheDocument();
        expect(getSelect('timezone')).toBeInTheDocument();
        expect(getInput('durasi_hari')).toBeInTheDocument();
        expect(getInput('min_peserta')).toBeInTheDocument();
    });

    it('memvalidasi nama paket minimal 3 karakter saat Next diklik', async () => {
        render(PackagesCreate);

        await fireEvent.input(getInput('nama'), {
            target: { value: 'ab' },
        });
        await fireEvent.submit(getForm());

        expect(
            screen.getByText('Nama paket minimal 3 karakter.')
        ).toBeInTheDocument();
        // Tetap di step 1
        expect(
            screen.queryByText(/Harga Jual Paket/i)
        ).not.toBeInTheDocument();
    });

    it('memvalidasi durasi malam < durasi hari saat Next diklik', async () => {
        render(PackagesCreate);

        await fireEvent.input(getInput('nama'), {
            target: { value: 'Paket Test' },
        });
        await fireEvent.input(getInput('durasi_hari'), {
            target: { value: '2' },
        });
        await fireEvent.input(getInput('durasi_malam'), {
            target: { value: '2' },
        });

        await fireEvent.submit(getForm());

        expect(
            screen.getByText(
                'Durasi malam harus kurang dari durasi hari.'
            )
        ).toBeInTheDocument();
    });

    it('memvalidasi min_peserta tidak lebih besar dari max_peserta', async () => {
        render(PackagesCreate);

        await fireEvent.input(getInput('nama'), {
            target: { value: 'Paket Test' },
        });
        await fireEvent.input(getInput('min_peserta'), {
            target: { value: '10' },
        });
        await fireEvent.input(getInput('max_peserta'), {
            target: { value: '5' },
        });

        await fireEvent.submit(getForm());

        expect(
            screen.getByText(
                'Minimal peserta tidak boleh lebih besar dari maksimal peserta.'
            )
        ).toBeInTheDocument();
    });

    it('berhasil pindah ke Step 2 jika validasi lolos', async () => {
        render(PackagesCreate);

        await fireEvent.input(getInput('nama'), {
            target: { value: 'Paket Test' },
        });
        await fireEvent.input(getInput('durasi_hari'), {
            target: { value: '2' },
        });
        await fireEvent.input(getInput('durasi_malam'), {
            target: { value: '1' },
        });

        await fireEvent.submit(getForm());

        expect(screen.getByText(/Harga Jual Paket/i)).toBeInTheDocument();
        expect(
            screen.queryByText(/Informasi Dasar Paket/i)
        ).not.toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 2 — STEP 2 (HARGA) & SUBMIT
// ============================================================

describe('Admin Packages Create — Step 2: Harga', () => {
    const goToStep2 = async () => {
        render(PackagesCreate);
        await fireEvent.input(getInput('nama'), {
            target: { value: 'Paket Test' },
        });
        await fireEvent.submit(getForm());
    };

    it('merender form Step 2 dengan input harga', async () => {
        await goToStep2();

        expect(screen.getByText(/Harga Jual Paket/i)).toBeInTheDocument();
        expect(getInput('harga_per_orang')).toBeInTheDocument();
        expect(getInput('harga_per_rombongan')).toBeInTheDocument();
    });

    it('tombol "Kembali" mengembalikan ke Step 1', async () => {
        await goToStep2();

        const backBtn = screen.getByRole('button', { name: /Kembali/i });
        await fireEvent.click(backBtn);

        expect(
            screen.getByText(/Informasi Dasar Paket/i)
        ).toBeInTheDocument();
    });

    it('submit form memanggil router.post dengan payload benar', async () => {
        await goToStep2();

        await fireEvent.input(getInput('harga_per_orang'), {
            target: { value: '1500000' },
        });
        await fireEvent.input(getInput('harga_per_rombongan'), {
            target: { value: '5000000' },
        });

        await fireEvent.submit(getForm());

        expect(mockRouterPost).toHaveBeenCalledTimes(1);

        const [url, payload, options] = mockRouterPost.mock.calls[0];
        expect(url).toBe('/admin/packages');
        expect(payload).toEqual({
            nama: 'Paket Test',
            deskripsi: null,
            kategori: 'wisata_alam',
            timezone: 'Asia/Makassar',
            durasi_hari: 1,
            durasi_malam: 0,
            min_peserta: 1,
            max_peserta: 20,
            harga_per_orang: 1500000,
            harga_per_rombongan: 5000000,
        });
        expect(options).toHaveProperty('onError');
        expect(options).toHaveProperty('onFinish');
    });

    it('harga_per_rombongan kosong menjadi null di payload', async () => {
        await goToStep2();

        await fireEvent.input(getInput('harga_per_orang'), {
            target: { value: '1500000' },
        });

        await fireEvent.submit(getForm());

        const [, payload] = mockRouterPost.mock.calls[0];
        expect(payload.harga_per_rombongan).toBeNull();
    });

    it('memformat angka dengan titik menjadi number yang benar', async () => {
        await goToStep2();

        // Ketik "1.500.000" (dengan titik)
        await fireEvent.input(getInput('harga_per_orang'), {
            target: { value: '1.500.000' },
        });

        await fireEvent.submit(getForm());

        const [, payload] = mockRouterPost.mock.calls[0];
        // Harus diparse jadi 1500000 (bukan 1.5)
        expect(payload.harga_per_orang).toBe(1500000);
    });

    it('menampilkan error server (onError) dan kembali ke Step 1 jika error di field Step 1', async () => {
        await goToStep2();

        await fireEvent.input(getInput('harga_per_orang'), {
            target: { value: '1500000' },
        });
        await fireEvent.submit(getForm());

        const [, , options] = mockRouterPost.mock.calls[0];
        options.onError({ nama: 'Nama sudah dipakai.' });

        await waitFor(() => {
            expect(
                screen.getByText(/Informasi Dasar Paket/i)
            ).toBeInTheDocument();
            expect(
                screen.getByText('Nama sudah dipakai.')
            ).toBeInTheDocument();
        });
    });
});