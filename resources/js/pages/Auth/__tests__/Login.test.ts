import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Login from '../Login.svelte';

// Mock Inertia — kita tidak ingin benar-benar memanggil router
vi.mock('@inertiajs/svelte', () => ({
    router: {
        post: vi.fn(),
    },
    page: {
        props: {
            flash: {},
        },
    },
    // Harus berupa fungsi — action signature: (node, params) => ({ update, destroy })
    inertia: () => ({
        update: () => {},
        destroy: () => {},
    }),
}));

// Mock use:inertia directive — komponen tidak butuh ini untuk test
// (Svelte directive diabaikan jika tidak didefinisikan)

describe('Login.svelte', () => {
    describe('Toggle Password', () => {
        it('password tersembunyi secara default', () => {
            render(Login);
            const input = screen.getByLabelText(/^Password$/i) as HTMLInputElement;
            expect(input.type).toBe('password');
        });

        it('password terlihat setelah klik tombol toggle', async () => {
            render(Login);
            const input = screen.getByLabelText(/^Password$/i) as HTMLInputElement;
            const toggle = screen.getByLabelText(/Tampilkan password/i);

            await fireEvent.click(toggle);

            expect(input.type).toBe('text');
        });

        it('password tersembunyi kembali setelah klik toggle dua kali', async () => {
            render(Login);
            const input = screen.getByLabelText(/^Password$/i) as HTMLInputElement;
            const toggle = screen.getByLabelText(/Tampilkan password/i);

            await fireEvent.click(toggle);
            await fireEvent.click(screen.getByLabelText(/Sembunyikan password/i));

            expect(input.type).toBe('password');
        });
    });

    describe('Form Interaksi', () => {
        it('menampilkan field identitas dan password', () => {
            render(Login);
            expect(screen.getByLabelText(/Username atau Email/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
        });

        it('menampilkan checkbox "Ingat saya"', () => {
            render(Login);
            expect(screen.getByLabelText(/Ingat saya/i)).toBeInTheDocument();
        });

        it('menampilkan link lupa password', () => {
            render(Login);
            expect(screen.getByText(/Lupa password\?/i)).toBeInTheDocument();
        });

        it('menampilkan link daftar', () => {
            render(Login);
            expect(screen.getByText(/Daftar sekarang/i)).toBeInTheDocument();
        });

        it('menampilkan tombol submit', () => {
            render(Login);
            expect(screen.getByRole('button', { name: /Masuk ke Sistem/i })).toBeInTheDocument();
        });
    });
});