import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import PackageShow from '../Show.svelte';
import type {
    Package,
    PackageDay,
    PackageDayCost,
    PackageFacility,
    PackageMargin,
    UserMini,
} from '@/types';

// ============================================================
// TIPE PROPS KOMPONEN (mirror `PackageDetail` internal Show.svelte)
// ------------------------------------------------------------
// Didefinisikan ulang PERSIS sesuai Show.svelte — `creator`
// wajib `Pick<UserMini, ...> | null` (bukan opsional/undefined),
// `days` dengan `costs` wajib, `facilities` wajib array.
// ============================================================
type PackageDetail = Omit<
    Package,
    'days' | 'facilities' | 'creator'
> & {
    creator: Pick<UserMini, 'id' | 'name' | 'email'> | null;
    days: Array<PackageDay & { costs: PackageDayCost[] }>;
    facilities: PackageFacility[];
};

// ============================================================
// MOCK INERTIA
// ============================================================
const mockRouterPost = vi.fn();
const mockRouterPut = vi.fn();
const mockRouterDelete = vi.fn();

vi.mock('@inertiajs/svelte', () => ({
    router: {
        post: (...args: any[]) => mockRouterPost(...args),
        put: (...args: any[]) => mockRouterPut(...args),
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
            return '/admin/packages/1';
        },
        get component() {
            return 'Admin/Packages/Show';
        },
    },
}));

// ============================================================
// MOCK UTILS
// ============================================================
vi.mock('@/utils/enums', () => ({
    packageDayCostKategoriBadge: (s: string) => `badge-kategori-${s}`,
    packageDayCostKategoriLabel: (s: string) => `Label Kategori ${s}`,
    packageDayCostSatuanLabel: (s: string) => `Label Satuan ${s}`,
    packageFacilityTipeLabel: (s: string) => `Label Tipe ${s}`,
    packageKategoriBadge: (s: string) => `badge-pkg-kategori-${s}`,
    packageKategoriLabel: (s: string) => `Label Pkg Kategori ${s}`,
    packageStatusBadge: (s: string) => `badge-pkg-status-${s}`,
    packageStatusLabel: (s: string) => `Label Pkg Status ${s}`,
}));

vi.mock('@/utils/formatCurrency', () => ({
    formatCurrency: (n: number | string) => `Rp ${n}`,
}));

vi.mock('@/utils/formatDate', () => ({
    formatDate: (d: string) => `Tgl: ${d}`,
}));

vi.mock('@/utils/duration', () => ({
    formatDurasi: (h: number, m: number) => `${h} Hari ${m} Malam`,
}));

vi.mock('@/utils/form', () => ({
    parseRupiah: (val: string) =>
        parseInt(String(val).replace(/\D/g, ''), 10) || 0,
}));

vi.mock('@/utils/timezone', () => ({
    timezoneLabelLong: (tz: string) => `TZ: ${tz}`,
}));

// ============================================================
// HELPERS
// ============================================================

