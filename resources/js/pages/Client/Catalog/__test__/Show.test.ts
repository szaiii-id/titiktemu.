import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import CatalogShow from '../Show.svelte';

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
            return '/client/catalog/paket-bali';
        },
        get component() {
            return 'Client/Catalog/Show';
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

vi.mock('@/utils/timezone', () => ({
    timezoneLabelLong: (tz: string) => `TZ: ${tz}`,
}));

// ============================================================
// HELPERS
// ============================================================

const createMockPackage = (overrides: any = {}): any => ({
    id: 10,
    kode: 'PKT-BALI',
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
    timezone: 'Asia/Makassar',
    cover_image: null,
    creator: null,
    days: [
        {
            id: 1,
            hari_ke: 1,
            judul: 'Hari Pertama',
            deskripsi: 'Kegiatan hari 1',
            jam_mulai: '08:00:00',
            jam_selesai: '17:00:00',
            lokasi: 'Lokasi 1',
            costs: [],
        },
    ],
    facilities: [
        { id: 1, tipe: 'include', nama: 'Hotel' },
        { id: 2, tipe: 'include', nama: 'Makan' },
        { id: 3, tipe: 'exclude', nama: 'Tiket Pesawat' },
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
// KATEGORI 1 — HERO & INFO UTAMA
// ============================================================

describe('Client Catalog Show — Hero & Info', () => {
    it('merender nama paket dan deskripsi di hero section', () => {
        render(CatalogShow, { props: { package: createMockPackage() } });

        expect(
            screen.getByRole('heading', { level: 1, name: 'Paket Bali' })
        ).toBeInTheDocument();
        expect(screen.getByText('Deskripsi paket bali')).toBeInTheDocument();
    });

    it('merender badge kategori, durasi, dan timezone', () => {
        render(CatalogShow, { props: { package: createMockPackage() } });

        expect(
            screen.getByText('Label Kategori wisata_alam')
        ).toBeInTheDocument();

        // Durasi muncul di hero + booking card
        expect(
            screen.getAllByText('3 Hari 2 Malam').length
        ).toBeGreaterThanOrEqual(1);

        // Timezone muncul di hero + booking card
        expect(
            screen.getAllByText('TZ: Asia/Makassar').length
        ).toBeGreaterThanOrEqual(1);
    });

    it('merender inisial besar jika tidak ada cover_image', () => {
        render(CatalogShow, {
            props: { package: createMockPackage({ cover_image: null }) },
        });

        // Inisial 'P' dari "Paket Bali" di hero section — mungkin muncul beberapa kali
        expect(screen.getAllByText('P').length).toBeGreaterThanOrEqual(1);
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('merender gambar cover jika cover_image ada', () => {
        render(CatalogShow, {
            props: {
                package: createMockPackage({ cover_image: 'covers/bali.jpg' }),
            },
        });

        const img = screen.getByRole('img');
        expect(img).toHaveAttribute('src', '/storage/covers/bali.jpg');
        expect(img).toHaveAttribute('alt', 'Paket Bali');
    });
});

// ============================================================
// KATEGORI 2 — ITINERARY
// ============================================================

describe('Client Catalog Show — Itinerary', () => {
    it('merender itinerary sesuai jumlah hari', () => {
        const pkg = createMockPackage({
            days: [
                {
                    id: 1,
                    hari_ke: 1,
                    judul: 'Hari Pertama',
                    deskripsi: 'Kegiatan 1',
                    jam_mulai: '08:00:00',
                    jam_selesai: '17:00:00',
                    lokasi: 'Lokasi 1',
                    costs: [],
                },
                {
                    id: 2,
                    hari_ke: 2,
                    judul: 'Hari Kedua',
                    deskripsi: 'Kegiatan 2',
                    jam_mulai: null,
                    jam_selesai: null,
                    lokasi: null,
                    costs: [],
                },
            ],
        });
        render(CatalogShow, { props: { package: pkg } });

        // Hari dan deskripsi dirender normal
        expect(screen.getByText('Hari Pertama')).toBeInTheDocument();
        expect(screen.getByText('Hari Kedua')).toBeInTheDocument();

        // ✅ Jam: cari elemen yang textContent-nya mengandung "08:00" dan "17:00"
        // (dash-nya bisa – atau - atau —, tidak penting)
        const timeElement = screen.getByText((_content, element) => {
            const text = element?.textContent ?? '';
            return (
                element?.tagName === 'SPAN' &&
                text.includes('08:00') &&
                text.includes('17:00')
            );
        });
        expect(timeElement).toBeInTheDocument();

        // Lokasi
        expect(screen.getByText('Lokasi 1')).toBeInTheDocument();
    });

    it('merender pesan kosong jika tidak ada itinerary', () => {
        render(CatalogShow, {
            props: { package: createMockPackage({ days: [] }) },
        });

        expect(
            screen.getByText(/Itinerary belum tersedia/i)
        ).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 3 — FASILITAS
// ============================================================

describe('Client Catalog Show — Fasilitas', () => {
    it('merender fasilitas include dan exclude', () => {
        render(CatalogShow, { props: { package: createMockPackage() } });

        expect(screen.getByText('Termasuk')).toBeInTheDocument();
        expect(screen.getByText('Hotel')).toBeInTheDocument();
        expect(screen.getByText('Makan')).toBeInTheDocument();

        expect(screen.getByText('Tidak Termasuk')).toBeInTheDocument();
        expect(screen.getByText('Tiket Pesawat')).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 4 — BOOKING CARD
// ============================================================

describe('Client Catalog Show — Booking Card', () => {
    it('merender harga per orang dan tombol pesan', () => {
        render(CatalogShow, { props: { package: createMockPackage() } });

        expect(screen.getByText('Harga per Orang')).toBeInTheDocument();
        // Rp 1500000 muncul 1x di booking card
        expect(screen.getAllByText('Rp 1500000').length).toBeGreaterThanOrEqual(1);

        const cta = screen.getByRole('link', { name: /Pesan Sekarang/i });
        expect(cta).toHaveAttribute('href', '/client/bookings/create/10');
    });

    it('merender info harga rombongan jika ada', () => {
        render(CatalogShow, {
            props: {
                package: createMockPackage({ harga_per_rombongan: '5000000' }),
            },
        });

        expect(screen.getByText('Harga Rombongan')).toBeInTheDocument();
        expect(screen.getByText('Rp 5000000')).toBeInTheDocument();
    });

    it('merender info min/max peserta dan durasi', () => {
        render(CatalogShow, { props: { package: createMockPackage() } });

        // Teks "Min. 1 – Maks. 10 orang" muncul sebagai gabungan node
        // Cek dengan matcher function
        expect(
            screen.getByText((_content, element) => {
                return (
                    element?.tagName === 'SPAN' &&
                    /Min\.\s*1\s*–\s*Maks\.\s*10\s*orang/.test(
                        element?.textContent ?? ''
                    )
                );
            })
        ).toBeInTheDocument();
    });
});