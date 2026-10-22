import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import CatalogIndex from '../Index.svelte';

// ============================================================
// MOCK INERTIA — lengkap dengan page.props
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
            return '/client/catalog';
        },
        get component() {
            return 'Client/Catalog/Index';
        },
    },
}));

// ============================================================
// MOCK UTILS
// ============================================================
vi.mock('@/utils/enums', () => ({
    packageKategoriBadge: (s: string) => `badge-kategori-${s}`,
    packageKategoriLabel: (s: string) => `Label Kategori ${s}`,
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
    kode: 'PKT-123',
    nama: 'Paket Bali',
    slug: 'paket-bali',
    deskripsi: 'Deskripsi paket bali',
    kategori: 'wisata_alam',
    durasi_hari: 3,
    durasi_malam: 2,
    harga_per_orang: '1500000',
    harga_per_rombongan: null,
    min_peserta: 1,
    max_peserta: 10,
    timezone: 'Asia/Jakarta',
    cover_image: null,
    created_at: '2026-01-01T10:00:00Z',
    ...overrides,
});

const defaultFilters = {
    search: '',
    kategori: '',
    sort: 'nama',
    direction: 'asc',
};

// ============================================================
// SETUP
// ============================================================

beforeEach(() => {
    vi.clearAllMocks();
});

// ============================================================
// KATEGORI 1 — RENDERING DATA PAKET
// ============================================================

describe('Client Catalog Index — Rendering', () => {
    it('merender kartu paket dengan info lengkap', () => {
        render(CatalogIndex, {
            props: {
                packages: createPaginator([createPackage()]),
                filters: defaultFilters,
            },
        });

        expect(screen.getByText('Paket Bali')).toBeInTheDocument();
        expect(screen.getByText('Deskripsi paket bali')).toBeInTheDocument();
        // `Rp 1500000` muncul 1x di card
        expect(screen.getAllByText('Rp 1500000').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('3 Hari 2 Malam')).toBeInTheDocument();
        expect(
            screen.getByText('Label Kategori wisata_alam')
        ).toBeInTheDocument();
    });

    it('merender tautan ke detail paket', () => {
        render(CatalogIndex, {
            props: {
                packages: createPaginator([createPackage()]),
                filters: defaultFilters,
            },
        });

        // Cari link card paket (bukan link di sidebar)
        const link = document.querySelector('a[href="/client/catalog/paket-bali"]');
        expect(link).not.toBeNull();
    });

    it('merender gambar cover jika ada', () => {
        render(CatalogIndex, {
            props: {
                packages: createPaginator([
                    createPackage({ cover_image: 'covers/bali.jpg' }),
                ]),
                filters: defaultFilters,
            },
        });

        const img = screen.getByRole('img');
        expect(img).toHaveAttribute('src', '/storage/covers/bali.jpg');
        expect(img).toHaveAttribute('alt', 'Paket Bali');
    });

    it('merender inisial nama jika tidak ada cover', () => {
        render(CatalogIndex, {
            props: {
                packages: createPaginator([createPackage({ cover_image: null })]),
                filters: defaultFilters,
            },
        });

        expect(screen.queryByRole('img')).not.toBeInTheDocument();
        // Inisial 'P' dari "Paket Bali" — mungkin muncul di card
        expect(screen.getAllByText('P').length).toBeGreaterThanOrEqual(1);
    });
});

// ============================================================
// KATEGORI 2 — FILTER & NAVIGASI
// ============================================================

describe('Client Catalog Index — Filter', () => {
    it('merender dropdown kategori dan sort', () => {
        render(CatalogIndex, {
            props: {
                packages: createPaginator([createPackage()]),
                filters: defaultFilters,
            },
        });

        expect(screen.getByLabelText('Filter kategori')).toBeInTheDocument();
        expect(screen.getByLabelText('Urutkan')).toBeInTheDocument();
    });

    it('memicu router.get saat kategori diubah', async () => {
        render(CatalogIndex, {
            props: {
                packages: createPaginator([createPackage()]),
                filters: defaultFilters,
            },
        });

        const kategoriSelect = screen.getByLabelText('Filter kategori');
        await fireEvent.change(kategoriSelect, {
            target: { value: 'budaya' },
        });

        expect(mockRouterGet).toHaveBeenCalledWith(
            '/client/catalog',
            expect.objectContaining({ kategori: 'budaya' }),
            expect.any(Object)
        );
    });

    it('memicu router.get saat sort diubah', async () => {
        render(CatalogIndex, {
            props: {
                packages: createPaginator([createPackage()]),
                filters: defaultFilters,
            },
        });

        const sortSelect = screen.getByLabelText('Urutkan');
        await fireEvent.change(sortSelect, {
            target: { value: 'harga_per_orang' },
        });

        expect(mockRouterGet).toHaveBeenCalledWith(
            '/client/catalog',
            expect.objectContaining({ sort: 'harga_per_orang' }),
            expect.any(Object)
        );
    });
});

// ============================================================
// KATEGORI 3 — EMPTY STATE
// ============================================================

describe('Client Catalog Index — Empty State', () => {
    it('merender pesan awal jika data kosong tanpa filter', () => {
        render(CatalogIndex, {
            props: {
                packages: createPaginator([]),
                filters: defaultFilters,
            },
        });

        // EmptyState asli merender teks langsung
        expect(screen.getByText('Belum ada paket tersedia')).toBeInTheDocument();
        expect(
            screen.getByText(/Paket wisata akan segera hadir/i)
        ).toBeInTheDocument();
    });

    it('merender pesan filter jika data kosong tapi ada filter', () => {
        render(CatalogIndex, {
            props: {
                packages: createPaginator([]),
                filters: { ...defaultFilters, search: 'xyz' },
            },
        });

        expect(screen.getByText('Tidak ada paket ditemukan')).toBeInTheDocument();
        expect(screen.getByText(/Coba ubah filter/i)).toBeInTheDocument();
    });
});