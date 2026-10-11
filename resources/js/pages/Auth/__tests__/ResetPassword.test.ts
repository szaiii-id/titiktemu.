import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ResetPassword from '../ResetPassword.svelte';

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

// Props yang diterima komponen dari Laravel controller
const defaultProps = {
    token: 'token-abc-123',
    email: 'budi@example.com',
    errors: {},
};

describe('ResetPassword.svelte', () => {
    /*
    |--------------------------------------------------------------------------
    | Contract — Elemen Form
    |--------------------------------------------------------------------------
    */

    describe('Elemen Form', () => {
        it('menampilkan heading "Reset Sandi"', () => {
            render(ResetPassword, { props: defaultProps });
            expect(screen.getByText(/Reset Sandi/i)).toBeInTheDocument();
        });

        it('menampilkan email dari props (readonly)', () => {
            render(ResetPassword, { props: defaultProps });
            const input = screen.getByLabelText(/^Email$/i) as HTMLInputElement;
            expect(input.value).toBe('budi@example.com');
            expect(input.readOnly).toBe(true);
        });

        it('menampilkan field password baru', () => {
            render(ResetPassword, { props: defaultProps });
            expect(screen.getByLabelText(/Password Baru/i)).toBeInTheDocument();
        });

        it('menampilkan field konfirmasi password', () => {
            render(ResetPassword, { props: defaultProps });
            expect(
                screen.getByLabelText(/Konfirmasi Password/i)
            ).toBeInTheDocument();
        });

        it('menampilkan tombol "Simpan Password Baru"', () => {
            render(ResetPassword, { props: defaultProps });
            expect(
                screen.getByRole('button', { name: /Simpan Password Baru/i })
            ).toBeInTheDocument();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Atribut Input
    |--------------------------------------------------------------------------
    */

    describe('Atribut Input', () => {
        it('email memiliki autocomplete="email"', () => {
            render(ResetPassword, { props: defaultProps });
            const input = screen.getByLabelText(/^Email$/i) as HTMLInputElement;
            expect(input).toHaveAttribute('autocomplete', 'email');
        });

        it('password baru memiliki autocomplete="new-password"', () => {
            render(ResetPassword, { props: defaultProps });
            const input = screen.getByLabelText(/Password Baru/i) as HTMLInputElement;
            expect(input).toHaveAttribute('autocomplete', 'new-password');
        });

        it('konfirmasi password memiliki autocomplete="new-password"', () => {
            render(ResetPassword, { props: defaultProps });
            const input = screen.getByLabelText(
                /Konfirmasi Password/i
            ) as HTMLInputElement;
            expect(input).toHaveAttribute('autocomplete', 'new-password');
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Toggle Password — Dua Input Independen
    |--------------------------------------------------------------------------
    */

    describe('Toggle Password', () => {
        it('password baru tersembunyi secara default', () => {
            render(ResetPassword, { props: defaultProps });
            const input = screen.getByLabelText(/Password Baru/i) as HTMLInputElement;
            expect(input.type).toBe('password');
        });

        it('konfirmasi password tersembunyi secara default', () => {
            render(ResetPassword, { props: defaultProps });
            const input = screen.getByLabelText(
                /Konfirmasi Password/i
            ) as HTMLInputElement;
            expect(input.type).toBe('password');
        });

        it('password baru terlihat setelah klik toggle', async () => {
            render(ResetPassword, { props: defaultProps });
            const input = screen.getByLabelText(/Password Baru/i) as HTMLInputElement;
            const toggles = screen.getAllByLabelText(/Tampilkan password/i);

            await fireEvent.click(toggles[0]);

            expect(input.type).toBe('text');
        });

        it('toggle password baru tidak mempengaruhi konfirmasi', async () => {
            render(ResetPassword, { props: defaultProps });
            const passwordInput = screen.getByLabelText(
                /Password Baru/i
            ) as HTMLInputElement;
            const confirmationInput = screen.getByLabelText(
                /Konfirmasi Password/i
            ) as HTMLInputElement;
            const toggles = screen.getAllByLabelText(/Tampilkan password/i);

            await fireEvent.click(toggles[0]);

            expect(passwordInput.type).toBe('text');
            expect(confirmationInput.type).toBe('password');
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Validasi Konfirmasi Password
    |--------------------------------------------------------------------------
    */

    describe('Validasi Konfirmasi', () => {
        it('menampilkan peringatan jika konfirmasi tidak cocok', async () => {
            render(ResetPassword, { props: defaultProps });
            const passwordInput = screen.getByLabelText(
                /Password Baru/i
            ) as HTMLInputElement;
            const confirmationInput = screen.getByLabelText(
                /Konfirmasi Password/i
            ) as HTMLInputElement;

            await fireEvent.input(passwordInput, {
                target: { value: 'password123' },
            });
            await fireEvent.input(confirmationInput, {
                target: { value: 'password456' },
            });

            expect(
                screen.getByText(/Konfirmasi password tidak cocok/i)
            ).toBeInTheDocument();
        });

        it('tidak menampilkan peringatan jika konfirmasi cocok', async () => {
            render(ResetPassword, { props: defaultProps });
            const passwordInput = screen.getByLabelText(
                /Password Baru/i
            ) as HTMLInputElement;
            const confirmationInput = screen.getByLabelText(
                /Konfirmasi Password/i
            ) as HTMLInputElement;

            await fireEvent.input(passwordInput, {
                target: { value: 'password123' },
            });
            await fireEvent.input(confirmationInput, {
                target: { value: 'password123' },
            });

            expect(
                screen.queryByText(/Konfirmasi password tidak cocok/i)
            ).not.toBeInTheDocument();
        });

        it('tidak menampilkan peringatan jika konfirmasi masih kosong', async () => {
            render(ResetPassword, { props: defaultProps });
            const passwordInput = screen.getByLabelText(
                /Password Baru/i
            ) as HTMLInputElement;

            await fireEvent.input(passwordInput, {
                target: { value: 'password123' },
            });

            expect(
                screen.queryByText(/Konfirmasi password tidak cocok/i)
            ).not.toBeInTheDocument();
        });

        it('tombol submit disabled saat password tidak cocok', async () => {
            render(ResetPassword, { props: defaultProps });
            const passwordInput = screen.getByLabelText(
                /Password Baru/i
            ) as HTMLInputElement;
            const confirmationInput = screen.getByLabelText(
                /Konfirmasi Password/i
            ) as HTMLInputElement;

            await fireEvent.input(passwordInput, {
                target: { value: 'password123' },
            });
            await fireEvent.input(confirmationInput, {
                target: { value: 'password456' },
            });

            const submitButton = screen.getByRole('button', {
                name: /Simpan Password Baru/i,
            });
            expect(submitButton).toBeDisabled();
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Error dari Server (props)
    |--------------------------------------------------------------------------
    */

    describe('Error dari Server', () => {
        it('menampilkan error email dari props', () => {
            render(ResetPassword, {
                props: {
                    ...defaultProps,
                    errors: { email: 'Token reset password tidak valid.' },
                },
            });

            expect(
                screen.getByText(/Token reset password tidak valid/i)
            ).toBeInTheDocument();
        });

        it('menampilkan error password dari props', () => {
            render(ResetPassword, {
                props: {
                    ...defaultProps,
                    errors: { password: 'Password minimal harus 8 karakter.' },
                },
            });

            expect(
                screen.getByText(/Password minimal harus 8 karakter/i)
            ).toBeInTheDocument();
        });
    });
});