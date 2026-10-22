import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/svelte';
import FilterBar from '../FilterBar.svelte';

// ============================================================
// TIDAK ada mock komponen anak.
// SearchInput & StatusTabs adalah komponen asli yang aman
// dirender — mem-mock jadi `null` akan menghilangkan <input>
// dan <select> dari DOM, membuat test baris pencarian gagal.
// ============================================================

beforeEach(() => {
    vi.clearAllMocks();
});

// ============================================================
// KATEGORI 1 — RENDERING DASAR
// ============================================================

describe('FilterBar.svelte — Rendering Dasar', () => {
    it('merender container utama dengan tombol "Hapus Semua Filter" saat hasActiveFilters', () => {
        render(FilterBar, {
            props: { onClear: vi.fn(), hasActiveFilters: true },
        });

        // Container dideteksi via parent dari tombol "Hapus Semua Filter"
        const clearBtn = screen.getByRole('button', {
            name: /Hapus Semua Filter/i,
        });
        const container = clearBtn.closest('.space-y-4') as HTMLElement;
        expect(container).toBeInTheDocument();
        expect(container).toHaveClass('p-4');
        expect(container).toHaveClass('border-b');
        expect(container).toHaveClass('border-gray-100');
    });

    it('TIDAK merender baris pencarian jika onSearch, kategoriOptions, dan showDateRange tidak ada', () => {
        const { container } = render(FilterBar, {
            props: { onClear: vi.fn() },
        });

        // Tidak ada input pencarian, tidak ada select, tidak ada tombol date
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: /Filter Tanggal/i }),
        ).not.toBeInTheDocument();

        // Tidak ada <select> / <input> di seluruh DOM komponen
        expect(container.querySelector('select')).toBeNull();
        expect(container.querySelector('input')).toBeNull();
    });

    it('TIDAK merender tombol "Hapus Semua Filter" jika hasActiveFilters = false', () => {
        render(FilterBar, {
            props: { onClear: vi.fn(), hasActiveFilters: false },
        });

        expect(
            screen.queryByRole('button', { name: /Hapus Semua Filter/i }),
        ).not.toBeInTheDocument();
    });

    it('merender tombol "Hapus Semua Filter" jika hasActiveFilters = true', () => {
        render(FilterBar, {
            props: { onClear: vi.fn(), hasActiveFilters: true },
        });

        expect(
            screen.getByRole('button', { name: /Hapus Semua Filter/i }),
        ).toBeInTheDocument();
    });

    it('memanggil onClear saat tombol "Hapus Semua Filter" diklik', async () => {
        const onClear = vi.fn();
        render(FilterBar, {
            props: { onClear, hasActiveFilters: true },
        });

        await fireEvent.click(
            screen.getByRole('button', { name: /Hapus Semua Filter/i }),
        );
        expect(onClear).toHaveBeenCalledTimes(1);
    });
});

// ============================================================
// KATEGORI 2 — KATEGORI DROPDOWN
// ============================================================

