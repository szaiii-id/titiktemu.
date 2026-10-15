import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import Register from '../Register.svelte';

// ============================================================
// MOCK INERTIA
// ============================================================
// - router.post  → spy untuk verifikasi payload
// - page.props   → reactive untuk test flash & retry_after
// - inertia      → directive no-op untuk `use:inertia`
// ============================================================

const mockPost = vi.fn();

// State reaktif untuk page.props (bisa diubah per test)
let mockPageProps: {
    flash?: {
        status?: string | null;
        error?: string | null;
        retry_after?: number | null;
    };
} = {
    flash: {},
};

vi.mock('@inertiajs/svelte', () => ({
    router: {
        post: (...args: unknown[]) => mockPost(...args),
    },
    page: {
        get props() {
            return mockPageProps;
        },
    },
    inertia: () => ({
        update: () => {},
        destroy: () => {},
    }),
}));

// ============================================================
// SETUP & TEARDOWN
// ============================================================

beforeEach(() => {
    mockPost.mockClear();
    mockPageProps = { flash: {} };
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

// ============================================================
// KATEGORI 1 — UI CONTRACT (element & accessibility)
// ============================================================

describe('Register.svelte — UI Contract', () => {
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

    it('menampilkan field password', () => {
        render(Register);
        expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    });

    it('menampilkan field konfirmasi password', () => {
        render(Register);
        expect(screen.getByLabelText(/Konfirmasi Password/i)).toBeInTheDocument();
    });

    it('menampilkan tombol submit "Buat Akun"', () => {
        render(Register);
        expect(screen.getByRole('button', { name: /Buat Akun/i })).toBeInTheDocument();
    });

    it('menampilkan tombol daftar via Google', () => {
        render(Register);
        const link = screen.getByRole('link', { name: /Google/i });
        expect(link).toHaveAttribute('href', '/auth/google');
    });

    it('menampilkan link ke halaman login', () => {
        render(Register);
        const link = screen.getByRole('link', { name: /Masuk sekarang/i });
        expect(link).toHaveAttribute('href', '/login');
    });

    it('menampilkan tombol kembali ke beranda', () => {
        render(Register);
        const link = screen.getByRole('link', { name: /Kembali/i });
        expect(link).toHaveAttribute('href', '/');
    });
});

// ============================================================
// KATEGORI 2 — EQUIVALENCE: Toggle Password (2 input independen)
// ============================================================

describe('Register.svelte — Toggle Password', () => {
    it('password type = "password" secara default', () => {
        render(Register);
        const input = screen.getByLabelText(/^Password$/i) as HTMLInputElement;
        expect(input.type).toBe('password');
    });

    it('konfirmasi password type = "password" secara default', () => {
        render(Register);
        const input = screen.getByLabelText(/Konfirmasi Password/i) as HTMLInputElement;
        expect(input.type).toBe('password');
    });

    it('password type = "text" setelah klik toggle-nya', async () => {
        render(Register);
        const input = screen.getByLabelText(/^Password$/i) as HTMLInputElement;
        const toggles = screen.getAllByLabelText(/Tampilkan password/i);

        await fireEvent.click(toggles[0]);

        expect(input.type).toBe('text');
    });

    it('konfirmasi password type = "text" setelah klik toggle-nya', async () => {
        render(Register);
        const input = screen.getByLabelText(/Konfirmasi Password/i) as HTMLInputElement;
        const toggles = screen.getAllByLabelText(/Tampilkan password/i);

        await fireEvent.click(toggles[1]);

        expect(input.type).toBe('text');
    });

    it('toggle password TIDAK mempengaruhi konfirmasi password', async () => {
        render(Register);
        const passwordInput = screen.getByLabelText(/^Password$/i) as HTMLInputElement;
        const confirmationInput = screen.getByLabelText(/Konfirmasi Password/i) as HTMLInputElement;
        const toggles = screen.getAllByLabelText(/Tampilkan password/i);

        await fireEvent.click(toggles[0]);

        expect(passwordInput.type).toBe('text');
        expect(confirmationInput.type).toBe('password');
    });

    it('toggle konfirmasi password TIDAK mempengaruhi password', async () => {
        render(Register);
        const passwordInput = screen.getByLabelText(/^Password$/i) as HTMLInputElement;
        const confirmationInput = screen.getByLabelText(/Konfirmasi Password/i) as HTMLInputElement;
        const toggles = screen.getAllByLabelText(/Tampilkan password/i);

        await fireEvent.click(toggles[1]);

        expect(passwordInput.type).toBe('password');
        expect(confirmationInput.type).toBe('text');
    });
});

// ============================================================
// KATEGORI 3 — BEHAVIORAL: Indikator Kekuatan Password
// ============================================================

describe('Register.svelte — Indikator Kekuatan Password', () => {
    it('tidak menampilkan indikator saat password kosong', () => {
        render(Register);
        expect(screen.queryByText(/Lemah|Cukup|Kuat|Sangat Kuat/i)).not.toBeInTheDocument();
    });

    it('menampilkan "Lemah" untuk password pendek (< 6 char)', async () => {
        render(Register);
        const input = screen.getByLabelText(/^Password$/i) as HTMLInputElement;

        await fireEvent.input(input, { target: { value: 'abc' } });

        expect(screen.getByText(/Lemah/i)).toBeInTheDocument();
    });

    it('menampilkan "Sangat Kuat" untuk password lengkap', async () => {
        render(Register);
        const input = screen.getByLabelText(/^Password$/i) as HTMLInputElement;

        await fireEvent.input(input, { target: { value: 'Abcdefgh123!' } });

        expect(screen.getByText(/Sangat Kuat/i)).toBeInTheDocument();
    });

    it('indikator berubah saat password diubah', async () => {
        render(Register);
        const input = screen.getByLabelText(/^Password$/i) as HTMLInputElement;

        // Awal: Lemah
        await fireEvent.input(input, { target: { value: 'abc' } });
        expect(screen.getByText(/Lemah/i)).toBeInTheDocument();

        // Ubah ke kuat
        await fireEvent.input(input, { target: { value: 'Abcdefgh123!' } });
        expect(screen.getByText(/Sangat Kuat/i)).toBeInTheDocument();
        expect(screen.queryByText(/Lemah/i)).not.toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 4 — EQUIVALENCE: Validasi Konfirmasi Password
// ============================================================

describe('Register.svelte — Validasi Konfirmasi Password', () => {
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

    it('tombol submit enabled saat password cocok', async () => {
        render(Register);
        const passwordInput = screen.getByLabelText(/^Password$/i) as HTMLInputElement;
        const confirmationInput = screen.getByLabelText(/Konfirmasi Password/i) as HTMLInputElement;

        await fireEvent.input(passwordInput, { target: { value: 'password123' } });
        await fireEvent.input(confirmationInput, { target: { value: 'password123' } });

        const submitButton = screen.getByRole('button', { name: /Buat Akun/i });
        expect(submitButton).not.toBeDisabled();
    });
});

// ============================================================
// KATEGORI 5 — BEHAVIORAL / MOCKING: Form Submit
// ============================================================

describe('Register.svelte — Form Submit', () => {
    it('submit form memanggil router.post dengan payload benar', async () => {
        render(Register);

        // Isi semua field
        await fireEvent.input(screen.getByLabelText(/Nama Lengkap/i), {
            target: { value: 'Budi Santoso' },
        });
        await fireEvent.input(screen.getByLabelText(/^Username$/i), {
            target: { value: 'budisantoso' },
        });
        await fireEvent.input(screen.getByLabelText(/^Email$/i), {
            target: { value: 'budi@example.com' },
        });
        await fireEvent.input(screen.getByLabelText(/^Password$/i), {
            target: { value: 'password123' },
        });
        await fireEvent.input(screen.getByLabelText(/Konfirmasi Password/i), {
            target: { value: 'password123' },
        });

        const form = screen.getByRole('button', { name: /Buat Akun/i }).closest('form')!;
        await fireEvent.submit(form);

        expect(mockPost).toHaveBeenCalledTimes(1);
        expect(mockPost).toHaveBeenCalledWith(
            '/register',
            {
                name: 'Budi Santoso',
                username: 'budisantoso',
                email: 'budi@example.com',
                password: 'password123',
                password_confirmation: 'password123',
            },
            expect.objectContaining({
                onError: expect.any(Function),
                onFinish: expect.any(Function),
            }),
        );
    });

    it('submit dengan field kosong tetap memanggil router.post', async () => {
        render(Register);

        const form = screen.getByRole('button', { name: /Buat Akun/i }).closest('form')!;
        await fireEvent.submit(form);

        expect(mockPost).toHaveBeenCalledWith(
            '/register',
            {
                name: '',
                username: '',
                email: '',
                password: '',
                password_confirmation: '',
            },
            expect.any(Object),
        );
    });
});

// ============================================================
// KATEGORI 6 — NEGATIVE PATH: Error Handling dari Backend
// ============================================================

describe('Register.svelte — Error Handling', () => {
    it('menampilkan error per field setelah onError dipanggil', async () => {
        render(Register);

        const form = screen.getByRole('button', { name: /Buat Akun/i }).closest('form')!;
        await fireEvent.submit(form);

        // Simulasi server error
        const [, , options] = mockPost.mock.calls[0];
        options.onError({
            name: 'Nama wajib diisi.',
            username: 'Username sudah dipakai.',
            email: 'Email sudah terdaftar.',
            password: 'Password minimal 8 karakter.',
        });

        await waitFor(() => {
            expect(screen.getByText('Nama wajib diisi.')).toBeInTheDocument();
            expect(screen.getByText('Username sudah dipakai.')).toBeInTheDocument();
            expect(screen.getByText('Email sudah terdaftar.')).toBeInTheDocument();
            expect(screen.getByText('Password minimal 8 karakter.')).toBeInTheDocument();
        });
    });

    it('errors direset setiap kali submit ulang', async () => {
        render(Register);

        const form = screen.getByRole('button', { name: /Buat Akun/i }).closest('form')!;

        // Submit pertama → error
        await fireEvent.submit(form);
        const [, , options1] = mockPost.mock.calls[0];
        options1.onError({ username: 'Username sudah dipakai.' });

        await waitFor(() => {
            expect(screen.getByText('Username sudah dipakai.')).toBeInTheDocument();
        });

        // Submit kedua → errors di-reset dulu
        await fireEvent.submit(form);

        expect(screen.queryByText('Username sudah dipakai.')).not.toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 7 — BVA: Processing State
// ============================================================

describe('Register.svelte — Processing State', () => {
    it('tombol disabled saat processing', async () => {
        render(Register);

        const form = screen.getByRole('button', { name: /Buat Akun/i }).closest('form')!;
        await fireEvent.submit(form);

        // Setelah submit, processing = true
        const button = screen.getByRole('button', { name: /Memproses/i });
        expect(button).toBeDisabled();
    });

    it('tombol menampilkan spinner "Memproses..." saat processing', async () => {
        render(Register);

        const form = screen.getByRole('button', { name: /Buat Akun/i }).closest('form')!;
        await fireEvent.submit(form);

        await waitFor(() => {
            expect(screen.getByText(/Memproses/i)).toBeInTheDocument();
        });
    });

    it('tombol enabled kembali setelah onFinish', async () => {
        render(Register);

        const form = screen.getByRole('button', { name: /Buat Akun/i }).closest('form')!;
        await fireEvent.submit(form);

        const [, , options] = mockPost.mock.calls[0];
        options.onFinish();

        await waitFor(() => {
            const button = screen.getByRole('button', { name: /Buat Akun/i });
            expect(button).not.toBeDisabled();
        });
    });
});

// ============================================================
// KATEGORI 8 — EDGE CASE: Flash Message
// ============================================================

describe('Register.svelte — Flash Message', () => {
    it('menampilkan flash error jika ada', () => {
        mockPageProps.flash = { error: 'Terlalu banyak percobaan pendaftaran.' };

        render(Register);

        expect(screen.getByText('Terlalu banyak percobaan pendaftaran.')).toBeInTheDocument();
    });

    it('tidak menampilkan flash error jika kosong', () => {
        mockPageProps.flash = {};

        render(Register);

        const errorFlash = document.querySelector('.bg-red-50');
        expect(errorFlash).not.toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 9 — BVA: Countdown Rate Limiter
// ============================================================

describe('Register.svelte — Countdown (Rate Limiter)', () => {
    it('tombol menampilkan "Tunggu N detik" jika retry_after > 0', async () => {
        mockPageProps.flash = { retry_after: 30 };

        render(Register);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Tunggu 30 detik/i })).toBeInTheDocument();
        });
    });

    it('tombol disabled saat countdown aktif', async () => {
        mockPageProps.flash = { retry_after: 30 };

        render(Register);

        await waitFor(() => {
            const button = screen.getByRole('button', { name: /Tunggu/i });
            expect(button).toBeDisabled();
        });
    });

    it('countdown berkurang setiap detik', async () => {
        mockPageProps.flash = { retry_after: 3 };

        render(Register);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Tunggu 3 detik/i })).toBeInTheDocument();
        });

        vi.advanceTimersByTime(1000);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Tunggu 2 detik/i })).toBeInTheDocument();
        });
    });

    it('tidak menampilkan countdown jika retry_after = 0', () => {
        mockPageProps.flash = { retry_after: 0 };

        render(Register);

        expect(screen.queryByText(/Tunggu/i)).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Buat Akun/i })).toBeInTheDocument();
    });

    it('tidak menampilkan countdown jika retry_after = null', () => {
        mockPageProps.flash = { retry_after: null };

        render(Register);

        expect(screen.queryByText(/Tunggu/i)).not.toBeInTheDocument();
    });

    it('tombol enabled kembali setelah countdown selesai', async () => {
        mockPageProps.flash = { retry_after: 2 };

        render(Register);

        vi.advanceTimersByTime(2100);

        await waitFor(() => {
            const button = screen.getByRole('button', { name: /Buat Akun/i });
            expect(button).not.toBeDisabled();
        });
    });
});