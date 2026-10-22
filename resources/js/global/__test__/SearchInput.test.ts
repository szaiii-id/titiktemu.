import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import SearchInput from '../SearchInput.svelte';

// ============================================================
// SETUP & TEARDOWN
// ============================================================

beforeEach(() => {
    vi.clearAllMocks();
});

// ============================================================
// KATEGORI 1 — RENDERING DASAR
// ============================================================

describe('SearchInput.svelte — Rendering Dasar', () => {
    it('merender input dengan placeholder default', () => {
        render(SearchInput, { props: {} });

        const input = screen.getByRole('textbox');
        expect(input).toBeInTheDocument();
        expect(input).toHaveAttribute('placeholder', 'Cari...');
    });

    it('merender input dengan placeholder kustom', () => {
        render(SearchInput, {
            props: { placeholder: 'Cari nama user...' },
        });

        expect(
            screen.getByPlaceholderText('Cari nama user...'),
        ).toBeInTheDocument();
    });

    it('merender nilai awal dari props value', () => {
        render(SearchInput, { props: { value: 'budi' } });

        const input = screen.getByRole('textbox') as HTMLInputElement;
        expect(input.value).toBe('budi');
    });

    it('merender ikon pencarian (SVG)', () => {
        render(SearchInput, { props: {} });

        const iconContainer = document.querySelector('[aria-hidden="true"]');
        const svg = iconContainer?.querySelector('svg');

        expect(iconContainer).toBeInTheDocument();
        expect(svg).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 2 — LOGIKA INPUT & CALLBACK
// ============================================================

describe('SearchInput.svelte — Logika Input', () => {
    it('memanggil oninput saat user mengetik', async () => {
        const oninput = vi.fn();
        render(SearchInput, { props: { oninput } });

        const input = screen.getByRole('textbox');
        await fireEvent.input(input, { target: { value: 'budi' } });

        expect(oninput).toHaveBeenCalledWith('budi');
    });

    it('memperbarui nilai input secara internal (bind:value)', async () => {
        render(SearchInput, { props: {} });

        const input = screen.getByRole('textbox') as HTMLInputElement;
        await fireEvent.input(input, { target: { value: 'ani' } });

        // Svelte 5: verifikasi lewat DOM (nilai input),
        // bukan `component.$$.props.value`.
        expect(input.value).toBe('ani');
    });

    it('menampilkan tombol clear setelah input diisi (binding value reaktif)', async () => {
        render(SearchInput, { props: {} });

        // Sebelum mengetik: tidak ada tombol clear
        expect(
            screen.queryByRole('button', { name: /Hapus pencarian/i }),
        ).not.toBeInTheDocument();

        const input = screen.getByRole('textbox');
        await fireEvent.input(input, { target: { value: 'ani' } });

        // Setelah mengetik: tombol clear muncul (karena value bindable ter-update)
        expect(
            screen.getByRole('button', { name: /Hapus pencarian/i }),
        ).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 3 — FITUR CLEAR (TOMBOL X)
// ============================================================

describe('SearchInput.svelte — Fitur Clear', () => {
    it('TIDAK menampilkan tombol clear jika value kosong', () => {
        render(SearchInput, { props: { value: '' } });

        expect(
            screen.queryByRole('button', { name: /Hapus pencarian/i }),
        ).not.toBeInTheDocument();
    });

    it('menampilkan tombol clear jika value tidak kosong', () => {
        render(SearchInput, { props: { value: 'budi' } });

        expect(
            screen.getByRole('button', { name: /Hapus pencarian/i }),
        ).toBeInTheDocument();
    });

    it('menghapus nilai input, memanggil oninput("") dan onclear saat tombol clear diklik', async () => {
        const oninput = vi.fn();
        const onclear = vi.fn();

        render(SearchInput, {
            props: { value: 'budi', oninput, onclear },
        });

        const clearBtn = screen.getByRole('button', {
            name: /Hapus pencarian/i,
        });
        await fireEvent.click(clearBtn);

        const input = screen.getByRole('textbox') as HTMLInputElement;
        expect(input.value).toBe('');

        expect(oninput).toHaveBeenCalledWith('');
        expect(onclear).toHaveBeenCalledTimes(1);
    });

    it('menyembunyikan tombol clear setelah diklik (value menjadi kosong)', async () => {
        render(SearchInput, { props: { value: 'budi' } });

        const clearBtn = screen.getByRole('button', {
            name: /Hapus pencarian/i,
        });
        await fireEvent.click(clearBtn);

        expect(
            screen.queryByRole('button', { name: /Hapus pencarian/i }),
        ).not.toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 4 — STATE FOCUS (STYLING)
// ============================================================

describe('SearchInput.svelte — State Focus', () => {
    it('menerapkan class focus (border-pink) saat input di-fokus', async () => {
        render(SearchInput, { props: {} });

        const input = screen.getByRole('textbox');
        await fireEvent.focus(input);

        expect(input).toHaveClass('border-pink');
        expect(input).toHaveClass('bg-white');
        expect(input).toHaveClass('ring-4');
    });

    it('mengembalikan class awal saat input kehilangan fokus (blur)', async () => {
        render(SearchInput, { props: {} });

        const input = screen.getByRole('textbox');
        await fireEvent.focus(input);
        await fireEvent.blur(input);

        expect(input).toHaveClass('border-gray-200');
        expect(input).not.toHaveClass('border-pink');
    });
});

// ============================================================
// KATEGORI 5 — AUTOFOCUS
// ============================================================

describe('SearchInput.svelte — Autofocus', () => {
    it('memfokuskan input secara otomatis saat mount jika autofocus = true', async () => {
        render(SearchInput, { props: { autofocus: true } });

        const input = screen.getByRole('textbox');

        await waitFor(() => {
            expect(document.activeElement).toBe(input);
        });
    });

    it('TIDAK memfokuskan input secara otomatis jika autofocus = false (default)', async () => {
        render(SearchInput, { props: {} });

        const input = screen.getByRole('textbox');

        expect(document.activeElement).not.toBe(input);
    });
});