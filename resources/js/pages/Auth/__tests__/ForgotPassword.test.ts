import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ForgotPassword from '../ForgotPassword.svelte';

// Mock Inertia
vi.mock('@inertiajs/svelte', () => ({
    router: {
        post: vi.fn(),
    },
    page: {
        props: {
            flash: {},
        },
    },
    inertia: () => ({
        update: () => {},
        destroy: () => {},
    }),
}));

describe('ForgotPassword.svelte', () => {
    /*
    |--------------------------------------------------------------------------
    | Contract — Elemen Form
    |--------------------------------------------------------------------------
    */

    describe('Elemen Form', () => {
        it('menampilkan heading "Pemulihan"', () => {
            render(ForgotPassword);
            expect(screen.getByRole('heading', { name: /^Pemulihan/i })).toBeInTheDocument();
        });

        it('menampilkan field email', () => {
            render(ForgotPassword);
            expect(screen.getByLabelText(/Alamat Email/i)).toBeInTheDocument();
        });

        it('menampilkan tombol "Kirim Tautan Pemulihan"', () => {
            render(ForgotPassword);
            expect(
                screen.getByRole('button', { name: /Kirim Tautan Pemulihan/i })
            ).toBeInTheDocument();
        });

        it('menampilkan tombol kembali ke login', () => {
            render(ForgotPassword);
            expect(screen.getByText(/Kembali ke Login/i)).toBeInTheDocument();
        });

        it('menampilkan info masa berlaku tautan', () => {
            render(ForgotPassword);
            expect(screen.getByText(/60 menit/i)).toBeInTheDocument();
        });

        it('menampilkan placeholder email yang informatif', () => {
            render(ForgotPassword);
            const input = screen.getByLabelText(/Alamat Email/i) as HTMLInputElement;
            expect(input.placeholder).toBe('budi@email.com');
        });

        it('input email memiliki autocomplete="email"', () => {
            render(ForgotPassword);
            const input = screen.getByLabelText(/Alamat Email/i) as HTMLInputElement;
            expect(input).toHaveAttribute('autocomplete', 'email');
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Interaksi Form
    |--------------------------------------------------------------------------
    */

    describe('Interaksi Form', () => {
        it('mengizinkan pengguna mengetik email', async () => {
            render(ForgotPassword);
            const input = screen.getByLabelText(/Alamat Email/i) as HTMLInputElement;

            await fireEvent.input(input, {
                target: { value: 'budi@example.com' },
            });

            expect(input.value).toBe('budi@example.com');
        });

        it('field email bertipe email', () => {
            render(ForgotPassword);
            const input = screen.getByLabelText(/Alamat Email/i) as HTMLInputElement;
            expect(input.type).toBe('email');
        });

        it('field email wajib diisi (required)', () => {
            render(ForgotPassword);
            const input = screen.getByLabelText(/Alamat Email/i) as HTMLInputElement;
            expect(input.required).toBe(true);
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Tombol Submit — State
    |--------------------------------------------------------------------------
    */

    describe('Tombol Submit', () => {
        it('tombol tidak disabled dalam kondisi default', () => {
            render(ForgotPassword);
            const button = screen.getByRole('button', {
                name: /Kirim Tautan Pemulihan/i,
            });
            expect(button).not.toBeDisabled();
        });

        it('teks tombol menampilkan "Kirim Tautan Pemulihan" saat idle', () => {
            render(ForgotPassword);
            expect(
                screen.getByRole('button', { name: /Kirim Tautan Pemulihan/i })
            ).toBeInTheDocument();
        });
    });
});