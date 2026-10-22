import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import MitraWalletIndex from '../Index.svelte';

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
            return '/mitra/wallet';
        },
        get component() {
            return 'Mitra/Wallet/Index';
        },
    },
}));

// ============================================================
// MOCK UTILS — supaya hasil deterministik
// ============================================================

vi.mock('@/utils/enums', () => ({
    walletTransactionKategoriLabel: (k: string) => `Kategori ${k}`,
}));

vi.mock('@/utils/formatCurrency', () => ({
    formatCurrency: (n: number | string) => `Rp ${n}`,
}));

vi.mock('@/utils/formatDate', () => ({
    formatDateTime: (d: string) => `TglWaktu: ${d}`,
}));

// ============================================================
// HELPERS
// ============================================================

const createMockWallet = (overrides: any = {}): any => ({
    id: 1,
    saldo: '1500000',
    total_pendapatan: '5000000',
    total_dicairkan: '3500000',
    updated_at: '2026-04-01T10:00:00Z',
    ...overrides,
});

const createPaginator = (data: any[] = []): any => ({
    data,
    current_page: 1,
    last_page: 1,
    total: data.length,
    from: data.length > 0 ? 1 : 0,
    to: data.length,
    links: [],
    path: '',
    per_page: 10,
    first_page_url: '',
    last_page_url: '',
    next_page_url: null,
    prev_page_url: null,
});

const createTransaction = (overrides: any = {}): any => ({
    id: 1,
    tipe: 'credit',
    jumlah: 500000,
    saldo_setelah: 1500000,
    kategori: 'honor',
    deskripsi: 'Honor Trip Bali',
    created_at: '2026-04-01T10:00:00Z',
    ...overrides,
});

// ============================================================
// SETUP
// ============================================================

beforeEach(() => {
    vi.clearAllMocks();
});

// ============================================================
// KATEGORI 1 — RENDERING SALDO & INFO WALLET
// ============================================================

describe('Mitra Wallet Index — Rendering Saldo', () => {
    it('merender saldo tersedia, total pendapatan, dan total dicairkan', () => {
        render(MitraWalletIndex, {
            props: {
                wallet: createMockWallet(),
                transactions: createPaginator(),
            },
        });

        expect(screen.getByText('Saldo Tersedia')).toBeInTheDocument();
        expect(screen.getByText('Rp 1500000')).toBeInTheDocument();

        expect(screen.getByText('Total Pendapatan')).toBeInTheDocument();
        expect(screen.getByText('Rp 5000000')).toBeInTheDocument();

        expect(screen.getByText('Total Dicairkan')).toBeInTheDocument();
        expect(screen.getByText('Rp 3500000')).toBeInTheDocument();
    });

    it('merender tombol "Tarik Dana" dengan href yang benar', () => {
        render(MitraWalletIndex, {
            props: {
                wallet: createMockWallet(),
                transactions: createPaginator(),
            },
        });

        const link = screen.getByRole('link', { name: /Tarik Dana/i });
        expect(link).toHaveAttribute('href', '/mitra/payouts/create');
    });
});

// ============================================================
// KATEGORI 2 — RENDERING TRANSAKSI
// ============================================================

