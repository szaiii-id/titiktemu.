import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import ResetPassword from '../ResetPassword.svelte';

// ============================================================
// MOCK INERTIA
// ============================================================

const mockPost = vi.fn();

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
// PROPS DEFAULT
// ============================================================

const defaultProps = {
    token: 'token-abc-123',
    email: 'budi@example.com',
    errors: {},
};

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
// KATEGORI 1 — UI CONTRACT
// ============================================================

describe('ResetPassword.svelte — UI Contract', () => {
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
        expect(screen.getByLabelText(/Konfirmasi Password/i)).toBeInTheDocument();
    });

    it('menampilkan tombol "Simpan Password Baru"', () => {
        render(ResetPassword, { props: defaultProps });
        expect(
            screen.getByRole('button', { name: /Simpan Password Baru/i })
        ).toBeInTheDocument();
    });

    it('input email bertipe email dan readonly', () => {
        render(ResetPassword, { props: defaultProps });
        const input = screen.getByLabelText(/^Email$/i) as HTMLInputElement;
        expect(input.type).toBe('email');
        expect(input.readOnly).toBe(true);
    });

    it('password baru bertipe password secara default', () => {
        render(ResetPassword, { props: defaultProps });
        const input = screen.getByLabelText(/Password Baru/i) as HTMLInputElement;
        expect(input.type).toBe('password');
    });

    it('konfirmasi password bertipe password secara default', () => {
        render(ResetPassword, { props: defaultProps });
        const input = screen.getByLabelText(/Konfirmasi Password/i) as HTMLInputElement;
        expect(input.type).toBe('password');
    });
});

// ============================================================
// KATEGORI 2 — EQUIVALENCE: Atribut Input
// ============================================================

describe('ResetPassword.svelte — Atribut Input', () => {
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
        const input = screen.getByLabelText(/Konfirmasi Password/i) as HTMLInputElement;
        expect(input).toHaveAttribute('autocomplete', 'new-password');
    });

    it('password baru wajib diisi (required)', () => {
        render(ResetPassword, { props: defaultProps });
        const input = screen.getByLabelText(/Password Baru/i) as HTMLInputElement;
        expect(input.required).toBe(true);
    });

    it('konfirmasi password wajib diisi (required)', () => {
        render(ResetPassword, { props: defaultProps });
        const input = screen.getByLabelText(/Konfirmasi Password/i) as HTMLInputElement;
        expect(input.required).toBe(true);
    });
});

// ============================================================
// KATEGORI 3 — EQUIVALENCE: Toggle Password (2 independen)
// ============================================================

describe('ResetPassword.svelte — Toggle Password', () => {
    it('password baru tersembunyi secara default', () => {
        render(ResetPassword, { props: defaultProps });
        const input = screen.getByLabelText(/Password Baru/i) as HTMLInputElement;
        expect(input.type).toBe('password');
    });

    it('konfirmasi password tersembunyi secara default', () => {
        render(ResetPassword, { props: defaultProps });
        const input = screen.getByLabelText(/Konfirmasi Password/i) as HTMLInputElement;
        expect(input.type).toBe('password');
    });

    it('password baru terlihat setelah klik toggle-nya', async () => {
        render(ResetPassword, { props: defaultProps });
        const input = screen.getByLabelText(/Password Baru/i) as HTMLInputElement;
        const toggles = screen.getAllByLabelText(/Tampilkan password/i);

        await fireEvent.click(toggles[0]);

        expect(input.type).toBe('text');
    });

    it('konfirmasi password terlihat setelah klik toggle-nya', async () => {
        render(ResetPassword, { props: defaultProps });
        const input = screen.getByLabelText(/Konfirmasi Password/i) as HTMLInputElement;
        const toggles = screen.getAllByLabelText(/Tampilkan password/i);

        await fireEvent.click(toggles[1]);

        expect(input.type).toBe('text');
    });

    it('toggle password baru tidak mempengaruhi konfirmasi', async () => {
        render(ResetPassword, { props: defaultProps });
        const passwordInput = screen.getByLabelText(/Password Baru/i) as HTMLInputElement;
        const confirmationInput = screen.getByLabelText(/Konfirmasi Password/i) as HTMLInputElement;
        const toggles = screen.getAllByLabelText(/Tampilkan password/i);

        await fireEvent.click(toggles[0]);

        expect(passwordInput.type).toBe('text');
        expect(confirmationInput.type).toBe('password');
    });

    it('toggle konfirmasi tidak mempengaruhi password baru', async () => {
        render(ResetPassword, { props: defaultProps });
        const passwordInput = screen.getByLabelText(/Password Baru/i) as HTMLInputElement;
        const confirmationInput = screen.getByLabelText(/Konfirmasi Password/i) as HTMLInputElement;
        const toggles = screen.getAllByLabelText(/Tampilkan password/i);

        await fireEvent.click(toggles[1]);

        expect(passwordInput.type).toBe('password');
        expect(confirmationInput.type).toBe('text');
    });
});