const createMockData = () => {
    const pkg: PackageDetail = {
        id: 1,
        nama: 'Paket Test',
        kode: 'PKT-TEST',
        slug: 'paket-test',
        deskripsi: 'Deskripsi test',
        kategori: 'wisata_alam',
        durasi_hari: 2,
        durasi_malam: 1,
        harga_per_orang: '1000000',
        harga_per_rombongan: null,
        min_peserta: 1,
        max_peserta: 10,
        timezone: 'Asia/Makassar',
        status: 'draft',
        created_at: '2026-01-01T10:00:00Z',
        updated_at: '2026-01-01T10:00:00Z',
        cover_image: null,
        created_by: 1,
        deleted_at: null,
        creator: null,
        days: [
            {
                id: 10,
                package_id: 1,
                hari_ke: 1,
                judul: 'Hari Pertama',
                deskripsi: 'Kegiatan hari 1',
                jam_mulai: '08:00:00',
                jam_selesai: '17:00:00',
                lokasi: 'Lokasi 1',
                costs: [
                    {
                        id: 100,
                        package_day_id: 10,
                        nama_biaya: 'Tiket',
                        kategori: 'tiket',
                        jumlah: '50000',
                        satuan: 'total',
                        catatan: null,
                    },
                ],
            },
        ],
        facilities: [
            {
                id: 20,
                package_id: 1,
                tipe: 'include',
                nama: 'Makan',
                urutan: 1,
            },
            {
                id: 21,
                package_id: 1,
                tipe: 'exclude',
                nama: 'Tiket Pesawat',
                urutan: 2,
            },
        ],
    };

    const hpp = {
        total: 50000,
        breakdown: [
            {
                hari_ke: 1,
                nama_biaya: 'Tiket',
                kategori: 'tiket',
                satuan: 'total',
                jumlah: 50000,
                subtotal: 50000,
            },
        ],
        per_kategori: { tiket: 50000 },
    };

    const margin: PackageMargin = {
        hpp_total: 50000,
        hpp_per_orang: 5000,
        harga_jual_per_orang: 1000000,
        margin_per_orang: 995000,
        margin_persen: 99.5,
    };

    return { pkg, hpp, margin };
};

// ============================================================
// SETUP
// ============================================================

beforeEach(() => {
    vi.clearAllMocks();
});

// ============================================================
// KATEGORI 1 — HEADER & DATA PAKET
// ============================================================

