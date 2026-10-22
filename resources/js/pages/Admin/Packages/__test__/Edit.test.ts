import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import PackagesEdit from '../Edit.svelte';
import type { Package } from '@/types';

// ============================================================
// MOCK INERTIA — lengkap dengan page.props
// ============================================================
const mockRouterPut = vi.fn();

vi.mock('@inertiajs/svelte', () => ({
    router: {
        put: (...args: any[]) => mockRouterPut(...args),
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
            return '/admin/packages/1/edit';
        },
        get component() {
            return 'Admin/Packages/Edit';
        },
    },
}));

// ============================================================
// HELPERS
// ============================================================

/**
 * Mock package dengan literal type `status` yang benar.
 * `satisfies Package` memvalidasi seluruh object cocok dengan tipe.
 */
const mockPackage = {
    id: 1,
    kode: 'PKT-123',
    nama: 'Paket Awal',
    slug: 'paket-awal',
    deskripsi: 'Deskripsi awal',
    kategori: 'wisata_alam',
    durasi_hari: 3,
    durasi_malam: 2,
    harga_per_orang: '1500000.00',
    harga_per_rombongan: '5000000.00',
    min_peserta: 2,
    max_peserta: 10,
    timezone: 'Asia/Makassar',
    cover_image: null,
    status: 'draft' as const,
    created_at: '2026-01-01T10:00:00Z',
    updated_at: '2026-01-02T10:00:00Z',
    creator: null,

    // ✅ FIELD WAJIB Package yang missing:
    created_by: 1,
    deleted_at: null,
} satisfies Package;

const getForm = () => {
    const btn = screen.getByRole('button', {
        name: /Simpan Perubahan|Menyimpan/i,
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
// KATEGORI 1 — INISIALISASI DATA
// ============================================================

describe('Admin Packages Edit — Inisialisasi Data', () => {
    it('mengisi form dengan data dari prop package', () => {
        render(PackagesEdit, { props: { package: mockPackage } });

        expect(getInput('nama').value).toBe('Paket Awal');
        expect(getTextarea('deskripsi').value).toBe('Deskripsi awal');
        expect(getSelect('kategori').value).toBe('wisata_alam');
        expect(getInput('durasi_hari').value).toBe('3');
        expect(getInput('durasi_malam').value).toBe('2');
        expect(getInput('min_peserta').value).toBe('2');
        expect(getInput('max_peserta').value).toBe('10');
        expect(getInput('harga_per_orang').value).toBe('1500000');
    });

    it('merender info paket di header (nama & kode)', () => {
        render(PackagesEdit, { props: { package: mockPackage } });

        expect(
            screen.getByRole('heading', {
                name: /Edit Paket Awal/i,
                level: 2,
            })
        ).toBeInTheDocument();
        expect(screen.getByText('PKT-123')).toBeInTheDocument();
    });

    it('harga_per_rombongan null menjadi kosong di input', () => {
        render(PackagesEdit, {
            props: {
                package: { ...mockPackage, harga_per_rombongan: null },
            },
        });

        expect(getInput('harga_per_rombongan').value).toBe('');
    });
});

// ============================================================
// KATEGORI 2 — STATE TOMBOL (hasChanges)
// ============================================================

describe('Admin Packages Edit — State Tombol', () => {
    it('tombol Simpan dan Reset disabled secara default (tidak ada perubahan)', () => {
        render(PackagesEdit, { props: { package: mockPackage } });

        const submitBtn = screen.getByRole('button', {
            name: /Simpan Perubahan/i,
        });
        const resetBtn = screen.getByRole('button', { name: /Reset/i });

        expect(submitBtn).toBeDisabled();
        expect(resetBtn).toBeDisabled();
    });

    it('tombol Simpan & Reset aktif jika ada perubahan', async () => {
        render(PackagesEdit, { props: { package: mockPackage } });

        await fireEvent.input(getInput('nama'), {
            target: { value: 'Paket Baru' },
        });

        const submitBtn = screen.getByRole('button', {
            name: /Simpan Perubahan/i,
        });
        const resetBtn = screen.getByRole('button', { name: /Reset/i });

        expect(submitBtn).not.toBeDisabled();
        expect(resetBtn).not.toBeDisabled();
    });

    it('mengubah harga menjadi 0 (dari 1500000) dianggap ada perubahan', async () => {
        render(PackagesEdit, { props: { package: mockPackage } });

        await fireEvent.input(getInput('harga_per_orang'), {
            target: { value: '0' },
        });

        const submitBtn = screen.getByRole('button', {
            name: /Simpan Perubahan/i,
        });
        expect(submitBtn).not.toBeDisabled();
    });
});

// ============================================================
// KATEGORI 3 — RESET FORM
// ============================================================

describe('Admin Packages Edit — Reset Form', () => {
    it('tombol Reset mengembalikan nilai form ke kondisi awal', async () => {
        render(PackagesEdit, { props: { package: mockPackage } });

        await fireEvent.input(getInput('nama'), {
            target: { value: 'Berubah' },
        });
        await fireEvent.input(getInput('harga_per_orang'), {
            target: { value: '9999' },
        });

        const resetBtn = screen.getByRole('button', { name: /Reset/i });
        await fireEvent.click(resetBtn);

        expect(getInput('nama').value).toBe('Paket Awal');
        expect(getInput('harga_per_orang').value).toBe('1500000');

        expect(
            screen.getByRole('button', { name: /Simpan Perubahan/i })
        ).toBeDisabled();
    });
});

// ============================================================
// KATEGORI 4 — SUBMIT FORM
// ============================================================

describe('Admin Packages Edit — Submit Form', () => {
    it('submit memanggil router.put dengan payload yang benar', async () => {
        render(PackagesEdit, { props: { package: mockPackage } });

        await fireEvent.input(getInput('nama'), {
            target: { value: 'Paket Edit' },
        });
        await fireEvent.input(getInput('harga_per_orang'), {
            target: { value: '2500000' },
        });
        await fireEvent.input(getTextarea('deskripsi'), {
            target: { value: '' },
        });

        await fireEvent.submit(getForm());

        expect(mockRouterPut).toHaveBeenCalledTimes(1);

        const [url, payload, options] = mockRouterPut.mock.calls[0];

        expect(url).toBe('/admin/packages/1');
        expect(payload).toEqual({
            nama: 'Paket Edit',
            deskripsi: null,
            kategori: 'wisata_alam',
            timezone: 'Asia/Makassar',
            durasi_hari: 3,
            durasi_malam: 2,
            min_peserta: 2,
            max_peserta: 10,
            harga_per_orang: 2500000,
            harga_per_rombongan: 5000000,
        });
        expect(options).toHaveProperty('onError');
        expect(options).toHaveProperty('onFinish');
    });
});

// ============================================================
// KATEGORI 5 — ERROR HANDLING
// ============================================================

describe('Admin Packages Edit — Error Handling', () => {
    it('menampilkan error dari onError dan menonaktifkan processing', async () => {
        render(PackagesEdit, { props: { package: mockPackage } });

        await fireEvent.input(getInput('nama'), {
            target: { value: 'Paket Baru' },
        });
        await fireEvent.submit(getForm());

        const [, , options] = mockRouterPut.mock.calls[0];
        options.onError({ nama: 'Nama paket sudah dipakai.' });

        await waitFor(() => {
            expect(
                screen.getByText('Nama paket sudah dipakai.')
            ).toBeInTheDocument();
            expect(
                screen.getByText('Terdapat 1 kesalahan pada form')
            ).toBeInTheDocument();
        });
    });
});