// ============================================================
// KATEGORI 4 — EQUIVALENCE: Validasi Konfirmasi Password
// ============================================================

describe('ResetPassword.svelte — Validasi Konfirmasi', () => {
    it('menampilkan peringatan jika konfirmasi tidak cocok', async () => {
        render(ResetPassword, { props: defaultProps });
        const passwordInput = screen.getByLabelText(/Password Baru/i) as HTMLInputElement;
        const confirmationInput = screen.getByLabelText(/Konfirmasi Password/i) as HTMLInputElement;

        await fireEvent.input(passwordInput, { target: { value: 'password123' } });
        await fireEvent.input(confirmationInput, { target: { value: 'password456' } });

        expect(screen.getByText(/Konfirmasi password tidak cocok/i)).toBeInTheDocument();
    });

    it('tidak menampilkan peringatan jika konfirmasi cocok', async () => {
        render(ResetPassword, { props: defaultProps });
        const passwordInput = screen.getByLabelText(/Password Baru/i) as HTMLInputElement;
        const confirmationInput = screen.getByLabelText(/Konfirmasi Password/i) as HTMLInputElement;

        await fireEvent.input(passwordInput, { target: { value: 'password123' } });
        await fireEvent.input(confirmationInput, { target: { value: 'password123' } });

        expect(screen.queryByText(/Konfirmasi password tidak cocok/i)).not.toBeInTheDocument();
    });

    it('tidak menampilkan peringatan jika konfirmasi masih kosong', async () => {
        render(ResetPassword, { props: defaultProps });
        const passwordInput = screen.getByLabelText(/Password Baru/i) as HTMLInputElement;

        await fireEvent.input(passwordInput, { target: { value: 'password123' } });

        expect(screen.queryByText(/Konfirmasi password tidak cocok/i)).not.toBeInTheDocument();
    });

    it('tombol submit disabled saat password tidak cocok', async () => {
        render(ResetPassword, { props: defaultProps });
        const passwordInput = screen.getByLabelText(/Password Baru/i) as HTMLInputElement;
        const confirmationInput = screen.getByLabelText(/Konfirmasi Password/i) as HTMLInputElement;

        await fireEvent.input(passwordInput, { target: { value: 'password123' } });
        await fireEvent.input(confirmationInput, { target: { value: 'password456' } });

        const submitButton = screen.getByRole('button', {
            name: /Simpan Password Baru/i,
        });
        expect(submitButton).toBeDisabled();
    });

    it('tombol submit enabled saat password cocok', async () => {
        render(ResetPassword, { props: defaultProps });
        const passwordInput = screen.getByLabelText(/Password Baru/i) as HTMLInputElement;
        const confirmationInput = screen.getByLabelText(/Konfirmasi Password/i) as HTMLInputElement;

        await fireEvent.input(passwordInput, { target: { value: 'password123' } });
        await fireEvent.input(confirmationInput, { target: { value: 'password123' } });

        const submitButton = screen.getByRole('button', {
            name: /Simpan Password Baru/i,
        });
        expect(submitButton).not.toBeDisabled();
    });
});

