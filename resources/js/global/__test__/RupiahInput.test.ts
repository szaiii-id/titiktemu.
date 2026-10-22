import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import RupiahInput from '../RupiahInput.svelte';

// ============================================================
// MOCK UTILS (form)
// ============================================================
vi.mock('@/utils/form', () => ({
    formatRupiahInput: (val: number) => {
        if (val === 0 || isNaN(val)) return '';
        return new Intl.NumberFormat('id-ID').format(val);
    },
    parseRupiah: (val: string) => {
        const digits = val.replace(/\D/g, '');
        return digits ? parseInt(digits, 10) : 0;
    },
}));

// ============================================================
// SETUP
// ============================================================

beforeEach(() => {
    vi.clearAllMocks();
});

// ============================================================
// KATEGORI 1 — RENDERING DASAR & LABEL
// ============================================================

describe('RupiahInput.svelte — Rendering Dasar', () => {
    it('merender label dan tanda bintang jika required', () => {
        render(RupiahInput, {
            props: { id: 'harga', label: 'Harga Tiket', required: true },
        });

        expect(screen.getByText('Harga Tiket')).toBeInTheDocument();
        expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('merender prefix "Rp" di dalam input', () => {
        render(RupiahInput, { props: { id: 'harga' } });

        expect(screen.getByText('Rp')).toBeInTheDocument();
    });

    it('merender placeholder', () => {
        render(RupiahInput, {
            props: { id: 'harga', placeholder: 'Masukkan harga' },
        });

        expect(
            screen.getByPlaceholderText('Masukkan harga'),
        ).toBeInTheDocument();
    });

    it('merender error dan aria-invalid jika error diberikan', () => {
        render(RupiahInput, {
            props: { id: 'harga', error: 'Harga wajib diisi.' },
        });

        const input = screen.getByRole('textbox');
        expect(
            screen.getByText('Harga wajib diisi.'),
        ).toBeInTheDocument();
        expect(input).toHaveAttribute('aria-invalid', 'true');
        expect(input).toHaveClass('border-red-300');
    });

    it('merender hint jika diberikan (dan tidak ada error)', () => {
        render(RupiahInput, {
            props: { id: 'harga', hint: 'Tanpa titik atau koma' },
        });

        expect(
            screen.getByText('Tanpa titik atau koma'),
        ).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 2 — FORMAT & LOGIKA INPUT
// ============================================================

describe('RupiahInput.svelte — Format & Logika', () => {
    it('menginisialisasi nilai input dari props value dengan format ribuan', () => {
        render(RupiahInput, { props: { id: 'harga', value: 1500000 } });

        const input = screen.getByRole('textbox') as HTMLInputElement;
        expect(input.value).toBe('1.500.000');
    });

    it('memperbarui nilai terformat saat user mengetik angka', async () => {
        render(RupiahInput, {
            props: { id: 'harga', value: 0 },
        });

        const input = screen.getByRole('textbox') as HTMLInputElement;
        await fireEvent.input(input, { target: { value: '250000' } });

        // Svelte 5: verifikasi lewat DOM (nilai input),
        // bukan `component.$$.props.value`.
        expect(input.value).toBe('250.000');
    });

    it('mengabaikan karakter non-digit (huruf, simbol)', async () => {
        render(RupiahInput, { props: { id: 'harga', value: 0 } });

        const input = screen.getByRole('textbox') as HTMLInputElement;
        await fireEvent.input(input, { target: { value: 'Rp 1.000 abc' } });

        expect(input.value).toBe('1.000');
    });

    it('mengosongkan input dan set value = 0 jika user menghapus semua teks', async () => {
        render(RupiahInput, {
            props: { id: 'harga', value: 500000 },
        });

        const input = screen.getByRole('textbox') as HTMLInputElement;
        await fireEvent.input(input, { target: { value: '' } });

        expect(input.value).toBe('');
    });
});

// ============================================================
// KATEGORI 3 — BEHAVIOR FOCUS & BLUR
// ============================================================

describe('RupiahInput.svelte — Behavior Focus & Blur', () => {
    it('saat blur, input diformat ulang dari nilai value saat ini', async () => {
        render(RupiahInput, { props: { id: 'harga', value: 1500000 } });

        const input = screen.getByRole('textbox') as HTMLInputElement;

        // Simulasi user mengubah DOM tanpa event input
        await fireEvent.focus(input);
        input.value = '1500000';

        // Blur harus mereformat ulang
        await fireEvent.blur(input);

        expect(input.value).toBe('1.500.000');
    });

    it('TIDAK mengubah displayValue saat fokus meskipun props value berubah dari parent', async () => {
        const { rerender } = render(RupiahInput, {
            props: { id: 'harga', value: 0 },
        });

        const input = screen.getByRole('textbox') as HTMLInputElement;

        await fireEvent.focus(input);

        // Svelte 5: gunakan rerender() untuk mengubah props dari "parent",
        // bukan `component.$$.props.value = ...`
        await rerender({ value: 100000, id: 'harga' });

        // Karena sedang fokus, displayValue TIDAK boleh berubah otomatis
        expect(input.value).not.toBe('100.000');
    });
});

// ============================================================
// KATEGORI 4 — STATE DISABLED
// ============================================================

describe('RupiahInput.svelte — State Disabled', () => {
    it('menonaktifkan input jika disabled = true', () => {
        render(RupiahInput, {
            props: { id: 'harga', disabled: true },
        });

        const input = screen.getByRole('textbox') as HTMLInputElement;
        expect(input).toBeDisabled();
        expect(input).toHaveClass('opacity-60');
        expect(input).toHaveClass('cursor-not-allowed');
    });
});