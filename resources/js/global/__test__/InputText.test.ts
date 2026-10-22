import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import InputText from '../InputText.svelte';

// ============================================================
// SETUP
// ============================================================

beforeEach(() => {
    vi.clearAllMocks();
});

// ============================================================
// KATEGORI 1 — RENDERING DASAR & LABEL
// ============================================================

describe('InputText.svelte — Rendering Dasar', () => {
    it('merender label jika diberikan', () => {
        render(InputText, { props: { id: 'nama', label: 'Nama Lengkap' } });
        
        const label = screen.getByText('Nama Lengkap');
        expect(label).toBeInTheDocument();
        expect(label).toHaveAttribute('for', 'nama');
    });

    it('TIDAK merender label jika kosong', () => {
        render(InputText, { props: { id: 'nama', label: '' } });
        
        const label = document.querySelector('label');
        expect(label).not.toBeInTheDocument();
    });

    it('merender tanda bintang (*) jika required = true', () => {
        render(InputText, { props: { id: 'nama', label: 'Nama', required: true } });
        
        const star = screen.getByText('*');
        expect(star).toBeInTheDocument();
        expect(star).toHaveClass('text-pink');
    });

    it('TIDAK merender tanda bintang (*) jika required = false', () => {
        render(InputText, { props: { id: 'nama', label: 'Nama', required: false } });
        expect(screen.queryByText('*')).not.toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 2 — ELEMEN INPUT & ATRIBUT
// ============================================================

describe('InputText.svelte — Elemen Input', () => {
    it('merender elemen input dengan id dan type yang sesuai', () => {
        render(InputText, { props: { id: 'email', type: 'email' } });
        
        const input = screen.getByRole('textbox') as HTMLInputElement;
        expect(input).toBeInTheDocument();
        expect(input.id).toBe('email');
        expect(input.type).toBe('email');
    });

    it('merender placeholder', () => {
        render(InputText, { 
            props: { id: 'nama', placeholder: 'Masukkan nama...' } 
        });
        
        expect(screen.getByPlaceholderText('Masukkan nama...')).toBeInTheDocument();
    });

    it('menerapkan atribut required, disabled, dan readonly', () => {
        render(InputText, { 
            props: { id: 'nama', required: true, disabled: true, readonly: true } 
        });
        
        const input = screen.getByRole('textbox') as HTMLInputElement;
        expect(input.required).toBe(true);
        expect(input.disabled).toBe(true);
        expect(input.readOnly).toBe(true);
    });

    it('meneruskan atribut rest (seperti maxlength, data-testid)', () => {
        render(InputText, { 
            props: { id: 'nama', 'data-testid': 'input-nama', maxlength: 10 } 
        });
        
        const input = screen.getByTestId('input-nama') as HTMLInputElement;
        expect(input).toHaveAttribute('maxlength', '10');
    });
});

// ============================================================
// KATEGORI 3 — STATE: ERROR & HINT
// ============================================================

describe('InputText.svelte — State Error & Hint', () => {
    it('merender pesan error jika error diberikan', () => {
        render(InputText, { 
            props: { id: 'nama', error: 'Nama wajib diisi.' } 
        });
        
        expect(screen.getByText('Nama wajib diisi.')).toBeInTheDocument();
    });

    it('menerapkan class border merah pada input jika error diberikan', () => {
        render(InputText, { 
            props: { id: 'nama', error: 'Error' } 
        });
        
        const input = screen.getByRole('textbox');
        expect(input).toHaveClass('border-red-300');
        expect(input).toHaveClass('bg-red-50');
    });

    it('merender hint jika diberikan (dan tidak ada error)', () => {
        render(InputText, { 
            props: { id: 'nama', hint: 'Gunakan nama asli.' } 
        });
        
        expect(screen.getByText('Gunakan nama asli.')).toBeInTheDocument();
    });

    it('prioritas error lebih tinggi daripada hint', () => {
        render(InputText, { 
            props: { 
                id: 'nama', 
                error: 'Nama wajib diisi.', 
                hint: 'Gunakan nama asli.' 
            } 
        });
        
        // Error dirender
        expect(screen.getByText('Nama wajib diisi.')).toBeInTheDocument();
        // Hint TIDAK dirender (karena error sudah ada)
        expect(screen.queryByText('Gunakan nama asli.')).not.toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 4 — BEHAVIOR: BINDING VALUE
// ============================================================

describe('InputText.svelte — Binding Value', () => {
    it('menginisialisasi nilai input dari props value', () => {
        render(InputText, { 
            props: { id: 'nama', value: 'Budi' } 
        });
        
        const input = screen.getByRole('textbox') as HTMLInputElement;
        expect(input.value).toBe('Budi');
    });

    it('memperbarui nilai input saat user mengetik', async () => {
        render(InputText, { 
            props: { id: 'nama', value: '' } 
        });
        
        const input = screen.getByRole('textbox') as HTMLInputElement;
        await fireEvent.input(input, { target: { value: 'Ani' } });
        
        expect(input.value).toBe('Ani');
    });

    it('menerapkan style disabled/readonly pada container input', () => {
        render(InputText, { 
            props: { id: 'nama', disabled: true } 
        });
        
        const input = screen.getByRole('textbox');
        expect(input).toHaveClass('bg-gray-100');
        expect(input).toHaveClass('cursor-not-allowed');
    });
});