// ============================================================
// KATEGORI 5 — BEHAVIORAL: Form Submit
// ============================================================

describe('ResetPassword.svelte — Form Submit', () => {
    it('submit form memanggil router.post dengan payload lengkap', async () => {
        render(ResetPassword, { props: defaultProps });

        const passwordInput = screen.getByLabelText(/Password Baru/i) as HTMLInputElement;
        const confirmationInput = screen.getByLabelText(/Konfirmasi Password/i) as HTMLInputElement;

        await fireEvent.input(passwordInput, { target: { value: 'password123' } });
        await fireEvent.input(confirmationInput, { target: { value: 'password123' } });

        const form = screen.getByRole('button', { name: /Simpan Password Baru/i }).closest('form')!;
        await fireEvent.submit(form);

        expect(mockPost).toHaveBeenCalledTimes(1);
        expect(mockPost).toHaveBeenCalledWith(
            '/reset-password',
            {
                token: 'token-abc-123',
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

    it('submit mengirim token dari props (bukan dari state)', async () => {
        render(ResetPassword, {
            props: { ...defaultProps, token: 'token-xyz-789' },
        });

        const form = screen.getByRole('button', { name: /Simpan Password Baru/i }).closest('form')!;
        await fireEvent.submit(form);

        expect(mockPost).toHaveBeenCalledWith(
            '/reset-password',
            expect.objectContaining({ token: 'token-xyz-789' }),
            expect.any(Object),
        );
    });

    it('submit mengirim email dari props', async () => {
        render(ResetPassword, {
            props: { ...defaultProps, email: 'other@example.com' },
        });

        const form = screen.getByRole('button', { name: /Simpan Password Baru/i }).closest('form')!;
        await fireEvent.submit(form);

        expect(mockPost).toHaveBeenCalledWith(
            '/reset-password',
            expect.objectContaining({ email: 'other@example.com' }),
            expect.any(Object),
        );
    });
});

// ============================================================
// KATEGORI 6 — NEGATIVE PATH: Error Handling
// ============================================================

describe('ResetPassword.svelte — Error Handling', () => {
    it('menampilkan error email dari props', () => {
        render(ResetPassword, {
            props: {
                ...defaultProps,
                errors: { email: 'Token reset password tidak valid.' },
            },
        });

        expect(screen.getByText(/Token reset password tidak valid/i)).toBeInTheDocument();
    });

    it('menampilkan error password dari props', () => {
        render(ResetPassword, {
            props: {
                ...defaultProps,
                errors: { password: 'Password minimal harus 8 karakter.' },
            },
        });

        expect(screen.getByText(/Password minimal harus 8 karakter/i)).toBeInTheDocument();
    });

    it('menampilkan error password_confirmation dari props', () => {
        render(ResetPassword, {
            props: {
                ...defaultProps,
                errors: { password_confirmation: 'Konfirmasi password tidak cocok.' },
            },
        });

        expect(screen.getByText(/Konfirmasi password tidak cocok/i)).toBeInTheDocument();
    });

    it('errors direset setiap kali submit ulang', async () => {
        render(ResetPassword, {
            props: {
                ...defaultProps,
                errors: { password: 'Error lama dari props' },
            },
        });

        // Error awal dari props
        expect(screen.getByText('Error lama dari props')).toBeInTheDocument();

        const form = screen.getByRole('button', { name: /Simpan Password Baru/i }).closest('form')!;
        await fireEvent.submit(form);

        // Setelah submit, errors di-reset dulu (sebelum onError dipanggil)
        expect(screen.queryByText('Error lama dari props')).not.toBeInTheDocument();
    });

    it('menampilkan error baru setelah onError dipanggil', async () => {
        render(ResetPassword, { props: defaultProps });

        const form = screen.getByRole('button', { name: /Simpan Password Baru/i }).closest('form')!;
        await fireEvent.submit(form);

        const [, , options] = mockPost.mock.calls[0];
        options.onError({ password: 'Token sudah kedaluwarsa.' });

        await waitFor(() => {
            expect(screen.getByText('Token sudah kedaluwarsa.')).toBeInTheDocument();
        });
    });
});

// ============================================================
// KATEGORI 7 — BVA: Processing State
// ============================================================

describe('ResetPassword.svelte — Processing State', () => {
    it('tombol disabled saat processing', async () => {
        render(ResetPassword, { props: defaultProps });

        const form = screen.getByRole('button', { name: /Simpan Password Baru/i }).closest('form')!;
        await fireEvent.submit(form);

        const button = screen.getByRole('button', { name: /Menyimpan/i });
        expect(button).toBeDisabled();
    });

    it('tombol menampilkan "Menyimpan..." saat processing', async () => {
        render(ResetPassword, { props: defaultProps });

        const form = screen.getByRole('button', { name: /Simpan Password Baru/i }).closest('form')!;
        await fireEvent.submit(form);

        await waitFor(() => {
            expect(screen.getByText(/Menyimpan/i)).toBeInTheDocument();
        });
    });

    it('tombol enabled kembali setelah onFinish', async () => {
        render(ResetPassword, { props: defaultProps });

        const form = screen.getByRole('button', { name: /Simpan Password Baru/i }).closest('form')!;
        await fireEvent.submit(form);

        const [, , options] = mockPost.mock.calls[0];
        options.onFinish();

        await waitFor(() => {
            const button = screen.getByRole('button', { name: /Simpan Password Baru/i });
            expect(button).not.toBeDisabled();
        });
    });
});

// ============================================================
// KATEGORI 8 — EDGE CASE: Flash Message & Countdown
// ============================================================

describe('ResetPassword.svelte — Flash Message', () => {
    it('menampilkan flash error jika ada', () => {
        mockPageProps.flash = { error: 'Token tidak valid atau sudah kedaluwarsa.' };

        render(ResetPassword, { props: defaultProps });

        expect(
            screen.getByText('Token tidak valid atau sudah kedaluwarsa.')
        ).toBeInTheDocument();
    });

    it('tidak menampilkan flash error jika kosong', () => {
        mockPageProps.flash = {};

        render(ResetPassword, { props: defaultProps });

        const errorFlash = document.querySelector('.bg-red-50');
        expect(errorFlash).not.toBeInTheDocument();
    });
});

describe('ResetPassword.svelte — Countdown (Rate Limiter)', () => {
    it('tombol menampilkan "Tunggu N detik" jika retry_after > 0', async () => {
        mockPageProps.flash = { retry_after: 30 };

        render(ResetPassword, { props: defaultProps });

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Tunggu 30 detik/i })).toBeInTheDocument();
        });
    });

    it('tombol disabled saat countdown aktif', async () => {
        mockPageProps.flash = { retry_after: 30 };

        render(ResetPassword, { props: defaultProps });

        await waitFor(() => {
            const button = screen.getByRole('button', { name: /Tunggu/i });
            expect(button).toBeDisabled();
        });
    });

    it('countdown berkurang setiap detik', async () => {
        mockPageProps.flash = { retry_after: 3 };

        render(ResetPassword, { props: defaultProps });

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

        render(ResetPassword, { props: defaultProps });

        expect(screen.queryByText(/Tunggu/i)).not.toBeInTheDocument();
    });

    it('tidak menampilkan countdown jika retry_after = null', () => {
        mockPageProps.flash = { retry_after: null };

        render(ResetPassword, { props: defaultProps });

        expect(screen.queryByText(/Tunggu/i)).not.toBeInTheDocument();
    });

    it('tombol enabled kembali setelah countdown selesai', async () => {
        mockPageProps.flash = { retry_after: 2 };

        render(ResetPassword, { props: defaultProps });

        vi.advanceTimersByTime(2100);

        await waitFor(() => {
            const button = screen.getByRole('button', { name: /Simpan Password Baru/i });
            expect(button).not.toBeDisabled();
        });
    });
});