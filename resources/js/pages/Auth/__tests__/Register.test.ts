import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Register from '../Register.svelte';

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

describe('Register.svelte', () => {
    /*
    |--------------------------------------------------------------------------
    | Form Fields — Contract
    |--------------------------------------------------------------------------
    */

    describe('Form Fields', () => {
        it('menampilkan field nama lengkap', () => {
            render(Register);
            expect(screen.getByLabelText(/Nama Lengkap/i)).toBeInTheDocument();
        });

        it('menampilkan field username', () => {
            render(Register);
            expect(screen.getByLabelText(/^Username$/i)).toBeInTheDocument();
        });

        it('menampilkan field email', () => {
            render(Register);
            expect(screen.getByLabelText(/^Email$/i)).toBeInTheDocument();
        });

        it('menampilkan field password dan konfirmasi', () => {
            render(Register);
            expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/Konfirmasi Password/i)).toBeInTheDocument();
        });

        it('menampilkan tombol submit "Buat Akun"', () => {
            render(Register);
            expect(screen.getByRole('button', { name: /Buat Akun/i })).toBeInTheDocument();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Toggle Password — Dua Input Independen
    |--------------------------------------------------------------------------
    */

    describe('Toggle Password', () => {
        it('password tersembunyi secara default', () => {
            render(Register);
            const input = screen.getByLabelText(/^Password$/i) as HTMLInputElement;
            expect(input.type).toBe('password');
        });

        it('konfirmasi password tersembunyi secara default', () => {
            render(Register);
            const input = screen.getByLabelText(/Konfirmasi Password/i) as HTMLInputElement;
            expect(input.type).toBe('password');
        });

        it('password terlihat setelah klik toggle', async () => {
            render(Register);
            const input = screen.getByLabelText(/^Password$/i) as HTMLInputElement;
            const toggles = screen.getAllByLabelText(/Tampilkan password/i);

            await fireEvent.click(toggles[0]);

            expect(input.type).toBe('text');
        });

        it('konfirmasi password terlihat setelah klik toggle-nya', async () => {
            render(Register);
            const input = screen.getByLabelText(/Konfirmasi Password/i) as HTMLInputElement;
            const toggles = screen.getAllByLabelText(/Tampilkan password/i);

            await fireEvent.click(toggles[1]);

            expect(input.type).toBe('text');
        });

        it('toggle password tidak mempengaruhi konfirmasi password', async () => {
            render(Register);
            const passwordInput = screen.getByLabelText(/^Password$/i) as HTMLInputElement;
            const confirmationInput = screen.getByLabelText(/Konfirmasi Password/i) as HTMLInputElement;
            const toggles = screen.getAllByLabelText(/Tampilkan password/i);

            await fireEvent.click(toggles[0]);

            expect(passwordInput.type).toBe('text');
            expect(confirmationInput.type).toBe('password');
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Indikator Kekuatan Password
    |--------------------------------------------------------------------------
    */

    describe('Indikator Kekuatan Password', () => {
        it('tidak menampilkan indikator saat password kosong', () => {
            render(Register);
            expect(screen.queryByText(/Lemah|Cukup|Kuat|Sangat Kuat/i)).not.toBeInTheDocument();
        });

        it('menampilkan label "Lemah" untuk password pendek', async () => {
            render(Register);
            const input = screen.getByLabelText(/^Password$/i) as HTMLInputElement;

            await fireEvent.input(input, { target: { value: 'abc' } });

            expect(screen.getByText(/Lemah/i)).toBeInTheDocument();
        });

        it('menampilkan label "Kuat" untuk password campuran + angka', async () => {
            render(Register);
            const input = screen.getByLabelText(/^Password$/i) as HTMLInputElement;

            await fireEvent.input(input, { target: { value: 'Abcdefg1' } });

            expect(screen.getByText(/^Kuat$/i)).toBeInTheDocument();
        });

        it('menampilkan label "Sangat Kuat" untuk password lengkap', async () => {
            render(Register);
            const input = screen.getByLabelText(/^Password$/i) as HTMLInputElement;

            await fireEvent.input(input, { target: { value: 'Abcdefgh123!' } });

            expect(screen.getByText(/Sangat Kuat/i)).toBeInTheDocument();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Validasi Konfirmasi Password
    |--------------------------------------------------------------------------
    */

    describe('Validasi Konfirmasi', () => {
        it('menampilkan peringatan jika konfirmasi tidak cocok', async () => {
            render(Register);
            const passwordInput = screen.getByLabelText(/^Password$/i) as HTMLInputElement;
            const confirmationInput = screen.getByLabelText(/Konfirmasi Password/i) as HTMLInputElement;

            await fireEvent.input(passwordInput, { target: { value: 'password123' } });
            await fireEvent.input(confirmationInput, { target: { value: 'password456' } });

            expect(screen.getByText(/Konfirmasi password tidak cocok/i)).toBeInTheDocument();
        });

        it('tidak menampilkan peringatan jika konfirmasi cocok', async () => {
            render(Register);
            const passwordInput = screen.getByLabelText(/^Password$/i) as HTMLInputElement;
            const confirmationInput = screen.getByLabelText(/Konfirmasi Password/i) as HTMLInputElement;

            await fireEvent.input(passwordInput, { target: { value: 'password123' } });
            await fireEvent.input(confirmationInput, { target: { value: 'password123' } });

            expect(screen.queryByText(/Konfirmasi password tidak cocok/i)).not.toBeInTheDocument();
        });

        it('tidak menampilkan peringatan jika konfirmasi masih kosong', async () => {
            render(Register);
            const passwordInput = screen.getByLabelText(/^Password$/i) as HTMLInputElement;

            await fireEvent.input(passwordInput, { target: { value: 'password123' } });

            expect(screen.queryByText(/Konfirmasi password tidak cocok/i)).not.toBeInTheDocument();
        });

        it('tombol submit disabled saat password tidak cocok', async () => {
            render(Register);
            const passwordInput = screen.getByLabelText(/^Password$/i) as HTMLInputElement;
            const confirmationInput = screen.getByLabelText(/Konfirmasi Password/i) as HTMLInputElement;

            await fireEvent.input(passwordInput, { target: { value: 'password123' } });
            await fireEvent.input(confirmationInput, { target: { value: 'password456' } });

            const submitButton = screen.getByRole('button', { name: /Buat Akun/i });
            expect(submitButton).toBeDisabled();
        });
    });
});