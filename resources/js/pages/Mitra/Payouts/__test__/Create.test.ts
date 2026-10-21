import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import MitraPayoutCreate from '../Create.svelte';

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
            return '/mitra/payouts/create';
        },
        get component() {
            return 'Mitra/Payouts/Create';
        },
    },
}));

// ============================================================
// MOCK UTILS
// ============================================================
vi.mock('@/utils/formatCurrency', () => ({
    formatCurrency: (n: number | string) => `Rp ${n}`,
}));

// ============================================================
// HELPERS
// ============================================================

const getForm = () => {
    const btn = screen.getByRole('button', {
        name: /Ajukan Pencairan|Mengirim/i,
    });
    return btn.closest('form') as HTMLFormElement;
};

const getInput = (id: string) =>
    document.getElementById(id) as HTMLInputElement;
const getTextarea = (id: string) =>
    document.getElementById(id) as HTMLTextAreaElement;

// ============================================================
// SETUP
// ============================================================

beforeEach(() => {
    vi.clearAllMocks();
});

// ============================================================
// KATEGORI 1 — RENDERING DASAR
// ============================================================

describe('Mitra Payout Create — Rendering', () => {
    it('merender saldo wallet', () => {
        render(MitraPayoutCreate, {
            props: {
                wallet: { saldo: '1500000' },
                minimumPayout: 100000,
            },
        });

        expect(screen.getByText('Saldo Tersedia')).toBeInTheDocument();
        // `Rp 1500000` muncul 1x di saldo card
        expect(screen.getAllByText('Rp 1500000').length).toBeGreaterThanOrEqual(1);
    });

    it('merender form input dengan label yang sesuai', () => {
        render(MitraPayoutCreate, {
            props: {
                wallet: { saldo: '1500000' },
                minimumPayout: 100000,
            },
        });

        // RupiahInput asli punya input number/id
        expect(getInput('bank')).toBeInTheDocument();
        expect(getInput('norek')).toBeInTheDocument();
        expect(getInput('nama')).toBeInTheDocument();
        expect(getTextarea('catatan')).toBeInTheDocument();
    });

    it('menampilkan tombol submit "Ajukan Pencairan"', () => {
        render(MitraPayoutCreate, {
            props: {
                wallet: { saldo: '1500000' },
                minimumPayout: 100000,
            },
        });

        expect(
            screen.getByRole('button', { name: /Ajukan Pencairan/i })
        ).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 2 — SUBMIT FORM
// ============================================================

describe('Mitra Payout Create — Submit', () => {
    it('memanggil router.post dengan payload yang benar', async () => {
        render(MitraPayoutCreate, {
            props: {
                wallet: { saldo: '1500000' },
                minimumPayout: 100000,
            },
        });

        await fireEvent.input(getInput('bank'), {
            target: { value: 'BCA' },
        });
        await fireEvent.input(getInput('norek'), {
            target: { value: '1234567890' },
        });
        await fireEvent.input(getInput('nama'), {
            target: { value: 'Budi' },
        });
        await fireEvent.input(getTextarea('catatan'), {
            target: { value: 'Mohon cepat' },
        });

        await fireEvent.submit(getForm());

        expect(mockRouterPost).toHaveBeenCalledTimes(1);

        const [url, payload, options] = mockRouterPost.mock.calls[0];
        expect(url).toBe('/mitra/payouts');
        expect(payload).toEqual({
            jumlah: 0, // Default dari state (RupiahInput asli tidak dipicu)
            bank_tujuan: 'BCA',
            no_rekening: '1234567890',
            nama_pemilik: 'Budi',
            catatan: 'Mohon cepat',
        });
        expect(options).toHaveProperty('onError');
        expect(options).toHaveProperty('onFinish');
    });

    it('mengirim catatan null jika kosong', async () => {
        render(MitraPayoutCreate, {
            props: {
                wallet: { saldo: '1500000' },
                minimumPayout: 100000,
            },
        });

        await fireEvent.input(getInput('bank'), {
            target: { value: 'BCA' },
        });
        await fireEvent.input(getInput('norek'), {
            target: { value: '1234567890' },
        });
        await fireEvent.input(getInput('nama'), {
            target: { value: 'Budi' },
        });

        await fireEvent.submit(getForm());

        const [, payload] = mockRouterPost.mock.calls[0];
        expect(payload.catatan).toBeNull();
    });
});

// ============================================================
// KATEGORI 3 — ERROR HANDLING
// ============================================================

describe('Mitra Payout Create — Error Handling', () => {
    it('menampilkan error dari server (onError) pada field yang sesuai', async () => {
        render(MitraPayoutCreate, {
            props: {
                wallet: { saldo: '1500000' },
                minimumPayout: 100000,
            },
        });

        await fireEvent.submit(getForm());

        const [, , options] = mockRouterPost.mock.calls[0];
        options.onError({
            bank_tujuan: 'Bank wajib diisi.',
            no_rekening: 'No rekening wajib diisi.',
            nama_pemilik: 'Nama pemilik wajib diisi.',
        });

        await waitFor(() => {
            expect(screen.getByText('Bank wajib diisi.')).toBeInTheDocument();
            expect(
                screen.getByText('No rekening wajib diisi.')
            ).toBeInTheDocument();
            expect(
                screen.getByText('Nama pemilik wajib diisi.')
            ).toBeInTheDocument();
        });
    });

    it('menampilkan error global (payout) jika ada', async () => {
        render(MitraPayoutCreate, {
            props: {
                wallet: { saldo: '1500000' },
                minimumPayout: 100000,
            },
        });

        await fireEvent.submit(getForm());

        const [, , options] = mockRouterPost.mock.calls[0];
        options.onError({
            payout: 'Anda sudah memiliki pengajuan hari ini.',
        });

        await waitFor(() => {
            expect(
                screen.getByText('Anda sudah memiliki pengajuan hari ini.')
            ).toBeInTheDocument();
        });
    });
});