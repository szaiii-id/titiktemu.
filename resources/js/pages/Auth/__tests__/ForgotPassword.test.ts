import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import ForgotPassword from '../ForgotPassword.svelte';

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

describe('ForgotPassword.svelte — UI Contract', () => {
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

    it('menampilkan tombol kembali ke login dengan href benar', () => {
        // ✅ FIX A11Y: `aria-label="Kembali ke halaman login"` dihapus dari
        // source (WCAG 2.5.3 fix). Accessible name sekarang = teks visible
        // "Kembali ke Login" (huruf L besar, tanpa "halaman").
        //
        // Assertion lama `/Kembali ke halaman login/i` GAGAL karena
        // accessible name berubah.
        //
        // Assertion baru: cek accessible name yang benar (dari teks visible).
        render(ForgotPassword);
        const link = screen.getByRole('link', { name: /Kembali ke Login/i });
        expect(link).toHaveAttribute('href', '/login');
    });

    it('menampilkan info masa berlaku tautan (60 menit)', () => {
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

    it('input email bertipe email', () => {
        render(ForgotPassword);
        const input = screen.getByLabelText(/Alamat Email/i) as HTMLInputElement;
        expect(input.type).toBe('email');
    });

    it('input email wajib diisi (required)', () => {
        render(ForgotPassword);
        const input = screen.getByLabelText(/Alamat Email/i) as HTMLInputElement;
        expect(input.required).toBe(true);
    });
});

// ============================================================
// KATEGORI 2 — EQUIVALENCE: Interaksi Form
// ============================================================

describe('ForgotPassword.svelte — Interaksi Form', () => {
    it('mengizinkan user mengetik email', async () => {
        render(ForgotPassword);
        const input = screen.getByLabelText(/Alamat Email/i) as HTMLInputElement;

        await fireEvent.input(input, {
            target: { value: 'budi@example.com' },
        });

        expect(input.value).toBe('budi@example.com');
    });

    it('mengizinkan user mengganti email', async () => {
        render(ForgotPassword);
        const input = screen.getByLabelText(/Alamat Email/i) as HTMLInputElement;

        await fireEvent.input(input, { target: { value: 'first@example.com' } });
        expect(input.value).toBe('first@example.com');

        await fireEvent.input(input, { target: { value: 'second@example.com' } });
        expect(input.value).toBe('second@example.com');
    });

    it('mengizinkan user menghapus email', async () => {
        render(ForgotPassword);
        const input = screen.getByLabelText(/Alamat Email/i) as HTMLInputElement;

        await fireEvent.input(input, { target: { value: 'budi@example.com' } });
        await fireEvent.input(input, { target: { value: '' } });

        expect(input.value).toBe('');
    });

    it('menampilkan error jika email kosong setelah submit', async () => {
        render(ForgotPassword);

        const form = screen.getByRole('button', { name: /Kirim Tautan Pemulihan/i }).closest('form')!;
        await fireEvent.submit(form);

        // Ambil onError, panggil dengan error
        const [, , options] = mockPost.mock.calls[0];
        options.onError({ email: 'Email wajib diisi.' });

        await waitFor(() => {
            expect(screen.getByText('Email wajib diisi.')).toBeInTheDocument();
        });
    });
});

// ============================================================
// KATEGORI 3 — BEHAVIORAL: Form Submit
// ============================================================

describe('ForgotPassword.svelte — Form Submit', () => {
    it('submit form memanggil router.post dengan payload email', async () => {
        render(ForgotPassword);

        const input = screen.getByLabelText(/Alamat Email/i) as HTMLInputElement;
        await fireEvent.input(input, { target: { value: 'budi@example.com' } });

        const form = screen.getByRole('button', { name: /Kirim Tautan Pemulihan/i }).closest('form')!;
        await fireEvent.submit(form);

        expect(mockPost).toHaveBeenCalledTimes(1);
        expect(mockPost).toHaveBeenCalledWith(
            '/forgot-password',
            { email: 'budi@example.com' },
            expect.objectContaining({
                onError: expect.any(Function),
                onSuccess: expect.any(Function),
                onFinish: expect.any(Function),
            }),
        );
    });

    it('submit dengan email kosong tetap memanggil router.post', async () => {
        render(ForgotPassword);

        const form = screen.getByRole('button', { name: /Kirim Tautan Pemulihan/i }).closest('form')!;
        await fireEvent.submit(form);

        expect(mockPost).toHaveBeenCalledWith(
            '/forgot-password',
            { email: '' },
            expect.any(Object),
        );
    });
});

// ============================================================
// KATEGORI 4 — NEGATIVE PATH: Error Handling
// ============================================================

describe('ForgotPassword.svelte — Error Handling', () => {
    it('menampilkan error email setelah onError', async () => {
        render(ForgotPassword);

        const input = screen.getByLabelText(/Alamat Email/i) as HTMLInputElement;
        await fireEvent.input(input, { target: { value: 'tidak-ada@example.com' } });

        const form = screen.getByRole('button', { name: /Kirim Tautan Pemulihan/i }).closest('form')!;
        await fireEvent.submit(form);

        const [, , options] = mockPost.mock.calls[0];
        options.onError({ email: 'Email tidak terdaftar.' });

        await waitFor(() => {
            expect(screen.getByText('Email tidak terdaftar.')).toBeInTheDocument();
        });
    });

    it('errors direset setiap kali submit ulang', async () => {
        render(ForgotPassword);

        const form = screen.getByRole('button', { name: /Kirim Tautan Pemulihan/i }).closest('form')!;

        // Submit pertama → error
        await fireEvent.submit(form);
        const [, , options1] = mockPost.mock.calls[0];
        options1.onError({ email: 'Error pertama' });

        await waitFor(() => {
            expect(screen.getByText('Error pertama')).toBeInTheDocument();
        });

        // Submit kedua → errors di-reset
        await fireEvent.submit(form);

        expect(screen.queryByText('Error pertama')).not.toBeInTheDocument();
    });

    it('onSuccess menghapus nilai email dari input', async () => {
        render(ForgotPassword);

        const input = screen.getByLabelText(/Alamat Email/i) as HTMLInputElement;
        await fireEvent.input(input, { target: { value: 'budi@example.com' } });

        const form = screen.getByRole('button', { name: /Kirim Tautan Pemulihan/i }).closest('form')!;
        await fireEvent.submit(form);

        const [, , options] = mockPost.mock.calls[0];
        options.onSuccess();

        await waitFor(() => {
            expect(input.value).toBe('');
        });
    });
});

// ============================================================
// KATEGORI 5 — BVA: Processing State
// ============================================================

describe('ForgotPassword.svelte — Processing State', () => {
    it('tombol disabled saat processing', async () => {
        render(ForgotPassword);

        const form = screen.getByRole('button', { name: /Kirim Tautan Pemulihan/i }).closest('form')!;
        await fireEvent.submit(form);

        // Setelah submit, processing = true
        const button = screen.getByRole('button', { name: /Mengirim Tautan/i });
        expect(button).toBeDisabled();
    });

    it('tombol menampilkan "Mengirim Tautan..." saat processing', async () => {
        render(ForgotPassword);

        const form = screen.getByRole('button', { name: /Kirim Tautan Pemulihan/i }).closest('form')!;
        await fireEvent.submit(form);

        await waitFor(() => {
            expect(screen.getByText(/Mengirim Tautan/i)).toBeInTheDocument();
        });
    });

    it('tombol enabled kembali setelah onFinish', async () => {
        render(ForgotPassword);

        const form = screen.getByRole('button', { name: /Kirim Tautan Pemulihan/i }).closest('form')!;
        await fireEvent.submit(form);

        const [, , options] = mockPost.mock.calls[0];
        options.onFinish();

        await waitFor(() => {
            const button = screen.getByRole('button', { name: /Kirim Tautan Pemulihan/i });
            expect(button).not.toBeDisabled();
        });
    });

    it('tombol tidak disabled dalam kondisi default', () => {
        render(ForgotPassword);
        const button = screen.getByRole('button', {
            name: /Kirim Tautan Pemulihan/i,
        });
        expect(button).not.toBeDisabled();
    });
});

// ============================================================
// KATEGORI 6 — EDGE CASE: Flash Message
// ============================================================

describe('ForgotPassword.svelte — Flash Message', () => {
    it('menampilkan flash status jika ada', () => {
        mockPageProps.flash = {
            status: 'Kami telah mengirim tautan pemulihan ke email Anda.',
        };

        render(ForgotPassword);

        expect(
            screen.getByText('Kami telah mengirim tautan pemulihan ke email Anda.')
        ).toBeInTheDocument();
    });

    it('tidak menampilkan flash status jika kosong', () => {
        mockPageProps.flash = {};

        render(ForgotPassword);

        const successFlash = document.querySelector('.bg-green-50');
        expect(successFlash).not.toBeInTheDocument();
    });

    it('menampilkan flash error jika ada', () => {
        mockPageProps.flash = { error: 'Terlalu banyak permintaan. Coba lagi nanti.' };

        render(ForgotPassword);

        expect(
            screen.getByText('Terlalu banyak permintaan. Coba lagi nanti.')
        ).toBeInTheDocument();
    });

    it('tidak menampilkan flash error jika kosong', () => {
        mockPageProps.flash = {};

        render(ForgotPassword);

        const errorFlash = document.querySelector('.bg-red-50');
        expect(errorFlash).not.toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 7 — BVA: Countdown Rate Limiter
// ============================================================

describe('ForgotPassword.svelte — Countdown (Rate Limiter)', () => {
    it('tombol menampilkan "Tunggu N detik" jika retry_after > 0', async () => {
        mockPageProps.flash = { retry_after: 60 };

        render(ForgotPassword);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Tunggu 60 detik/i })).toBeInTheDocument();
        });
    });

    it('tombol disabled saat countdown aktif', async () => {
        mockPageProps.flash = { retry_after: 30 };

        render(ForgotPassword);

        await waitFor(() => {
            const button = screen.getByRole('button', { name: /Tunggu/i });
            expect(button).toBeDisabled();
        });
    });

    it('countdown berkurang setiap detik', async () => {
        mockPageProps.flash = { retry_after: 5 };

        render(ForgotPassword);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Tunggu 5 detik/i })).toBeInTheDocument();
        });

        vi.advanceTimersByTime(1000);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Tunggu 4 detik/i })).toBeInTheDocument();
        });
    });

    it('countdown berkurang sampai habis', async () => {
        mockPageProps.flash = { retry_after: 3 };

        render(ForgotPassword);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Tunggu 3 detik/i })).toBeInTheDocument();
        });

        vi.advanceTimersByTime(1000);
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Tunggu 2 detik/i })).toBeInTheDocument();
        });

        vi.advanceTimersByTime(1000);
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Tunggu 1 detik/i })).toBeInTheDocument();
        });
    });

    it('tidak menampilkan countdown jika retry_after = 0', () => {
        mockPageProps.flash = { retry_after: 0 };

        render(ForgotPassword);

        expect(screen.queryByText(/Tunggu/i)).not.toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /Kirim Tautan Pemulihan/i })
        ).toBeInTheDocument();
    });

    it('tidak menampilkan countdown jika retry_after = null', () => {
        mockPageProps.flash = { retry_after: null };

        render(ForgotPassword);

        expect(screen.queryByText(/Tunggu/i)).not.toBeInTheDocument();
    });

    it('tombol enabled kembali setelah countdown selesai', async () => {
        mockPageProps.flash = { retry_after: 2 };

        render(ForgotPassword);

        vi.advanceTimersByTime(2100);

        await waitFor(() => {
            const button = screen.getByRole('button', { name: /Kirim Tautan Pemulihan/i });
            expect(button).not.toBeDisabled();
        });
    });
});