describe('FilterBar.svelte — Kategori Dropdown', () => {
    const kategoriOptions = [
        { value: '', label: 'Semua Kategori' },
        { value: 'budaya', label: 'Budaya' },
        { value: 'alam', label: 'Alam' },
    ];

    it('merender dropdown select jika kategoriOptions diberikan', () => {
        render(FilterBar, {
            props: { onClear: vi.fn(), kategoriOptions },
        });

        const select = screen.getByRole('combobox');
        expect(select).toBeInTheDocument();
        expect(
            screen.getByRole('option', { name: 'Budaya' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('option', { name: 'Alam' }),
        ).toBeInTheDocument();
    });

    it('memanggil onKategoriChange saat nilai select berubah', async () => {
        const onKategoriChange = vi.fn();
        render(FilterBar, {
            props: {
                onClear: vi.fn(),
                kategoriOptions,
                onKategoriChange,
                selectedKategori: '',
            },
        });

        const select = screen.getByRole('combobox') as HTMLSelectElement;
        await fireEvent.change(select, { target: { value: 'budaya' } });

        expect(onKategoriChange).toHaveBeenCalledWith('budaya');
        // Svelte 5: verifikasi via DOM, bukan component.$$.props
        expect(select.value).toBe('budaya');
    });
});

// ============================================================
// KATEGORI 3 — DATE RANGE (COLLAPSIBLE)
// ============================================================

describe('FilterBar.svelte — Date Range', () => {
    it('merender tombol toggle "Filter Tanggal" jika showDateRange = true', () => {
        render(FilterBar, {
            props: { onClear: vi.fn(), showDateRange: true },
        });

        expect(
            screen.getByRole('button', { name: /Filter Tanggal/i }),
        ).toBeInTheDocument();
    });

    it('membuka panel date range saat tombol toggle diklik', async () => {
        render(FilterBar, {
            props: { onClear: vi.fn(), showDateRange: true },
        });

        // Awal: label "Dari" & "Sampai" belum ada di DOM
        expect(screen.queryByLabelText('Dari')).not.toBeInTheDocument();

        await fireEvent.click(
            screen.getByRole('button', { name: /Filter Tanggal/i }),
        );

        expect(screen.getByLabelText('Dari')).toBeInTheDocument();
        expect(screen.getByLabelText('Sampai')).toBeInTheDocument();
    });

    it('menampilkan indikator dot jika ada filter tanggal aktif', () => {
        render(FilterBar, {
            props: {
                onClear: vi.fn(),
                showDateRange: true,
                dateFrom: '2026-01-01',
            },
        });

        // Cari elemen dengan aria-label "Filter tanggal aktif"
        const dot = screen
            .getByRole('button', { name: /Filter Tanggal/i })
            .querySelector('[aria-label="Filter tanggal aktif"]');
        expect(dot).toBeInTheDocument();
    });

    it('memanggil onApplyDate saat tombol "Terapkan" diklik', async () => {
        const onApplyDate = vi.fn();
        render(FilterBar, {
            props: {
                onClear: vi.fn(),
                showDateRange: true,
                onApplyDate,
            },
        });

        await fireEvent.click(
            screen.getByRole('button', { name: /Filter Tanggal/i }),
        );
        await fireEvent.click(
            screen.getByRole('button', { name: /Terapkan/i }),
        );
        expect(onApplyDate).toHaveBeenCalledTimes(1);
    });

    it('merender tombol "Reset" dan mengosongkan filter tanggal jika diklik', async () => {
        const onApplyDate = vi.fn();
        render(FilterBar, {
            props: {
                onClear: vi.fn(),
                showDateRange: true,
                dateFrom: '2026-01-01',
                dateTo: '2026-01-31',
                onApplyDate,
            },
        });

        // Buka panel
        await fireEvent.click(
            screen.getByRole('button', { name: /Filter Tanggal/i }),
        );

        // Verifikasi input awal
        const dateFromInput = screen.getByLabelText('Dari') as HTMLInputElement;
        const dateToInput = screen.getByLabelText('Sampai') as HTMLInputElement;
        expect(dateFromInput.value).toBe('2026-01-01');
        expect(dateToInput.value).toBe('2026-01-31');

        // Klik Reset
        await fireEvent.click(
            screen.getByRole('button', { name: /Reset/i }),
        );

        // Svelte 5: verifikasi via DOM, bukan component.$$.props
        expect(dateFromInput.value).toBe('');
        expect(dateToInput.value).toBe('');
        expect(onApplyDate).toHaveBeenCalledTimes(1);
    });
});

// ============================================================
// KATEGORI 4 — LOGIKA BARIS PENCARIAN (SHOW SEARCH ROW)
// ============================================================

describe('FilterBar.svelte — Baris Pencarian', () => {
    it('merender baris pencarian jika onSearch diberikan', () => {
        render(FilterBar, {
            props: {
                onClear: vi.fn(),
                onSearch: vi.fn(),
            },
        });

        // SearchInput merender <input type="text"> — accessible role "textbox"
        expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('merender baris pencarian jika showDateRange = true', () => {
        render(FilterBar, {
            props: {
                onClear: vi.fn(),
                showDateRange: true,
            },
        });

        // showDateRange memicu showSearchRow → tombol "Filter Tanggal" dirender
        expect(
            screen.getByRole('button', { name: /Filter Tanggal/i }),
        ).toBeInTheDocument();
    });

    it('merender baris pencarian jika kategoriOptions diberikan', () => {
        render(FilterBar, {
            props: {
                onClear: vi.fn(),
                kategoriOptions: [{ value: '', label: 'Semua' }],
            },
        });

        // kategoriOptions memicu showSearchRow → <select> dirender
        expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
});