describe('Admin Package Show — Header & Data', () => {
    it('merender info header paket (nama, kode, status, kategori)', () => {
        const { pkg, hpp, margin } = createMockData();
        render(PackageShow, { props: { package: pkg, hpp, margin } });

        expect(
            screen.getByRole('heading', { level: 1, name: 'Paket Test' })
        ).toBeInTheDocument();
        expect(screen.getByText('PKT-TEST')).toBeInTheDocument();
        expect(
            screen.getAllByText('Label Pkg Status draft').length
        ).toBeGreaterThanOrEqual(1);
        expect(
            screen.getByText('Label Pkg Kategori wisata_alam')
        ).toBeInTheDocument();
    });

    it('merender ringkasan HPP & Margin', () => {
        const { pkg, hpp, margin } = createMockData();
        render(PackageShow, { props: { package: pkg, hpp, margin } });

        expect(
            screen.getAllByText('Rp 50000').length
        ).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('Rp 995000')).toBeInTheDocument();
        expect(screen.getByText('99.5%')).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 2 — TAB ITINERARY
// ============================================================

describe('Admin Package Show — Tab Itinerary', () => {
    it('merender data hari dan biaya HPP di tab Itinerary (default)', () => {
        const { pkg, hpp, margin } = createMockData();
        render(PackageShow, { props: { package: pkg, hpp, margin } });

        expect(screen.getByText('Hari Pertama')).toBeInTheDocument();

        const timeText = screen.getByText((_content, element) => {
            const text = element?.textContent ?? '';
            return (
                element?.tagName === 'SPAN' &&
                text.includes('08:00') &&
                text.includes('17:00')
            );
        });
        expect(timeText).toBeInTheDocument();

        expect(screen.getByText('Lokasi 1')).toBeInTheDocument();
        expect(screen.getByText('Tiket')).toBeInTheDocument();
        expect(
            screen.getAllByText('Rp 50000').length
        ).toBeGreaterThanOrEqual(1);
    });

    it('menampilkan tombol "Tambah Hari" jika total hari < durasi hari', () => {
        const { pkg, hpp, margin } = createMockData();
        pkg.durasi_hari = 3;

        render(PackageShow, { props: { package: pkg, hpp, margin } });

        const tambahHariBtn = screen.getByRole('button', {
            name: /Tambah Hari/i,
        });
        expect(tambahHariBtn).not.toBeDisabled();
    });

    it('membuka FormModal saat tombol "Tambah Hari" diklik', async () => {
        const { pkg, hpp, margin } = createMockData();
        pkg.durasi_hari = 3;

        render(PackageShow, { props: { package: pkg, hpp, margin } });

        const tambahBtn = screen.getByRole('button', {
            name: /Tambah Hari/i,
        });
        await fireEvent.click(tambahBtn);

        await waitFor(() => {
            const modalTitle = document.querySelector('#form-modal-title');
            expect(modalTitle).not.toBeNull();
            expect(modalTitle?.textContent?.trim()).toBe('Tambah Hari Baru');
        });
    });
});

// ============================================================
// KATEGORI 3 — TAB HPP
// ============================================================

describe('Admin Package Show — Tab HPP', () => {
    it('merender breakdown HPP saat tab HPP diklik', async () => {
        const { pkg, hpp, margin } = createMockData();
        render(PackageShow, { props: { package: pkg, hpp, margin } });

        const hppTab = screen.getByRole('button', { name: /^HPP$/i });
        await fireEvent.click(hppTab);

        expect(screen.getByText('Breakdown HPP')).toBeInTheDocument();
        expect(screen.getByText('Per Kategori')).toBeInTheDocument();
        expect(screen.getByText('H1')).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 4 — TAB FASILITAS
// ============================================================

describe('Admin Package Show — Tab Fasilitas', () => {
    it('merender fasilitas include dan exclude saat tab Fasilitas diklik', async () => {
        const { pkg, hpp, margin } = createMockData();
        render(PackageShow, { props: { package: pkg, hpp, margin } });

        const fasilitasTab = screen.getByRole('button', {
            name: /^Fasilitas/i,
        });
        await fireEvent.click(fasilitasTab);

        expect(screen.getByText('Termasuk')).toBeInTheDocument();
        expect(screen.getByText('Tidak Termasuk')).toBeInTheDocument();
        expect(screen.getByText('Makan')).toBeInTheDocument();
        expect(screen.getByText('Tiket Pesawat')).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 5 — AKSI STATUS (PUBLISH, ARSIP, HAPUS)
// ============================================================

describe('Admin Package Show — Aksi Status', () => {
    it('menampilkan tombol Publish jika status draft', () => {
        const { pkg, hpp, margin } = createMockData();
        pkg.status = 'draft';

        render(PackageShow, { props: { package: pkg, hpp, margin } });
        expect(
            screen.getByRole('button', { name: /Publish/i })
        ).toBeInTheDocument();
    });

    it('menampilkan tombol Arsipkan jika status aktif', () => {
        const { pkg, hpp, margin } = createMockData();
        pkg.status = 'aktif';

        render(PackageShow, { props: { package: pkg, hpp, margin } });
        expect(
            screen.getByRole('button', { name: /Arsipkan/i })
        ).toBeInTheDocument();
    });

    it('menampilkan tombol Restore jika status arsip', () => {
        const { pkg, hpp, margin } = createMockData();
        pkg.status = 'arsip';

        render(PackageShow, { props: { package: pkg, hpp, margin } });
        expect(
            screen.getByRole('button', { name: /Restore/i })
        ).toBeInTheDocument();
    });

    it('membuka ConfirmModal saat tombol Hapus diklik', async () => {
        const { pkg, hpp, margin } = createMockData();
        render(PackageShow, { props: { package: pkg, hpp, margin } });

        const hapusBtn = screen
            .getAllByRole('button', { name: /Hapus/i })
            .find((btn) => btn.textContent?.trim() === 'Hapus');

        expect(hapusBtn).toBeDefined();
        await fireEvent.click(hapusBtn!);

        await waitFor(() => {
            const modalTitle = document.querySelector('#confirm-modal-title');
            expect(modalTitle).not.toBeNull();
            expect(modalTitle?.textContent?.trim()).toBe('Hapus Paket?');
        });
    });
});