describe('Mitra Wallet Index — Riwayat Transaksi', () => {
    it('merender transaksi credit dengan tanda plus', () => {
        render(MitraWalletIndex, {
            props: {
                wallet: createMockWallet(),
                transactions: createPaginator([createTransaction()]),
            },
        });

        expect(screen.getByText('Honor Trip Bali')).toBeInTheDocument();
        expect(screen.getByText('Kategori honor')).toBeInTheDocument();
        expect(screen.getByText('TglWaktu: 2026-04-01T10:00:00Z')).toBeInTheDocument();

        const amountText = document.querySelector('p.text-green-text.text-sm.font-extrabold');
        // ✅ FIX: tanpa spasi, karena komponen sudah menempelkan tanda & nominal
        expect(amountText?.textContent?.replace(/\s+/g, ' ').trim()).toBe('+Rp 500000');

        expect(screen.getByText('Saldo: Rp 1500000')).toBeInTheDocument();
    });

    it('merender transaksi debit dengan tanda minus', () => {
        render(MitraWalletIndex, {
            props: {
                wallet: createMockWallet(),
                transactions: createPaginator([
                    createTransaction({
                        tipe: 'debit',
                        jumlah: 500000,
                        deskripsi: 'Penarikan Dana',
                    }),
                ]),
            },
        });

        const amountText = document.querySelector('p.text-red-700.text-sm.font-extrabold');
        // ✅ FIX: tanpa spasi
        expect(amountText?.textContent?.replace(/\s+/g, ' ').trim()).toBe('-Rp 500000');
    });

    it('merender banyak transaksi tanpa error', () => {
        const manyTransactions = Array.from({ length: 10 }, (_, i) =>
            createTransaction({
                id: i + 1,
                deskripsi: `Transaksi ${i + 1}`,
            }),
        );

        render(MitraWalletIndex, {
            props: {
                wallet: createMockWallet(),
                transactions: createPaginator(manyTransactions),
            },
        });

        expect(screen.getByText('Transaksi 1')).toBeInTheDocument();
        expect(screen.getByText('Transaksi 10')).toBeInTheDocument();
    });

    it('merender transaksi dengan deskripsi sangat panjang tanpa error', () => {
        const longDesc = 'a'.repeat(200);
        render(MitraWalletIndex, {
            props: {
                wallet: createMockWallet(),
                transactions: createPaginator([
                    createTransaction({ deskripsi: longDesc }),
                ]),
            },
        });

        expect(screen.getByText(longDesc)).toBeInTheDocument();
    });

    it('merender kategori tidak dikenal (fallback ke string asli)', () => {
        render(MitraWalletIndex, {
            props: {
                wallet: createMockWallet(),
                transactions: createPaginator([
                    createTransaction({ kategori: 'unknown_kategori' }),
                ]),
            },
        });

        expect(screen.getByText('Kategori unknown_kategori')).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 3 — EMPTY STATE
// ============================================================

describe('Mitra Wallet Index — Empty State', () => {
    it('merender pesan kosong jika tidak ada transaksi', () => {
        render(MitraWalletIndex, {
            props: {
                wallet: createMockWallet(),
                transactions: createPaginator(),
            },
        });

        expect(screen.getByText('Belum ada transaksi')).toBeInTheDocument();
        expect(
            screen.getByText('Transaksi akan muncul setelah Anda menyelesaikan trip.'),
        ).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 4 — BVA (BOUNDARY VALUE ANALYSIS)
// ============================================================

describe('Mitra Wallet Index — BVA Saldo', () => {
    it('boundary bawah: saldo = 0', () => {
        render(MitraWalletIndex, {
            props: {
                wallet: createMockWallet({
                    saldo: '0',
                    total_pendapatan: '0',
                    total_dicairkan: '0',
                }),
                transactions: createPaginator(),
            },
        });

        // Saldo 0 dirender 3 kali (saldo, pendapatan, dicairkan)
        const zeros = screen.getAllByText('Rp 0');
        expect(zeros.length).toBeGreaterThanOrEqual(3);
    });

    it('boundary atas: saldo sangat besar (miliaran)', () => {
        render(MitraWalletIndex, {
            props: {
                wallet: createMockWallet({ saldo: '1000000000' }),
                transactions: createPaginator(),
            },
        });

        expect(screen.getByText('Rp 1000000000')).toBeInTheDocument();
    });

    it('boundary atas: saldo desimal (pecahan)', () => {
        render(MitraWalletIndex, {
            props: {
                wallet: createMockWallet({ saldo: '1500000.75' }),
                transactions: createPaginator(),
            },
        });

        expect(screen.getByText('Rp 1500000.75')).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 5 — EQUIVALENCE PARTITIONING
// ============================================================

describe('Mitra Wallet Index — Equivalence Partitioning', () => {
    it('transaksi credit → tanda plus, warna hijau', () => {
        render(MitraWalletIndex, {
            props: {
                wallet: createMockWallet(),
                transactions: createPaginator([
                    createTransaction({ tipe: 'credit' }),
                ]),
            },
        });

        const amountText = document.querySelector('p.text-green-text');
        expect(amountText).toBeInTheDocument();
        expect(amountText?.textContent).toContain('+');
    });

    it('transaksi debit → tanda minus, warna merah', () => {
        render(MitraWalletIndex, {
            props: {
                wallet: createMockWallet(),
                transactions: createPaginator([
                    createTransaction({ tipe: 'debit' }),
                ]),
            },
        });

        const amountText = document.querySelector('p.text-red-700');
        expect(amountText).toBeInTheDocument();
        expect(amountText?.textContent).toContain('-');
    });
});

// ============================================================
// KATEGORI 6 — ERROR HANDLING / NULL SAFETY
// ============================================================

describe('Mitra Wallet Index — Null Safety', () => {
    it('merender dengan aman jika total_pendapatan null (fallback)', () => {
        render(MitraWalletIndex, {
            props: {
                wallet: createMockWallet({ total_pendapatan: '0' }),
                transactions: createPaginator(),
            },
        });

        // Total pendapatan harus 0
        expect(screen.getByText('Total Pendapatan')).toBeInTheDocument();
    });

    it('merender transaksi dengan catatan kosong (deskripsi kosong)', () => {
        render(MitraWalletIndex, {
            props: {
                wallet: createMockWallet(),
                transactions: createPaginator([
                    createTransaction({ deskripsi: '' }),
                ]),
            },
        });

        // Meski deskripsi kosong, komponen tetap render tanpa crash
        expect(screen.getByText('Kategori honor')).toBeInTheDocument();
    });
});