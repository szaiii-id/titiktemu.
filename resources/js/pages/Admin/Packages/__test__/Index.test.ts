import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import PackagesIndex from '../Index.svelte';

// ============================================================
// MOCK INERTIA — lengkap dengan page.props
// ============================================================
const mockRouterGet = vi.fn();
const mockRouterDelete = vi.fn();

vi.mock('@inertiajs/svelte', () => ({
    router: {
        get: (...args: any[]) => mockRouterGet(...args),
        delete: (...args: any[]) => mockRouterDelete(...args),
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
            return '/admin/packages';
        },
        get component() {
            return 'Admin/Packages/Index';
        },
    },
}));

// ============================================================
// MOCK UTILS
// ============================================================
vi.mock('@/utils/enums', () => ({
    packageKategoriBadge: (s: string) => `badge-kategori-${s}`,
    packageKategoriLabel: (s: string) => `Label Kategori ${s}`,
    packageStatusBadge: (s: string) => `badge-status-${s}`,
    packageStatusLabel: (s: string) => `Label Status ${s}`,
}));

vi.mock('@/utils/formatCurrency', () => ({
    formatCurrency: (n: number | string) => `Rp ${n}`,
}));

vi.mock('@/utils/duration', () => ({
    formatDurasi: (h: number, m: number) => `${h} Hari ${m} Malam`,
}));

// ============================================================
// HELPERS
// ============================================================

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

const createPackage = (overrides: any = {}): any => ({
    id: 1,
    nama: 'Paket Bali',
    kode: 'PKT-BALI',
    kategori: 'wisata_alam',
    durasi_hari: 3,
    durasi_malam: 2,
    harga_per_orang: 1500000,
    status: 'aktif',
    created_at: '2026-04-01T10:00:00Z',
    ...overrides,
});

const defaultFilters = {
    search: '',
    status: '',
    kategori: '',
    sort: 'created_at',
    direction: 'desc',
};

const defaultCounts = { draft: 1, aktif: 2, arsip: 0 };

// ============================================================
// SETUP
// ============================================================

beforeEach(() => {
    vi.clearAllMocks();
});

// ============================================================
// KATEGORI 1 — RENDERING DATA PAKET
// ============================================================

describe('Admin Packages Index — Rendering', () => {
    it('merender info paket (nama, kode, durasi, harga)', () => {
        render(PackagesIndex, {
            props: {
                packages: createPaginator([createPackage()]),
                filters: defaultFilters,
                statusCounts: defaultCounts,
            },
        });

        expect(screen.getByText('Paket Bali')).toBeInTheDocument();
        expect(screen.getByText('PKT-BALI')).toBeInTheDocument();
        expect(screen.getByText('3 Hari 2 Malam')).toBeInTheDocument();
        expect(screen.getByText('Rp 1500000')).toBeInTheDocument();
    });

    it('merender badge kategori dan status', () => {
        render(PackagesIndex, {
            props: {
                packages: createPaginator([createPackage()]),
                filters: defaultFilters,
                statusCounts: defaultCounts,
            },
        });

        const kategoriBadge = screen.getByText(
            'Label Kategori wisata_alam'
        );
        expect(kategoriBadge).toHaveClass('badge-kategori-wisata_alam');

        // ✅ FIX: "Label Status aktif" muncul 2x (tab + badge di tabel).
        // Cari elemen yang class-nya mengandung "badge-status-".
        const statusBadge = screen
            .getAllByText('Label Status aktif')
            .find((el) => el.className.includes('badge-status-'));

        expect(statusBadge).toBeDefined();
        expect(statusBadge).toHaveClass('badge-status-aktif');
    });

    it('merender tombol aksi Detail dan Hapus', () => {
        render(PackagesIndex, {
            props: {
                packages: createPaginator([createPackage()]),
                filters: defaultFilters,
                statusCounts: defaultCounts,
            },
        });

        expect(
            screen.getByRole('link', { name: /Lihat detail paket/i })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /Hapus paket/i })
        ).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 2 — EMPTY STATE
// ============================================================

describe('Admin Packages Index — Empty State', () => {
    it('merender pesan awal jika data kosong tanpa filter', () => {
        render(PackagesIndex, {
            props: {
                packages: createPaginator([]),
                filters: defaultFilters,
                statusCounts: defaultCounts,
            },
        });

        expect(screen.getByText('Belum ada paket')).toBeInTheDocument();
        expect(
            screen.getByText(/Mulai dengan menambahkan paket wisata/i)
        ).toBeInTheDocument();
    });

    it('merender pesan filter jika data kosong tapi ada filter', () => {
        render(PackagesIndex, {
            props: {
                packages: createPaginator([]),
                filters: { ...defaultFilters, search: 'xyz' },
                statusCounts: defaultCounts,
            },
        });

        expect(
            screen.getByText('Tidak ada hasil ditemukan')
        ).toBeInTheDocument();
        expect(
            screen.getByText(/Tidak ditemukan paket dengan filter/i)
        ).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 3 — INTERAKSI MODAL HAPUS
// ============================================================

describe('Admin Packages Index — Modal Hapus', () => {
    it('membuka modal konfirmasi hapus saat tombol Hapus diklik', async () => {
        render(PackagesIndex, {
            props: {
                packages: createPaginator([createPackage()]),
                filters: defaultFilters,
                statusCounts: defaultCounts,
            },
        });

        const deleteBtn = screen.getByRole('button', {
            name: /Hapus paket/i,
        });
        await fireEvent.click(deleteBtn);

        await waitFor(() => {
            const modalTitle = document.querySelector('#confirm-modal-title');
            expect(modalTitle).not.toBeNull();
            expect(modalTitle?.textContent?.trim()).toBe('Hapus Paket?');
        });
    });
});